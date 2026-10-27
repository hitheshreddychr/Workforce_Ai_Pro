
from fastapi import FastAPI

app = FastAPI(
    title="WorkForce AI Pro",
    description="HR Attrition Prediction & Workforce Intelligence Platform",
    version="1.0.0"
)

@app.get("/")
def home():
    return {
        "message": "Welcome to WorkForce AI Pro!",
        "status": "Backend is running"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
