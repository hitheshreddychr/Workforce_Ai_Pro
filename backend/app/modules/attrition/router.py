
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.employees.models import Employee
from app.modules.attrition.models import AttritionPrediction
from app.modules.attrition.schemas import (
    AttritionAssessmentRequest,
    AttritionPredictionCreate,
    AttritionPredictionResponse,
)
from app.modules.attrition.ml_service import predict_attrition

router = APIRouter(prefix="/attrition", tags=["Attrition AI"])


def get_employee_details(employee):
    """Return the employee's name and department."""
    return {
        "employee_name": employee.full_name,
        "department": employee.department,
    }


def prediction_to_dict(prediction, employee):
    """Return prediction data together with employee details."""
    result = AttritionPredictionResponse.model_validate(
        prediction
    ).model_dump()

    result.update(get_employee_details(employee))
    return result


@router.get("/")
def list_predictions(db: Session = Depends(get_db)):
    predictions = (
        db.query(AttritionPrediction)
        .order_by(AttritionPrediction.prediction_date.desc())
        .all()
    )

    results = []

    for prediction in predictions:
        employee = db.get(Employee, prediction.employee_id)

        if employee is not None:
            results.append(prediction_to_dict(prediction, employee))
        else:
            item = AttritionPredictionResponse.model_validate(
                prediction
            ).model_dump()

            item["employee_name"] = (
                f"Employee {prediction.employee_id}"
            )
            item["department"] = "Not specified"
            results.append(item)

    return results


@router.get("/{prediction_id}")
def get_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
):
    prediction = db.get(AttritionPrediction, prediction_id)

    if prediction is None:
        raise HTTPException(
            status_code=404,
            detail="Attrition prediction not found",
        )

    employee = db.get(Employee, prediction.employee_id)

    if employee is None:
        item = AttritionPredictionResponse.model_validate(
            prediction
        ).model_dump()

        item["employee_name"] = (
            f"Employee {prediction.employee_id}"
        )
        item["department"] = "Not specified"
        return item

    return prediction_to_dict(prediction, employee)


@router.post(
    "/assess",
    status_code=201,
)
def assess_attrition(
    data: AttritionAssessmentRequest,
    db: Session = Depends(get_db),
):
    employee = db.get(Employee, data.employee_id)

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    try:
        result = predict_attrition(
            satisfaction=data.satisfaction,
            overtime=data.overtime,
            years_at_company=data.years_at_company,
            monthly_income=data.monthly_income,
        )
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error
    except (ValueError, KeyError, TypeError) as error:
        raise HTTPException(
            status_code=500,
            detail=(
                "Could not calculate attrition prediction: "
                f"{error}"
            ),
        ) from error

    prediction = AttritionPrediction(
        employee_id=data.employee_id,
        attrition_probability=result["attrition_probability"],
        risk_level=result["risk_level"],
        recommended_action=result["recommended_action"],
    )

    try:
        db.add(prediction)
        db.commit()
        db.refresh(prediction)
    except Exception:
        db.rollback()
        raise

    return prediction_to_dict(prediction, employee)


@router.post(
    "/",
    response_model=AttritionPredictionResponse,
    status_code=201,
)
def create_prediction(
    data: AttritionPredictionCreate,
    db: Session = Depends(get_db),
):
    employee = db.get(Employee, data.employee_id)

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    prediction = AttritionPrediction(**data.model_dump())

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return prediction


@router.delete("/{prediction_id}")
def delete_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
):
    prediction = db.get(AttritionPrediction, prediction_id)

    if prediction is None:
        raise HTTPException(
            status_code=404,
            detail="Attrition prediction not found",
        )

    db.delete(prediction)
    db.commit()

    return {
        "message": "Attrition prediction deleted successfully"
    }
