from typing import Dict, Optional


def select_task(data_type: Optional[Dict], has_target: bool, target_is_binary: bool) -> Dict[str, str]:
    """
    Simple router to pick primary task and template based on target presence and domain.
    """
    primary = "eda_clustering"
    template = "generic"

    if has_target:
        if target_is_binary:
            primary = "classification"
        else:
            primary = "regression"

    dt_primary = (data_type or {}).get("primary_type") or "unknown"
    if dt_primary in ("marketing_performance", "customer_behavior_logs", "customer_crm"):
        template = "marketing"
    elif dt_primary in ("financial_accounting", "operational_supply_chain"):
        template = "finance_ops"
    elif dt_primary in ("time_series_trend", "forecast_prediction"):
        template = "timeseries"

    return {"task": primary, "template": template, "data_type": dt_primary}

