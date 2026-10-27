
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.employees.models import Employee
from app.modules.attrition.models import AttritionPrediction
from app.modules.interventions.models import HRIntervention
from app.modules.interventions.schemas import (
    HRInterventionCreate,
    HRInterventionUpdate,
    HRInterventionResponse,
)

router = APIRouter(
    prefix="/interventions",
    tags=["HR Interventions"],
)


# --------------------------------------------------
# CREATE INTERVENTION
# --------------------------------------------------
@router.post(
    "/",
    response_model=HRInterventionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_intervention(
    data: HRInterventionCreate,
    db: Session = Depends(get_db),
):
    employee = db.get(Employee, data.employee_id)

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    if data.prediction_id is not None:
        prediction = db.get(AttritionPrediction, data.prediction_id)

        if prediction is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attrition prediction not found",
            )

        if prediction.employee_id != data.employee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The prediction does not belong to this employee",
            )

    intervention = HRIntervention(**data.model_dump())
    db.add(intervention)

    try:
        db.commit()
        db.refresh(intervention)
    except Exception:
        db.rollback()
        raise

    return intervention


# --------------------------------------------------
# LIST INTERVENTIONS
# --------------------------------------------------
@router.get(
    "/",
    response_model=list[HRInterventionResponse],
)
def list_interventions(
    employee_id: int | None = None,
    intervention_status: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(HRIntervention)

    if employee_id is not None:
        query = query.filter(
            HRIntervention.employee_id == employee_id
        )

    if intervention_status is not None:
        allowed_statuses = {
            "Pending",
            "In Progress",
            "Completed",
            "Cancelled",
        }

        if intervention_status not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid intervention status",
            )

        query = query.filter(
            HRIntervention.status == intervention_status
        )

    return query.order_by(
        HRIntervention.created_at.desc()
    ).all()


# --------------------------------------------------
# HR RETENTION RECOMMENDATIONS
# --------------------------------------------------
@router.get("/recommendations/{employee_id}")
def get_retention_recommendations(
    employee_id: int,
    db: Session = Depends(get_db),
):
    employee = db.get(Employee, employee_id)

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    prediction = (
        db.query(AttritionPrediction)
        .filter(AttritionPrediction.employee_id == employee_id)
        .order_by(AttritionPrediction.prediction_date.desc())
        .first()
    )

    if prediction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No attrition prediction exists for this employee. "
                "Run an attrition assessment first."
            ),
        )

    risk_level = prediction.risk_level
    recommendations = []

    if risk_level == "High":
        recommendations = [
            {
                "title": "Schedule an HR check-in",
                "description": (
                    "Arrange a confidential conversation to understand "
                    "the employee's concerns and support needs."
                ),
                "priority": "Urgent",
            },
            {
                "title": "Review workload and overtime",
                "description": (
                    "Discuss workload, work-life balance, and whether "
                    "additional support or workload adjustments are needed."
                ),
                "priority": "High",
            },
            {
                "title": "Discuss career development",
                "description": (
                    "Explore career goals, training opportunities, "
                    "and possible development plans."
                ),
                "priority": "High",
            },
            {
                "title": "Schedule a follow-up",
                "description": (
                    "Agree on suitable next steps with the employee "
                    "and schedule a follow-up conversation."
                ),
                "priority": "High",
            },
        ]

    elif risk_level == "Medium":
        recommendations = [
            {
                "title": "Conduct an engagement check-in",
                "description": (
                    "Ask about job satisfaction, workplace concerns, "
                    "and support the employee may need."
                ),
                "priority": "Medium",
            },
            {
                "title": "Review growth opportunities",
                "description": (
                    "Discuss skills development, training, and "
                    "career progression options."
                ),
                "priority": "Medium",
            },
            {
                "title": "Monitor follow-up actions",
                "description": (
                    "Record agreed actions and review progress "
                    "at an appropriate future date."
                ),
                "priority": "Medium",
            },
        ]

    else:
        recommendations = [
            {
                "title": "Maintain regular engagement",
                "description": (
                    "Continue routine check-ins and encourage "
                    "open communication."
                ),
                "priority": "Low",
            },
            {
                "title": "Support career development",
                "description": (
                    "Discuss learning goals, recognition, and "
                    "future development opportunities."
                ),
                "priority": "Low",
            },
        ]

    return {
        "employee_id": employee.id,
        "employee_name": employee.full_name,
        "department": employee.department,
        "prediction_id": prediction.id,
        "risk_level": risk_level,
        "attrition_probability": prediction.attrition_probability,
        "model_recommended_action": prediction.recommended_action,
        "recommendations": recommendations,
        "notice": (
            "These are risk-based decision-support suggestions, "
            "not verified causes of attrition or automatic employment decisions. "
            "HR should review the employee's individual circumstances."
        ),
    }


# --------------------------------------------------
# GET ONE INTERVENTION
# --------------------------------------------------
@router.get(
    "/{intervention_id}",
    response_model=HRInterventionResponse,
)
def get_intervention(
    intervention_id: int,
    db: Session = Depends(get_db),
):
    intervention = db.get(HRIntervention, intervention_id)

    if intervention is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="HR intervention not found",
        )

    return intervention


# --------------------------------------------------
# UPDATE INTERVENTION
# --------------------------------------------------
@router.put(
    "/{intervention_id}",
    response_model=HRInterventionResponse,
)
def update_intervention(
    intervention_id: int,
    data: HRInterventionUpdate,
    db: Session = Depends(get_db),
):
    intervention = db.get(HRIntervention, intervention_id)

    if intervention is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="HR intervention not found",
        )

    updates = data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        if value is not None:
            setattr(intervention, field, value)

    intervention.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(intervention)
    except Exception:
        db.rollback()
        raise

    return intervention


# --------------------------------------------------
# DELETE INTERVENTION
# --------------------------------------------------
@router.delete(
    "/{intervention_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_intervention(
    intervention_id: int,
    db: Session = Depends(get_db),
):
    intervention = db.get(HRIntervention, intervention_id)

    if intervention is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="HR intervention not found",
        )

    try:
        db.delete(intervention)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return None
