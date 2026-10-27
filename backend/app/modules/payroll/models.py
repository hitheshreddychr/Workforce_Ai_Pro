
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Payroll(Base):
    __tablename__ = "payroll"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )
    payroll_month = Column(String(7), nullable=False)
    basic_salary = Column(Float, nullable=False, default=0)
    allowances = Column(Float, nullable=False, default=0)
    deductions = Column(Float, nullable=False, default=0)
    net_salary = Column(Float, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="Pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
