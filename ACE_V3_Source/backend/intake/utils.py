import pandas as pd
import difflib
from typing import List, Optional

def normalize_dates(df: pd.DataFrame) -> pd.DataFrame:
    """
    Scan columns for date-like names or content and convert to ISO format.
    """
    date_keywords = ["date", "time", "timestamp", "dob", "created", "updated"]
    
    for col in df.columns:
        col_lower = str(col).lower()
        # Check name
        if any(k in col_lower for k in date_keywords):
            try:
                # Attempt conversion
                df[col] = pd.to_datetime(df[col], errors='coerce')
            except:
                pass
                
    return df

def fuzzy_match_key(target: str, candidates: List[str], threshold: float = 0.8) -> Optional[str]:
    """
    Find the best match for 'target' in 'candidates' using fuzzy logic.
    """
    # Exact match first
    if target in candidates:
        return target
        
    # Tokenize and normalize
    target_clean = target.lower().replace("_", "").replace("id", "")
    
    best_match = None
    best_score = 0.0
    
    for cand in candidates:
        cand_clean = cand.lower().replace("_", "").replace("id", "")
        
        # Simple containment check for strong signal
        if target_clean == cand_clean:
            return cand
            
        # Sequence matcher
        score = difflib.SequenceMatcher(None, target.lower(), cand.lower()).ratio()
        
        if score > best_score and score >= threshold:
            best_score = score
            best_match = cand
            
    return best_match
