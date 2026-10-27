
from pydantic import BaseModel, Field
from datetime import datetime


class PayrollCreate(BaseModel):
    employee_id: int = Field(gt=0)
    payroll_month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    basic_salary: float = Field(ge=0)
    allowances: float = Field(default=0, ge=0)
    deductions: float = Field(default=0, ge=0)
    status: str = "Pending"


class PayrollUpdate(BaseModel):
    employee_id: int | None = Field(default=None, gt=0)
    payroll_month: str | None = Field(
        default=None,
        pattern=r"^\d{4}-(0[1-9]|1[0-2])$"
    )
    basic_salary: float | None = Field(default=None, ge=0)
    allowances: float | None = Field(default=None, ge=0)
    deductions: float | None = Field(default=None, ge=0)
    status: str | None = None


class PayrollResponse(BaseModel):
    id: int
    employee_id: int
    payroll_month: str
    basic_salary: float
    allowances: float
    deductions: float
    net_salary: float
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
