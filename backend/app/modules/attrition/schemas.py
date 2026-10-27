
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AttritionAssessmentRequest(BaseModel):
    employee_id: int = Field(gt=0)
    satisfaction: int = Field(ge=1, le=5)
    overtime: str = Field(pattern="^(Yes|No)$")
    years_at_company: int = Field(ge=0)
    monthly_income: float = Field(gt=0)


class AttritionPredictionCreate(BaseModel):
    employee_id: int = Field(gt=0)
    attrition_probability: float = Field(ge=0, le=1)
    risk_level: str = Field(pattern="^(Low|Medium|High)$")
    recommended_action: str | None = None


class AttritionPredictionResponse(AttritionPredictionCreate):
    id: int
    prediction_date: datetime
    employee_name: str | None = None
    department: str | None = None

    model_config = ConfigDict(from_attributes=True)
