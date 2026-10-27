
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.modules.employees.models import Employee
from app.modules.performance.models import Performance
from app.modules.performance.schemas import (
    PerformanceCreate,
    PerformanceUpdate,
    PerformanceResponse,
)

router = APIRouter(prefix="/performance", tags=["Performance"])


@router.get("/", response_model=list[PerformanceResponse])
def list_reviews(db: Session = Depends(get_db)):
    return db.query(Performance).order_by(Performance.id.desc()).all()


@router.get("/{review_id}", response_model=PerformanceResponse)
def get_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(Performance).filter(
        Performance.id == review_id
    ).first()

    if not review:
        raise HTTPException(status_code=404, detail="Performance review not found")

    return review


@router.post("/", response_model=PerformanceResponse, status_code=201)
def create_review(data: PerformanceCreate, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(
        Employee.id == data.employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    review = Performance(**data.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.put("/{review_id}", response_model=PerformanceResponse)
def update_review(
    review_id: int,
    data: PerformanceUpdate,
    db: Session = Depends(get_db),
):
    review = db.query(Performance).filter(
        Performance.id == review_id
    ).first()

    if not review:
        raise HTTPException(status_code=404, detail="Performance review not found")

    changes = data.model_dump(exclude_unset=True)

    if "employee_id" in changes:
        employee = db.query(Employee).filter(
            Employee.id == changes["employee_id"]
        ).first()

        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

    for field, value in changes.items():
        setattr(review, field, value)

    db.commit()
    db.refresh(review)
    return review


@router.delete("/{review_id}")
def delete_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(Performance).filter(
        Performance.id == review_id
    ).first()

    if not review:
        raise HTTPException(status_code=404, detail="Performance review not found")

    db.delete(review)
    db.commit()
    return {"message": "Performance review deleted successfully"}
