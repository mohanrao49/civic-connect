from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models import ReportIn, ReportStatus
from app.pipeline import classify_report, initialize_models

app = FastAPI(title="Civic ML Backend (with Image)")

# Enable CORS for local frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.on_event("startup")
def startup_event():
    # initialize optional ML models (CLIP or zero-shot) if available
    initialize_models()

@app.post("/submit", response_model=ReportStatus)
def submit_report(report: ReportIn):
    result = classify_report(report.dict())
    return result
