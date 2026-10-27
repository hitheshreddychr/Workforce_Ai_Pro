
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.modules.employees.models import Employee
from app.modules.attendance.models import Attendance
from app.modules.attendance.schemas import (
    AttendanceCreate,
    AttendanceUpdate,
    AttendanceResponse,
)

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.get("/", response_model=list[AttendanceResponse])
def list_attendance(
    attendance_date: date | None = Query(default=None),
    employee_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
):
    query = db.query(Attendance)

    if attendance_date:
        query = query.filter(Attendance.attendance_date == attendance_date)

    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)

    return query.order_by(Attendance.attendance_date.desc()).all()


@router.post("/", response_model=AttendanceResponse, status_code=201)
def create_attendance(
    data: AttendanceCreate,
    db: Session = Depends(get_db),
):
    employee = db.query(Employee).filter(
        Employee.id == data.employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    existing = db.query(Attendance).filter(
        Attendance.employee_id == data.employee_id,
        Attendance.attendance_date == data.attendance_date,
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Attendance already exists for this employee on this date",
        )

    if data.check_in and data.check_out and data.check_out < data.check_in:
        raise HTTPException(
            status_code=400,
            detail="Check-out cannot be earlier than check-in",
        )

    record = Attendance(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{attendance_id}", response_model=AttendanceResponse)
def update_attendance(
    attendance_id: int,
    data: AttendanceUpdate,
    db: Session = Depends(get_db),
):
    record = db.query(Attendance).filter(
        Attendance.id == attendance_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    changes = data.model_dump(exclude_unset=True)

    check_in = changes.get("check_in", record.check_in)
    check_out = changes.get("check_out", record.check_out)

    if check_in and check_out and check_out < check_in:
        raise HTTPException(
            status_code=400,
            detail="Check-out cannot be earlier than check-in",
        )

    new_date = changes.get("attendance_date", record.attendance_date)
    duplicate = db.query(Attendance).filter(
        Attendance.employee_id == record.employee_id,
        Attendance.attendance_date == new_date,
        Attendance.id != attendance_id,
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="Attendance already exists for this employee on that date",
        )

    for field, value in changes.items():
        setattr(record, field, value)

    db.commit()
    db.refresh(record)
    return record


@router.delete("/{attendance_id}")
def delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
):
    record = db.query(Attendance).filter(
        Attendance.id == attendance_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    db.delete(record)
    db.commit()
    return {"message": "Attendance deleted successfully"}
