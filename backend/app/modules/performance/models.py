
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text, Float, func
from sqlalchemy.orm import relationship
from app.database import Base


class Performance(Base):
    __tablename__ = "performance_reviews"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    review_period = Column(String(50), nullable=False)
    review_date = Column(Date, nullable=False)
    rating = Column(Float, nullable=False)
    goals = Column(Text, nullable=True)
    achievements = Column(Text, nullable=True)
    feedback = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="Pending")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    employee = relationship("Employee")
