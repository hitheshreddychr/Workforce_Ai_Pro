
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HRInterventionCreate(BaseModel):
    employee_id: int = Field(gt=0)
    prediction_id: int | None = Field(default=None, gt=0)

    intervention_type: str = Field(min_length=2, max_length=100)
    description: str = Field(min_length=3, max_length=5000)

    assigned_to: str | None = Field(default=None, max_length=150)

    status: str = Field(
        default="Pending",
        pattern="^(Pending|In Progress|Completed|Cancelled)$",
    )

    priority: str = Field(
        default="Medium",
        pattern="^(Low|Medium|High|Urgent)$",
    )

    follow_up_date: datetime | None = None
    outcome: str | None = Field(default=None, max_length=5000)


class HRInterventionUpdate(BaseModel):
    intervention_type: str | None = Field(
        default=None, min_length=2, max_length=100
    )
    description: str | None = Field(
        default=None, min_length=3, max_length=5000
    )
    assigned_to: str | None = Field(default=None, max_length=150)

    status: str | None = Field(
        default=None,
        pattern="^(Pending|In Progress|Completed|Cancelled)$",
    )

    priority: str | None = Field(
        default=None,
        pattern="^(Low|Medium|High|Urgent)$",
    )

    follow_up_date: datetime | None = None
    outcome: str | None = Field(default=None, max_length=5000)


class HRInterventionResponse(HRInterventionCreate):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
