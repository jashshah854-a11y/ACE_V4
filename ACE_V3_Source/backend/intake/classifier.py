from typing import List, Dict, Any
import pandas as pd

class IntakeClassifier:
    def classify(self, tables: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Classify each table by type and grain.
        Updates the metadata dict in-place.
        """
        for table in tables:
            self._classify_table(table)
        return tables

    def _classify_table(self, table: Dict[str, Any]):
        columns = [str(c).lower() for c in table["columns"]]
        row_count = table["row_count"]
        
        # Keywords
        customer_keys = ["customer", "client", "user", "account", "email", "phone"]
        card_keys = ["card", "pan", "credit", "debit"]
        product_keys = ["product", "sku", "item", "description"]
        txn_keys = ["transaction", "tx", "invoice", "order", "amount", "date", "timestamp"]
        
        has_customer = any(any(k in c for k in customer_keys) for c in columns)
        has_card = any(any(k in c for k in card_keys) for c in columns)
        has_product = any(any(k in c for k in product_keys) for c in columns)
        has_txn = any(any(k in c for k in txn_keys) for c in columns)
        
        # Heuristics
        
        # 1. Summary Table (Pivot or Aggregated)
        if table.get("is_pivot_candidate"):
            table["type"] = "summary_table"
            table["grain"] = "aggregated"
            return
            
        # Check for summary keywords in columns
        summary_keys = ["total", "avg", "mean", "sum", "count", "summary", "report"]
        summary_score = sum(1 for c in columns if any(k in c for k in summary_keys))
        if summary_score > 2 and row_count < 1000:
             table["type"] = "summary_table"
             table["grain"] = "aggregated"
             return

        # 2. Transaction Fact
        # Usually has date, amount, and is relatively long
        if has_txn and row_count > 50: 
             table["type"] = "transaction_fact"
             table["grain"] = "per_transaction"
             return

        # 3. Customer Dimension
        # Has customer ID and likely unique rows per ID (hard to check without loading, but assume based on name)
        if has_customer and not has_txn:
            table["type"] = "customer_dimension"
            table["grain"] = "per_customer"
            return

        # 4. Card Dimension
        if has_card and not has_txn:
            table["type"] = "card_dimension"
            table["grain"] = "per_card"
            return
            
        # 5. Product Dimension
        if has_product:
            table["type"] = "product_dimension"
            table["grain"] = "per_product"
            return
            
        # Fallback based on shape
        if row_count > 1000:
            table["type"] = "transaction_fact" # Assume big tables are facts
            table["grain"] = "per_transaction"
        else:
            table["type"] = "unknown_dimension"
            table["grain"] = "unknown"
