from typing import List, Dict
import pandas as pd

from .models import IntegrationIssue, TableNode


class ValueDomainChecker:
    def __init__(self, max_unique=500, sample_limit=20):
        self.max_unique = max_unique
        self.sample_limit = sample_limit

    def is_categorical(self, series: pd.Series) -> bool:
        # numeric or date types are not checked here
        if pd.api.types.is_numeric_dtype(series):
            return False
        if pd.api.types.is_datetime64_any_dtype(series):
            return False

        # if too many unique values it is not stable categorical
        if series.nunique(dropna=True) > self.max_unique:
            return False

        return True

    def collect_column_domains(
        self,
        tables: Dict[str, pd.DataFrame]
    ) -> Dict[str, Dict[str, set]]:
        """
        Returns a mapping:
        domain_map[column_name][table_name] = set_of_values
        """
        domain_map: Dict[str, Dict[str, set]] = {}

        for table_name, df in tables.items():
            for col in df.columns:

                series = df[col].dropna()

                if not self.is_categorical(series):
                    continue

                # initialize nested map
                if col not in domain_map:
                    domain_map[col] = {}

                # store distinct string values
                values = set(series.astype(str).unique())
                domain_map[col][table_name] = values

        return domain_map

    def find_conflicts(
        self,
        domain_map: Dict[str, Dict[str, set]]
    ) -> List[IntegrationIssue]:
        issues = []

        for column, table_values_map in domain_map.items():
            tables = list(table_values_map.keys())
            if len(tables) < 2:
                continue

            # compare each pair of tables
            for i in range(len(tables)):
                for j in range(i + 1, len(tables)):
                    t1 = tables[i]
                    t2 = tables[j]
                    v1 = table_values_map[t1]
                    v2 = table_values_map[t2]

                    missing_in_t1 = v2 - v1
                    missing_in_t2 = v1 - v2

                    if missing_in_t1 or missing_in_t2:
                        # pick mismatches for display
                        samples = list((missing_in_t1 | missing_in_t2))[:self.sample_limit]

                        issue = IntegrationIssue(
                            issue_type="value_conflict",
                            severity="medium",
                            description=(
                                f"Column {column} has mismatched categorical values between "
                                f"{t1} and {t2}. "
                                f"{t1} missing {len(missing_in_t1)} values from {t2}. "
                                f"{t2} missing {len(missing_in_t2)} values from {t1}."
                            ),
                            tables_involved=[t1, t2],
                            key_column=column,
                            metric=len(samples),
                            sample_keys=samples,
                            context={
                                "missing_in_first_table": list(missing_in_t1),
                                "missing_in_second_table": list(missing_in_t2),
                                "column": column,
                                "table_one": t1,
                                "table_two": t2,
                                "example_value_one": next(iter(missing_in_t1 or v1), ""),
                                "example_value_two": next(iter(missing_in_t2 or v2), "")
                            }
                        )

                        issues.append(issue)

        return issues

    def run(
        self,
        tables: Dict[str, pd.DataFrame]
    ) -> List[IntegrationIssue]:
        domain_map = self.collect_column_domains(tables)
        issues = self.find_conflicts(domain_map)
        return issues
