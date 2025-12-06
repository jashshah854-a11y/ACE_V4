import pandas as pd
import zipfile
import os
from pathlib import Path
from typing import List, Dict, Any
import shutil

class IntakeLoader:
    def __init__(self, run_path: str):
        self.run_path = Path(run_path)
        self.tables_dir = self.run_path / "tables"
        self.tables_dir.mkdir(exist_ok=True, parents=True)
        self.temp_dir = self.run_path / "temp_intake"
        self.temp_dir.mkdir(exist_ok=True)

    def load_input(self, input_path: str) -> List[Dict[str, Any]]:
        """
        Discover and load all tables from the input path.
        Returns a list of table metadata dictionaries.
        """
        input_path = Path(input_path)
        all_files = self._discover_files(input_path)
        
        loaded_tables = []
        
        for file_path in all_files:
            try:
                tables = self._load_file(file_path)
                loaded_tables.extend(tables)
            except Exception as e:
                print(f"⚠️ Failed to load {file_path}: {e}")
                
        return loaded_tables

    def _discover_files(self, input_path: Path, *, _allow_internal: bool = False) -> List[Path]:
        files = []
        
        if input_path.is_file():
            if input_path.suffix.lower() == ".zip":
                # Extract zip
                with zipfile.ZipFile(input_path, 'r') as zip_ref:
                    zip_ref.extractall(self.temp_dir)
                # Recursively scan extracted folder
                files.extend(self._discover_files(self.temp_dir, _allow_internal=True))
            else:
                files.append(input_path)
                
        elif input_path.is_dir():
            for p in input_path.rglob("*"):
                # Ignore internal directories
                if not _allow_internal and ("tables" in p.parts or "temp_intake" in p.parts):
                    continue
                # Ignore master dataset
                if p.name == "master_dataset.csv":
                    continue
                    
                if p.is_file() and not p.name.startswith("~") and not p.name.startswith("."):
                    if p.suffix.lower() in [".csv", ".tsv", ".xlsx", ".xls", ".json", ".ndjson", ".jsonl"]:
                        files.append(p)
                        
        return files

    def _load_file(self, file_path: Path) -> List[Dict[str, Any]]:
        tables = []
        ext = file_path.suffix.lower()
        
        if ext in [".csv", ".tsv"]:
            sep = "\t" if ext == ".tsv" else ","
            try:
                df = pd.read_csv(file_path, sep=sep, on_bad_lines='warn')
            except Exception as e:
                print(f"⚠️ CSV Load Error (Retrying with python engine): {e}")
                # Fallback to python engine which is more robust
                df = pd.read_csv(file_path, sep=sep, on_bad_lines='warn', engine='python')
            table_meta = self._save_table(df, file_path.stem, file_path.name)
            tables.append(table_meta)
            
        elif ext in [".xlsx", ".xls"]:
            xls = pd.ExcelFile(file_path)
            for sheet_name in xls.sheet_names:
                df = pd.read_excel(xls, sheet_name=sheet_name)
                # Basic cleaning for Excel
                df = df.dropna(how="all").dropna(axis=1, how="all")
                
                # Pivot detection (heuristic)
                is_pivot = self._check_pivot(df)
                
                table_name = f"{file_path.stem}_{sheet_name}"
                table_meta = self._save_table(df, table_name, file_path.name, sheet_name, is_pivot)
                tables.append(table_meta)
                
        elif ext in [".json", ".ndjson", ".jsonl"]:
            try:
                # Try line-delimited first (common for logs)
                df = pd.read_json(file_path, lines=True)
            except ValueError:
                # Fallback to standard JSON
                try:
                    df = pd.read_json(file_path)
                except Exception as e:
                    print(f"⚠️ JSON Load Error: {e}")
                    return []
            
            table_meta = self._save_table(df, file_path.stem, file_path.name)
            tables.append(table_meta)
                
        return tables

    def _save_table(self, df: pd.DataFrame, name: str, source_file: str, source_sheet: str = None, is_pivot: bool = False) -> Dict[str, Any]:
        # Normalize name
        safe_name = "".join([c if c.isalnum() else "_" for c in name]).lower()
        save_path = self.tables_dir / f"{safe_name}.csv"
        
        # Save normalized CSV
        df.to_csv(save_path, index=False)
        
        return {
            "name": safe_name,
            "source_file": source_file,
            "source_sheet": source_sheet,
            "path": str(save_path),
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": list(df.columns),
            "sample_columns": list(df.columns)[:5],
            "is_pivot_candidate": is_pivot,
            "type": "unknown", # To be filled by classifier
            "grain": "unknown"
        }

    def _check_pivot(self, df: pd.DataFrame) -> bool:
        # Simple heuristic: First row has many non-numeric headers (months, etc)
        # and inner cells are numeric.
        if len(df) < 2: return False
        
        # Check if column names look like dates/periods
        period_keywords = ["jan", "feb", "q1", "q2", "2023", "2024", "month", "year"]
        matches = sum(1 for c in df.columns if str(c).lower()[:3] in period_keywords)
        
        if matches > 3:
            return True
            
        return False

    def cleanup(self):
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
