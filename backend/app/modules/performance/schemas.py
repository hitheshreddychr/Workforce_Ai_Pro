
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class PerformanceBase(BaseModel):
    employee_id: int = Field(gt=0)
    review_period: str = Field(min_length=1, max_length=50)
    review_date: date = Field(default_factory=date.today)
    rating: float = Field(ge=0, le=5)
    goals: str | None = None
    achievements: str | None = None
    feedback: str | None = None
    status: str = "Pending"


class PerformanceCreate(PerformanceBase):
    pass


class PerformanceUpdate(BaseModel):
    employee_id: int | None = Field(default=None, gt=0)
    review_period: str | None = Field(
        default=None, min_length=1, max_length=50
    )
    review_date: date | None = None
    rating: float | None = Field(default=None, ge=0, le=5)
    goals: str | None = None
    achievements: str | None = None
    feedback: str | None = None
    status: str | None = None


class PerformanceResponse(PerformanceBase):
    id: int
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
