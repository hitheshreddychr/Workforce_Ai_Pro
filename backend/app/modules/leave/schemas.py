
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


LeaveType = Literal["Casual", "Sick", "Annual", "Maternity", "Other"]
LeaveStatus = Literal["Pending", "Approved", "Rejected"]


class LeaveBase(BaseModel):
    employee_id: int = Field(gt=0)
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str = Field(min_length=1, max_length=2000)
    status: LeaveStatus = "Pending"

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("End date cannot be earlier than start date.")
        return self


class LeaveCreate(LeaveBase):
    pass


class LeaveUpdate(LeaveBase):
    pass


class LeaveResponse(LeaveBase):
    id: int
    created_at: object | None = None

    model_config = ConfigDict(from_attributes=True)
