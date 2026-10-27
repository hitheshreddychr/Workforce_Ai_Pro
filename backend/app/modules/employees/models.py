from sqlalchemy import Boolean, Column, Date, Integer, Numeric, String
from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    department = Column(String(100), nullable=False)
    job_title = Column(String(100), nullable=False)
    salary = Column(Numeric(12, 2), nullable=True)
    hire_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
