
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from app.database import Base


class AttritionPrediction(Base):
    __tablename__ = "attrition_predictions"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True,
    )
    attrition_probability = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False, index=True)
    prediction_date = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    recommended_action = Column(String(500), nullable=True)
