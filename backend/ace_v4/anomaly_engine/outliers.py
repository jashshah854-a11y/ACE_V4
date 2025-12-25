import pandas as pd
import numpy as np
from typing import List
from .models import AnomalyRecord
import uuid

class OutlierDetector:
    def run(self, df: pd.DataFrame, table_name: str) -> List[AnomalyRecord]:
        anomalies = []
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            # Simple IQR
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)]
import pandas as pd
import numpy as np
from typing import List
from .models import AnomalyRecord
import uuid

class OutlierDetector:
    def run(self, df: pd.DataFrame, table_name: str) -> List[AnomalyRecord]:
        anomalies = []
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            # Simple IQR
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)]
            
            if not outliers.empty:
                indices = outliers.index.tolist()[:5]
                for idx in indices:
                    val = df.at[idx, col]
                    anomalies.append(AnomalyRecord(
                        id=str(uuid.uuid4()),
                        table_name=table_name,
                        column_name=col,
                        row_index=idx,
                        anomaly_type="outlier",
                        severity="high",
                        description=f"Value {val} is an outlier (IQR method)",
                        suggested_fix="Verify value accuracy",
                        context={
                            "value": float(val),
                            "lower_bound": float(lower_bound),
                            "upper_bound": float(upper_bound),
                            "iqr": float(IQR)
                        },
                        detector="outlier_iqr",
                        rule_name="outlier_iqr_global"
                    ))
                    
        return anomalies
