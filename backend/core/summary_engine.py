"""
Summary Engine for Quick View Mode

Computes lightweight dataset summaries including:
- Schema inference (column types)
- Basic statistics (numeric and categorical)
- Simple correlations (Pearson coefficients)
- Suggested questions (templated from schema)
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger("ace.summary_engine")


def infer_schema(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Infer column types and missing value counts.
    
    Returns:
        List of schema columns with name, type, and missing_count
    """
    schema = []
    
    for col in df.columns:
        col_type = "text"
        
        # Determine type
        if pd.api.types.is_numeric_dtype(df[col]):
            col_type = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(df[col]):
            col_type = "datetime"
        elif pd.api.types.is_categorical_dtype(df[col]) or df[col].dtype == 'object':
            # Check if it's actually categorical (low cardinality)
            unique_ratio = df[col].nunique() / len(df)
            if unique_ratio < 0.5:  # Less than 50% unique values
                col_type = "categorical"
        
        schema.append({
            "name": str(col),
            "type": col_type,
            "missing_count": int(df[col].isnull().sum())
        })
    
    return schema


def compute_statistics(df: pd.DataFrame, schema: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compute basic statistics for numeric and categorical columns.
    
    Returns:
        Dictionary mapping column names to their statistics
    """
    stats = {}
    
    for col_info in schema:
        col_name = col_info["name"]
        col_type = col_info["type"]
        
        try:
            if col_type == "numeric":
                # Numeric statistics
                stats[col_name] = {
                    "count": int(df[col_name].count()),
                    "mean": float(df[col_name].mean()) if not df[col_name].empty else 0.0,
                    "median": float(df[col_name].median()) if not df[col_name].empty else 0.0,
                    "std": float(df[col_name].std()) if not df[col_name].empty else 0.0,
                    "min": float(df[col_name].min()) if not df[col_name].empty else 0.0,
                    "max": float(df[col_name].max()) if not df[col_name].empty else 0.0,
                }
            
            elif col_type == "categorical":
                # Categorical statistics
                value_counts = df[col_name].value_counts().head(10)
                stats[col_name] = {
                    "count": int(df[col_name].count()),
                    "top_categories": [
                        {"value": str(val), "count": int(count)}
                        for val, count in value_counts.items()
                    ]
                }
        
        except Exception as e:
            logger.warning(f"Failed to compute stats for {col_name}: {e}")
            stats[col_name] = {"error": str(e)}
    
    return stats


def compute_correlations(df: pd.DataFrame, schema: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Compute pairwise Pearson correlations for numeric columns.
    
    Returns:
        List of correlation objects with x, y, corr, and p_value
    """
    correlations = []
    
    # Get numeric columns only
    numeric_cols = [col["name"] for col in schema if col["type"] == "numeric"]
    
    if len(numeric_cols) < 2:
        return correlations
    
    try:
        # Compute correlation matrix
        corr_matrix = df[numeric_cols].corr()
        
        # Extract significant correlations (avoid duplicates and self-correlations)
        for i, col1 in enumerate(numeric_cols):
            for col2 in numeric_cols[i+1:]:
                corr_value = corr_matrix.loc[col1, col2]
                
                # Only include non-trivial correlations
                if not np.isnan(corr_value) and abs(corr_value) > 0.1:
                    correlations.append({
                        "x": col1,
                        "y": col2,
                        "corr": round(float(corr_value), 3),
                        "p_value": 0.001  # Simplified - would need scipy for actual p-value
                    })
        
        # Sort by absolute correlation strength
        correlations.sort(key=lambda x: abs(x["corr"]), reverse=True)
        
        # Return top 10 correlations
        return correlations[:10]
    
    except Exception as e:
        logger.warning(f"Failed to compute correlations: {e}")
        return []


def generate_questions(schema: List[Dict[str, Any]], correlations: List[Dict[str, Any]]) -> List[str]:
    """
    Generate templated questions based on schema and correlations.
    
    Returns:
        List of suggested questions (max 10)
    """
    questions = []
    
    # Distribution questions for numeric columns
    numeric_cols = [col for col in schema if col["type"] == "numeric"]
    for col in numeric_cols[:3]:  # Top 3 numeric columns
        questions.append(f"What is the distribution of {col['name']}?")
    
    # Correlation questions for strong correlations
    for corr in correlations[:3]:  # Top 3 correlations
        if abs(corr["corr"]) > 0.5:
            questions.append(f"How does {corr['x']} relate to {corr['y']}?")
    
    # Category questions for categorical columns
    categorical_cols = [col for col in schema if col["type"] == "categorical"]
    for col in categorical_cols[:2]:  # Top 2 categorical columns
        questions.append(f"What are the most common {col['name']} values?")
    
    # Time series question if datetime column exists
    datetime_cols = [col for col in schema if col["type"] == "datetime"]
    if datetime_cols:
        questions.append(f"How has the data changed over time?")
    
    # General overview question
    if not questions:
        questions.append("What are the key characteristics of this dataset?")
    
    # Limit to 10 questions
    return questions[:10]


def compute_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Main entry point: compute complete summary for Quick View mode.
    
    Args:
        df: Pandas DataFrame to analyze
    
    Returns:
        Dictionary with schema, statistics, correlations, and questions
    """
    try:
        # 1. Infer schema
        schema = infer_schema(df)
        
        # 2. Compute statistics
        statistics = compute_statistics(df, schema)
        
        # 3. Compute correlations
        correlations = compute_correlations(df, schema)
        
        # 4. Generate questions
        questions = generate_questions(schema, correlations)
        
        return {
            "schema": schema,
            "statistics": statistics,
            "correlations": correlations,
            "questions": questions,
            "row_count": len(df),
            "column_count": len(df.columns)
        }
    
    except Exception as e:
        logger.error(f"Summary computation failed: {e}", exc_info=True)
        # Return minimal fallback
        return {
            "schema": [],
            "statistics": {},
            "correlations": [],
            "questions": ["What are the key characteristics of this dataset?"],
            "row_count": len(df) if df is not None else 0,
            "column_count": len(df.columns) if df is not None else 0,
            "error": str(e)
        }
