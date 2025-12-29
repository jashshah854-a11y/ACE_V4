"""
Parallel clustering implementation optimized for Railway's 32 vCPU infrastructure.

This module provides parallel K-Means training to speed up clustering
from 60s to ~8s on cache misses.
"""

from concurrent.futures import ProcessPoolExecutor, as_completed
import multiprocessing as mp
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans, MiniBatchKMeans
from sklearn.metrics import silhouette_score
from typing import Dict, Any, Tuple, Optional
import os
import logging

logger = logging.getLogger(__name__)


def get_optimal_workers() -> int:
    """
    Determine optimal number of workers for Railway.
    
    Railway provides 32 vCPUs. We use 16 workers (50%) to leave
    room for other processes and avoid memory contention.
    
    Returns:
        Number of parallel workers to use
    """
    # Check if running on Railway
    if os.getenv("RAILWAY_ENVIRONMENT"):
        # Railway: use 16 workers (50% of 32 vCPUs)
        workers = 16
        logger.info(f"Railway environment detected, using {workers} workers")
        return workers
    else:
        # Local development: use half of available cores
        cpu_count = mp.cpu_count()
        workers = max(2, cpu_count // 2)
        logger.info(f"Local environment, using {workers} workers ({cpu_count} CPUs available)")
        return workers


def _train_single_kmeans(args: Tuple) -> Dict[str, Any]:
    """
    Worker function for parallel K-Means training.
    
    Must be a top-level function for pickling by ProcessPoolExecutor.
    
    Args:
        args: Tuple of (k, df_array, feature_names, random_state, fast_mode)
        
    Returns:
        Dict with k, score, labels, and error (if any)
    """
    k, df_array, feature_names, random_state, fast_mode = args
    
    try:
        # Reconstruct DataFrame from numpy array
        df_scaled = pd.DataFrame(df_array, columns=feature_names)
        
        if fast_mode:
            # Fast mode: MiniBatchKMeans
            model = MiniBatchKMeans(
                n_clusters=k,
                random_state=random_state,
                batch_size=2048,
                n_init="auto",
                max_iter=100
            )
            model.fit(df_scaled)
            labels_full = model.predict(df_scaled)
            
            # Sample for silhouette (expensive O(n²) operation)
            if len(df_scaled) > 20000:
                sil_subset = df_scaled.sample(n=20000, random_state=random_state)
                sil_labels = model.predict(sil_subset)
            else:
                sil_subset = df_scaled
                sil_labels = labels_full
            
            # Calculate silhouette score
            if len(set(sil_labels)) > 1:
                score = silhouette_score(sil_subset, sil_labels)
            else:
                score = -1.0
                
        else:
            # Normal mode: Standard KMeans
            model = KMeans(
                n_clusters=k,
                random_state=random_state,
                n_init=3,  # Reduced from 10 for parallel efficiency
                max_iter=300
            )
            labels_full = model.fit_predict(df_scaled)
            
            # Check if we got valid clusters
            if len(set(labels_full)) < 2:
                return {
                    "k": k,
                    "score": -1.0,
                    "labels": None,
                    "centroids": None,
                    "error": "Insufficient clusters formed"
                }
            
            # Calculate silhouette score
            score = silhouette_score(df_scaled, labels_full)
        
        # Return results
        return {
            "k": k,
            "score": float(score),
            "labels": labels_full.tolist(),
            "centroids": model.cluster_centers_.tolist(),
            "inertia": float(model.inertia_),
            "error": None
        }
        
    except Exception as e:
        logger.error(f"K={k} training failed: {e}")
        return {
            "k": k,
            "score": -1.0,
            "labels": None,
            "centroids": None,
            "error": str(e)
        }


def run_parallel_clustering(
    df_scaled: pd.DataFrame,
    min_k: int = 3,
    max_k: int = 5,
    fast_mode: bool = True,
    max_workers: Optional[int] = None
) -> Dict[str, Any]:
    """
    Run K-Means clustering in parallel for multiple K values.
    
    Args:
        df_scaled: Normalized dataframe ready for clustering
        min_k: Minimum number of clusters to test
        max_k: Maximum number of clusters to test
        fast_mode: Use MiniBatchKMeans if True
        max_workers: Number of parallel workers (auto-detect if None)
        
    Returns:
        Dict with best_k, best_score, best_labels, and all_results
    """
    # Determine number of workers
    if max_workers is None:
        max_workers = get_optimal_workers()
    
    # Ensure we have enough samples
    n_samples = len(df_scaled)
    max_k = min(max_k, n_samples)
    
    if max_k < min_k:
        logger.warning(f"Not enough samples ({n_samples}) for clustering")
        return {
            "best_k": 1,
            "best_score": 0.0,
            "best_labels": [0] * n_samples,
            "all_results": [],
            "error": "Insufficient samples"
        }
    
    logger.info(f"Running parallel clustering: K={min_k}-{max_k}, workers={max_workers}, fast_mode={fast_mode}")
    
    # Prepare arguments for parallel execution
    # Convert DataFrame to numpy array for pickling
    df_array = df_scaled.values
    feature_names = df_scaled.columns.tolist()
    random_state = 42
    
    k_values = range(min_k, max_k + 1)
    args_list = [
        (k, df_array, feature_names, random_state, fast_mode)
        for k in k_values
    ]
    
    # Run parallel training
    results = []
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        # Submit all jobs
        future_to_k = {
            executor.submit(_train_single_kmeans, args): args[0]
            for args in args_list
        }
        
        # Collect results as they complete
        for future in as_completed(future_to_k):
            k = future_to_k[future]
            try:
                result = future.result(timeout=300)  # 5 min timeout per K
                results.append(result)
                
                if result["error"]:
                    logger.warning(f"K={k}: {result['error']}")
                else:
                    logger.info(f"K={k} complete: score={result['score']:.3f}")
                    
            except Exception as e:
                logger.error(f"K={k} failed with exception: {e}")
                results.append({
                    "k": k,
                    "score": -1.0,
                    "labels": None,
                    "centroids": None,
                    "error": str(e)
                })
    
    # Find best result
    valid_results = [r for r in results if r["score"] > -1.0]
    
    if not valid_results:
        logger.error("All clustering attempts failed")
        return {
            "best_k": 1,
            "best_score": 0.0,
            "best_labels": [0] * n_samples,
            "all_results": results,
            "error": "All clustering attempts failed"
        }
    
    # Select best by silhouette score
    best_result = max(valid_results, key=lambda x: x["score"])
    
    logger.info(f"Best clustering: K={best_result['k']}, score={best_result['score']:.3f}")
    
    return {
        "best_k": best_result["k"],
        "best_score": best_result["score"],
        "best_labels": best_result["labels"],
        "best_centroids": best_result["centroids"],
        "best_inertia": best_result.get("inertia"),
        "all_results": results,
        "error": None
    }


def should_use_parallel(n_samples: int, n_features: int) -> bool:
    """
    Determine if parallel processing is worth the overhead.
    
    Parallel processing has ~1-2s overhead for process spawning.
    Only worth it for datasets large enough to benefit.
    
    Args:
        n_samples: Number of rows
        n_features: Number of features
        
    Returns:
        True if parallel processing should be used
    """
    # Estimate clustering time (rough heuristic)
    estimated_time = (n_samples * n_features) / 100000  # seconds
    
    # Use parallel if estimated time > 5 seconds
    use_parallel = estimated_time > 5
    
    logger.debug(f"Dataset: {n_samples} rows × {n_features} features, "
                f"estimated time: {estimated_time:.1f}s, "
                f"use_parallel: {use_parallel}")
    
    return use_parallel
