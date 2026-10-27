
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import Base, engine

# Module 1: Authentication & Authorization
from app.modules.auth import models as auth_models
from app.modules.auth.router import router as auth_router

# Module 2: Employee Management
from app.modules.employees import models as employee_models
from app.modules.employees.router import router as employee_router

# Module 3: Attendance Management
from app.modules.attendance import models as attendance_models
from app.modules.attendance.router import router as attendance_router

# Module 4: Leave Management
from app.modules.leave import models as leave_models
from app.modules.leave.router import router as leave_router

# Module 5: Payroll Management
from app.modules.payroll import models as payroll_models
from app.modules.payroll.router import router as payroll_router

# Module 6: Performance Management
from app.modules.performance import models as performance_models
from app.modules.performance.router import router as performance_router

# Module 12: Attrition AI
from app.modules.attrition import models as attrition_models
from app.modules.attrition.router import router as attrition_router

# Module 16: HR Intervention & Decision Support
from app.modules.interventions import models as intervention_models
from app.modules.interventions.router import router as interventions_router


app = FastAPI(
    title="WorkForce AI Pro",
    description="HR Attrition Prediction & Workforce Intelligence Platform",
    version="1.0.0",
)

# Allow the React frontend to communicate with the backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all models before creating missing database tables.
Base.metadata.create_all(bind=engine)

# Module 1: Authentication routes
app.include_router(auth_router)

# Register existing module routes.
app.include_router(employee_router)
app.include_router(attendance_router)
app.include_router(leave_router)
app.include_router(payroll_router)
app.include_router(performance_router)
app.include_router(attrition_router)
app.include_router(interventions_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to WorkForce AI Pro!",
        "status": "Backend is running",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/db-health")
def database_health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"database": "connected"}
    except Exception:
        return {"database": "disconnected"}
