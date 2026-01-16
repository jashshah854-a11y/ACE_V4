"""
NEW: Quick Summary endpoint for Quick View mode
"""

@app.get("/run/{run_id}/summary", tags=["Artifacts"])
async def get_quick_summary(run_id: str):
    """
    Get quick summary data for Quick View mode.
    
    Returns:
        Schema, basic statistics, correlations, and suggested questions
    """
    from core.summary_engine import compute_summary
    from core.state_manager import StateManager
    
    _validate_run_id(run_id)
    
    run_path = DATA_DIR / "runs" / run_id
    if not run_path.exists():
        raise HTTPException(status_code=404, detail="Run not found")
    
    state = StateManager(str(run_path))
    
    # Check if summary already exists
    existing_summary = state.read("quick_summary")
    if existing_summary:
        logger.info(f"[API] Returning cached summary for {run_id}")
        return existing_summary
    
    # Compute summary from dataset
    try:
        # Find the dataset file
        active_dataset = state.read("active_dataset") or {}
        dataset_path = active_dataset.get("path")
        
        if not dataset_path or not Path(dataset_path).exists():
            raise HTTPException(status_code=404, detail="Dataset not found for this run")
        
        # Read dataset
        logger.info(f"[API] Computing summary for {run_id} from {dataset_path}")
        if str(dataset_path).lower().endswith(".parquet"):
            df = pd.read_parquet(dataset_path)
        elif str(dataset_path).lower().endswith((".csv", ".txt", ".tsv")):
            df = pd.read_csv(dataset_path)
        elif str(dataset_path).lower().endswith((".xlsx", ".xls")):
            df = pd.read_excel(dataset_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Compute summary
        summary = compute_summary(df)
        summary["run_id"] = run_id
        summary["status"] = "completed"
        
        # Store summary for future requests
        state.write("quick_summary", summary)
        logger.info(f"[API] Summary computed and cached for {run_id}")
        
        return summary
        
    except Exception as e:
        logger.error(f"[API] Failed to compute summary for {run_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Summary computation failed: {str(e)}")
