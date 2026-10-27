 
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from app.database import Base


class HRIntervention(Base):
    __tablename__ = "hr_interventions"

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True,
    )

    prediction_id = Column(
        Integer,
        ForeignKey("attrition_predictions.id"),
        nullable=True,
        index=True,
    )

    intervention_type = Column(
        String(100),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=False,
    )

    assigned_to = Column(
        String(150),
        nullable=True,
    )

    status = Column(
        String(30),
        nullable=False,
        default="Pending",
        index=True,
    )

    priority = Column(
        String(20),
        nullable=False,
        default="Medium",
    )

    follow_up_date = Column(
        DateTime,
        nullable=True,
    )

    outcome = Column(
        Text,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
