from fastapi import APIRouter, HTTPException
import logging

from db.mysql_utils import fetch_all_rows

router = APIRouter(prefix="/debug", tags=["debug"])


@router.get("/sot/{sot_name}")
def debug_sot_table(sot_name: str):
    """
    Debug endpoint to inspect SOT table data and structure.
    """
    try:
        rows = fetch_all_rows(sot_name)
        
        if not rows:
            return {
                "sot_name": sot_name,
                "row_count": 0,
                "columns": [],
                "sample_data": []
            }
        
        # Get column names from first row
        columns = list(rows[0].keys()) if rows else []
        
        # Get sample data (first 5 rows)
        sample_data = rows[:5]
        
        return {
            "sot_name": sot_name,
            "row_count": len(rows),
            "columns": columns,
            "sample_data": sample_data
        }
    except Exception as e:
        logging.error(f"Error debugging SOT table {sot_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Error accessing SOT table: {str(e)}") 