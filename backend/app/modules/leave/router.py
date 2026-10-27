
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.employees.models import Employee
from app.modules.leave.models import LeaveRequest
from app.modules.leave.schemas import LeaveCreate, LeaveUpdate, LeaveResponse

router = APIRouter(prefix="/leave", tags=["Leave Management"])


def validate_employee(db: Session, employee_id: int):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=404,
            detail=f"Employee {employee_id} was not found.",
        )
    return employee


@router.get("/", response_model=list[LeaveResponse])
def list_leave_requests(db: Session = Depends(get_db)):
    return db.query(LeaveRequest).order_by(LeaveRequest.id.desc()).all()


@router.post("/", response_model=LeaveResponse, status_code=status.HTTP_201_CREATED)
def create_leave_request(
    payload: LeaveCreate,
    db: Session = Depends(get_db),
):
    validate_employee(db, payload.employee_id)

    leave = LeaveRequest(**payload.model_dump())
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave


@router.get("/{leave_id}", response_model=LeaveResponse)
def get_leave_request(leave_id: int, db: Session = Depends(get_db)):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found.")
    return leave


@router.put("/{leave_id}", response_model=LeaveResponse)
def update_leave_request(
    leave_id: int,
    payload: LeaveUpdate,
    db: Session = Depends(get_db),
):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    validate_employee(db, payload.employee_id)

    for field, value in payload.model_dump().items():
        setattr(leave, field, value)

    db.commit()
    db.refresh(leave)
    return leave


@router.delete("/{leave_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_leave_request(leave_id: int, db: Session = Depends(get_db)):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    db.delete(leave)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
