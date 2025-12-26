import pandas as pd
import numpy as np
from sklearn.cluster import KMeans, MiniBatchKMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
from sklearn.ensemble import IsolationForest
from typing import Dict, List, Optional
from .schema_utils import pick_first_role_column
from .analyst_core import ModelSelector, ModelGovernanceError
from .explainability import EvidenceObject

def load_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    return df

def fallback_segmentation(df: pd.DataFrame) -> list:
    """
    Provides a basic segmentation when clustering fails.
    Splits the dataset into two arbitrary groups if possible.
    """
    if df.shape[0] < 5:
        return [0] * len(df)

    if df.select_dtypes(include="number").shape[1] == 0:
        return [0] * len(df)

    size = df.shape[0]
    midpoint = size // 2

    # Simple split: first half 0, second half 1
    labels = [0] * midpoint + [1] * (size - midpoint)
    return labels


def generate_profile(df: pd.DataFrame) -> dict:
    profile = {}
    numeric = df.select_dtypes(include="number")
    for col in numeric.columns:
        desc = numeric[col].describe().to_dict()
        desc["missing"] = int(df[col].isna().sum())
        desc["skew"] = float(numeric[col].skew())
        profile[col] = desc
    return profile



def apply_normalization(df: pd.DataFrame, plan: dict) -> pd.DataFrame:
    """
    Apply normalization based on the schema map plan.
    plan: { "col_name": "zscore" | "minmax" | "log" | "none" }
    """
    df_norm = df.copy()
    from sklearn.preprocessing import StandardScaler, MinMaxScaler
    
    for col, method in plan.items():
        if col not in df.columns:
            continue
            
        if method == "zscore":
            scaler = StandardScaler()
            df_norm[[col]] = scaler.fit_transform(df[[col]])
        elif method == "minmax":
            scaler = MinMaxScaler()
            df_norm[[col]] = scaler.fit_transform(df[[col]])
        elif method == "log":
            # Handle non-positive values safely
            min_val = df[col].min()
            shift = 0
            if min_val <= 0:
                shift = abs(min_val) + 1
            df_norm[col] = np.log1p(df[col] + shift)
        # "none" does nothing
        
    return df_norm

def add_risk_features(df: pd.DataFrame, schema_map: Dict) -> pd.DataFrame:
    """
    Add risk related features in a schema driven way.
    Uses whatever roles exist. If a role is missing it skips that piece.
    Never raises KeyError because of missing business columns.
    """
    df_out = df.copy()

    income_col = pick_first_role_column(df_out, schema_map, "income_like")
    spend_col = pick_first_role_column(df_out, schema_map, "spend_like")
    limit_col = pick_first_role_column(df_out, schema_map, "credit_limit_like")
    debt_col = pick_first_role_column(df_out, schema_map, "debt_like")
    volatility_col = pick_first_role_column(df_out, schema_map, "volatility_like")

    if income_col and spend_col:
        # Safe division
        valid = df_out[income_col].replace(0, pd.NA).notna()
        df_out.loc[valid, "savings_rate"] = (
            df_out.loc[valid, income_col] - df_out.loc[valid, spend_col]
        ) / df_out.loc[valid, income_col]

    if spend_col and limit_col:
        valid = df_out[limit_col].replace(0, pd.NA).notna()
        df_out.loc[valid, "utilization"] = (
            df_out.loc[valid, spend_col] / df_out.loc[valid, limit_col]
        )

    if debt_col:
        # If income is missing, use max debt as proxy for denominator to avoid crash
        denom = df_out[income_col] if income_col else df_out[debt_col].abs().max()
        # Avoid division by zero if income is 0
        if isinstance(denom, pd.Series):
             denom = denom.replace(0, 1) # simplistic safety
        elif denom == 0:
             denom = 1
             
        df_out["debt_ratio"] = df_out[debt_col] / denom

    if volatility_col:
        df_out["volatility_risk"] = df_out[volatility_col]

    risk_parts = []
    for col in ["savings_rate", "utilization", "debt_ratio", "volatility_risk"]:
        if col in df_out.columns:
            risk_parts.append(df_out[col])

    if risk_parts:
        risk_df = pd.concat(risk_parts, axis=1)
        # Standardize
        risk_df = (risk_df - risk_df.mean()) / (risk_df.std(ddof=0) + 1e-9)
        df_out["risk_score"] = risk_df.mean(axis=1)
    else:
        df_out["risk_score"] = 0.0

    return df_out

def run_universal_clustering(df: pd.DataFrame, schema_map, fast_mode: bool = False):
    """
    Universal clustering using SchemaMap.
    1. Select clustering features.
    2. Normalize based on plan.
    3. Auto-K Clustering.
    4. Generate Schema-Aware Fingerprints.
    """
    # 0. Enrich with Risk Features
    # Convert schema_map to dict for the helper if it's a Pydantic model
    schema_dict = schema_map.model_dump() if hasattr(schema_map, "model_dump") else schema_map
    df = add_risk_features(df, schema_dict)

    row_count = len(df)
    if row_count == 0:
        raise ValueError("Dataset contains no rows after sanitization.")

    selector = ModelSelector()

    # 1. Feature Selection
    features = list(schema_map.feature_plan.clustering_features)
    if not features:
        # Fallback if no clustering features defined
        features = list(schema_map.basic_types.numeric)
    if not features:
        # Final fallback: use numeric columns present in the dataframe
        features = [col for col in df.columns if pd.api.types.is_numeric_dtype(df[col])]

    # Ensure features exist in DF
    valid_features = [f for f in features if f in df.columns]
    if not valid_features:
        raise ValueError("No valid clustering features found in dataset.")

    try:
        selector.ensure_clustering_allowed(row_count, len(valid_features))
    except ModelGovernanceError as exc:
        fallback_labels = fallback_segmentation(df)
        evidence = EvidenceObject(
            columns_used=valid_features or df.columns.tolist(),
            computation_method="GovernanceFallback",
            result_statistic={"reason": str(exc)},
            confidence_level=25.0,
            limitations=["Complex clustering blocked by explainability policy"],
        ).to_payload()
        return {
            "k": 1,
            "silhouette": -1,
            "sizes": [len(df)],
            "labels": fallback_labels,
            "fingerprints": {},
            "warnings": [str(exc)],
            "evidence": evidence,
            "feature_importance": [],
            "confidence_interval": (-1.0, -0.5),
            "artifacts": {},
        }

    # Cap numeric features by variance for fast mode
    if fast_mode and valid_features:
        numeric_subset = df[valid_features].select_dtypes(include="number")
        if not numeric_subset.empty:
            variances = numeric_subset.var().sort_values(ascending=False)
            top_features = list(variances.head(25).index)
            valid_features = [f for f in valid_features if f in top_features]

    df_cluster = df[valid_features].copy()
    
    # Fill NaNs (simple mean imputation for clustering)
    df_cluster = df_cluster.fillna(df_cluster.mean())
    
    # 2. Normalization
    # We only normalize the columns used for clustering
    # But we need to check the plan for each
    norm_plan = {k: v for k, v in schema_map.normalization_plan.items() if k in valid_features}
    df_scaled = apply_normalization(df_cluster, norm_plan)
    
    # Fast-mode sampling for clustering runtime
    if fast_mode:
        cluster_sample = min(len(df_scaled), 100_000)
        df_scaled_sample = df_scaled.sample(n=cluster_sample, random_state=42) if len(df_scaled) > cluster_sample else df_scaled
    else:
        df_scaled_sample = df_scaled
    
    # 3. Auto-K Selection
    best_k = 3
    best_score = -1
    best_labels_full = None
    best_model = None
    
    # If dataset is small, limit K
    max_k = min(8, len(df_scaled_sample))
    if max_k < 3:
        max_k = 3
    
    print(f"   Universal Clustering on {valid_features} (K=3-{max_k})...")
    
    for k in range(3, max_k + 1):
        if len(df_scaled_sample) < k:
            continue  # Not enough samples for this k
        if fast_mode:
            model = MiniBatchKMeans(n_clusters=k, random_state=42, batch_size=2048, n_init="auto")
            model.fit(df_scaled_sample)
            labels_full = model.predict(df_scaled)
            sil_subset = df_scaled_sample.sample(n=min(len(df_scaled_sample), 20_000), random_state=42) if len(df_scaled_sample) > 20_000 else df_scaled_sample
            sil_labels = model.predict(sil_subset)
            score = silhouette_score(sil_subset, sil_labels) if len(set(sil_labels)) > 1 else -1
        else:
            model = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels_full = model.fit_predict(df_scaled)
            if len(set(labels_full)) < 2:
                continue
            score = silhouette_score(df_scaled, labels_full)
        
        if score > best_score:
            best_score = score
            best_k = k
            best_labels_full = labels_full
            best_model = model
            
    if best_labels_full is None:
        # Fallback to single cluster
        best_k = 1
        best_labels_full = np.zeros(len(df))
        best_score = 0.0

    # 4. Schema-Aware Fingerprinting
    df_out = df.copy()
    df_out["cluster"] = best_labels_full
    
    fingerprints = {}
    sizes = []
    
    # Collect all relevant features for fingerprinting
    # We want to know the mean of: clustering, persona, risk, value features
    fp_features = set()
    fp_features.update(schema_map.feature_plan.clustering_features)
    fp_features.update(schema_map.feature_plan.persona_features)
    fp_features.update(schema_map.feature_plan.risk_features)
    fp_features.update(schema_map.feature_plan.value_features)
    
    # Also include semantic roles if they map to single columns
    # (This helps downstream agents find "income" easily)
    
    valid_fp_features = [f for f in fp_features if f in df.columns and pd.api.types.is_numeric_dtype(df[f])]

    for c in range(best_k):
        cluster_data = df_out[df_out["cluster"] == c]
        cluster_size = int(len(cluster_data))
        sizes.append(cluster_size)
        
        # Compute means for all relevant features
        feature_means = {}
        for col in valid_fp_features:
            feature_means[col] = float(cluster_data[col].mean())
            
        # Role Summaries (Aggregated views)
        role_summaries = {}
        # Use model_dump() to iterate over Pydantic model fields
        for role, cols in schema_map.semantic_roles.model_dump().items():
            # Only numeric roles
            if role in ["id_fields", "time_fields", "categorical_descriptors"]:
                continue
            
            role_vals = []
            for col in cols:
                if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                    role_vals.append(cluster_data[col].mean())
            
            if role_vals:
                role_summaries[role] = float(np.mean(role_vals))
            else:
                role_summaries[role] = 0.0

        fingerprints[f"cluster_{c}"] = {
            "cluster_id": c,
            "size": cluster_size,
            "feature_means": feature_means,
            "role_summaries": role_summaries
        }

    if best_model is None:
        raise ValueError("Failed to train explainable clustering model")

    explainable = selector.wrap_kmeans(best_model, valid_features, best_score)
    evidence_payload = explainable.get_evidence().to_payload()
    feature_importance = [entry.as_dict() for entry in explainable.get_feature_importance()]
    confidence_interval = explainable.get_confidence_interval()

    return {
        "k": best_k,
        "silhouette": best_score,
        "sizes": sizes,
        "fingerprints": fingerprints,
        "labels": best_labels_full.tolist(),
        "evidence": evidence_payload,
        "feature_importance": feature_importance,
        "confidence_interval": confidence_interval,
        "artifacts": explainable.serialize_artifacts(),
    }

def detect_universal_anomalies(df: pd.DataFrame, schema_map):
    """
    Universal Anomaly Detection using SchemaMap.
    1. Select anomaly features.
    2. Run Isolation Forest.
    3. Characterize anomalies using semantic roles.
    """
    # 1. Feature Selection
    features = schema_map.feature_plan.anomaly_features
    if not features:
        features = schema_map.basic_types.numeric
        
    valid_features = [f for f in features if f in df.columns]
    if not valid_features:
        return {"total_count": 0, "anomalies": []}
        
    df_anom = df[valid_features].fillna(df[valid_features].mean())
    
    # IsolationForest requires at least two samples
    if df_anom.empty or len(df_anom) < 2:
        return {"total_count": 0, "anomalies": []}
    
    # 2. Isolation Forest
    iso = IsolationForest(contamination=0.05, random_state=42)
    preds = iso.fit_predict(df_anom) # -1 is anomaly
    
    anom_indices = np.where(preds == -1)[0]
    if len(anom_indices) == 0:
        return {"total_count": 0, "anomalies": []}
        
    anomalies_df = df.iloc[anom_indices].copy()
    
    # 3. Characterization
    # We want to group anomalies by "reason"
    # e.g. "High Risk-Like", "Low Value-Like"
    
    # Calculate global means for comparison
    global_means = df[valid_features].mean()
    
    characterized_anomalies = []
    
    # We'll summarize the top 5 most distinct anomalies or groups
    # For simplicity in this version, we'll return a summary of the group
    
    # Let's find the features that deviate most for the anomaly group as a whole
    anom_means = anomalies_df[valid_features].mean()
    deviations = {}
    
    for col in valid_features:
        if global_means[col] == 0: continue
        pct_diff = (anom_means[col] - global_means[col]) / global_means[col]
        deviations[col] = pct_diff
        
    # Map deviations to roles
    role_deviations = {}
    for role, cols in schema_map.semantic_roles.model_dump().items():
        if role in ["id_fields", "time_fields", "categorical_descriptors"]: continue
        
        role_diffs = []
        for col in cols:
            if col in deviations:
                role_diffs.append(deviations[col])
        
        if role_diffs:
            role_deviations[role] = float(np.mean(role_diffs))

    # Identify top drivers
    drivers = sorted(deviations.items(), key=lambda x: abs(x[1]), reverse=True)[:3]
    
    summary = {
        "total_count": int(len(anomalies_df)),
        "indices": anom_indices.tolist(),
        "drivers": {k: float(v) for k, v in drivers},
        "role_deviations": role_deviations
    }
    
    return summary
