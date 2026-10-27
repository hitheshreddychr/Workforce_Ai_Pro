
from datetime import date, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AttendanceCreate(BaseModel):
    employee_id: int = Field(gt=0)
    attendance_date: date
    check_in: time | None = None
    check_out: time | None = None
    status: Literal["Present", "Absent", "Late"] = "Present"
    remarks: str | None = None


class AttendanceUpdate(BaseModel):
    attendance_date: date | None = None
    check_in: time | None = None
    check_out: time | None = None
    status: Literal["Present", "Absent", "Late"] | None = None
    remarks: str | None = None


class AttendanceResponse(BaseModel):
    id: int
    employee_id: int
    attendance_date: date
    check_in: time | None
    check_out: time | None
    status: str
    remarks: str | None

    model_config = ConfigDict(from_attributes=True)
