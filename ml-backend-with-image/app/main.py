from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.pipeline import classify_report
from app.models import ReportIn
import traceback

app = FastAPI(title="Civic ML Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health():
    return {"status": "ML API running"}

@app.post("/submit")
def submit_report(data: dict):
    try:
        if not data:
            raise HTTPException(status_code=400, detail="Request body is required")
        
        if not isinstance(data, dict):
            raise HTTPException(status_code=400, detail="Request body must be a JSON object")
        
        required_fields = ["report_id", "description", "category"]
        missing_fields = [field for field in required_fields if field not in data or not data.get(field)]
        
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )
        
        result = classify_report(data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in submit_report: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
