
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.modules.employees.models import Employee
from app.modules.payroll.models import Payroll
from app.modules.payroll.schemas import (
    PayrollCreate,
    PayrollUpdate,
    PayrollResponse,
)

router = APIRouter(prefix="/payroll", tags=["Payroll"])


def calculate_net(basic_salary, allowances, deductions):
    return round(basic_salary + allowances - deductions, 2)


@router.get("/", response_model=list[PayrollResponse])
def list_payroll(db: Session = Depends(get_db)):
    return db.query(Payroll).order_by(Payroll.id.desc()).all()


@router.post("/", response_model=PayrollResponse, status_code=201)
def create_payroll(
    data: PayrollCreate,
    db: Session = Depends(get_db),
):
    employee = db.query(Employee).filter(
        Employee.id == data.employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if data.deductions > data.basic_salary + data.allowances:
        raise HTTPException(
            status_code=400,
            detail="Deductions cannot exceed gross salary"
        )

    existing = db.query(Payroll).filter(
        Payroll.employee_id == data.employee_id,
        Payroll.payroll_month == data.payroll_month,
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Payroll already exists for this employee and month"
        )

    record = Payroll(
        employee_id=data.employee_id,
        payroll_month=data.payroll_month,
        basic_salary=data.basic_salary,
        allowances=data.allowances,
        deductions=data.deductions,
        net_salary=calculate_net(
            data.basic_salary,
            data.allowances,
            data.deductions,
        ),
        status=data.status,
    )

    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{payroll_id}", response_model=PayrollResponse)
def get_payroll(
    payroll_id: int,
    db: Session = Depends(get_db),
):
    record = db.query(Payroll).filter(
        Payroll.id == payroll_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Payroll not found")

    return record


@router.put("/{payroll_id}", response_model=PayrollResponse)
def update_payroll(
    payroll_id: int,
    data: PayrollUpdate,
    db: Session = Depends(get_db),
):
    record = db.query(Payroll).filter(
        Payroll.id == payroll_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Payroll not found")

    changes = data.model_dump(exclude_unset=True)

    employee_id = changes.get("employee_id", record.employee_id)
    month = changes.get("payroll_month", record.payroll_month)

    employee = db.query(Employee).filter(
        Employee.id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    duplicate = db.query(Payroll).filter(
        Payroll.employee_id == employee_id,
        Payroll.payroll_month == month,
        Payroll.id != payroll_id,
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="Payroll already exists for this employee and month"
        )

    for field in (
        "employee_id",
        "payroll_month",
        "basic_salary",
        "allowances",
        "deductions",
        "status",
    ):
        if field in changes:
            setattr(record, field, changes[field])

    if record.deductions > record.basic_salary + record.allowances:
        raise HTTPException(
            status_code=400,
            detail="Deductions cannot exceed gross salary"
        )

    if record.status not in {"Pending", "Paid", "On Hold"}:
        raise HTTPException(
            status_code=400,
            detail="Status must be Pending, Paid, or On Hold"
        )

    record.net_salary = calculate_net(
        record.basic_salary,
        record.allowances,
        record.deductions,
    )

    db.commit()
    db.refresh(record)
    return record


@router.delete("/{payroll_id}")
def delete_payroll(
    payroll_id: int,
    db: Session = Depends(get_db),
):
    record = db.query(Payroll).filter(
        Payroll.id == payroll_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Payroll not found")

    if record.status == "Paid":
        raise HTTPException(
            status_code=400,
            detail="Paid payroll cannot be deleted"
        )

    db.delete(record)
    db.commit()
    return {"message": "Payroll deleted successfully"}
