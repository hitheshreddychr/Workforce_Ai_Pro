
from pathlib import Path

import joblib
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "attrition_model.joblib"

FEATURES = [
    "satisfaction",
    "overtime",
    "years_at_company",
    "experience_years",
    "monthly_income",
]


def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            "Attrition model not found. Run train_model.py first."
        )

    saved = joblib.load(MODEL_PATH)

    if isinstance(saved, dict) and "model" in saved:
        return saved["model"], saved.get("features", FEATURES)

    return saved, FEATURES


def predict_attrition(
    satisfaction: int,
    overtime: str,
    years_at_company: int,
    monthly_income: float,
):
    model, features = load_model()

    employee_data = pd.DataFrame(
        [
            {
                "satisfaction": satisfaction,
                "overtime": 1 if overtime == "Yes" else 0,
                "years_at_company": years_at_company,
                "experience_years": years_at_company,
                "monthly_income": monthly_income,
            }
        ],
        columns=features,
    )

    probabilities = model.predict_proba(employee_data)[0]
    classes = list(model.classes_)
    yes_index = classes.index(1) if 1 in classes else classes.index("Yes")

    probability = float(probabilities[yes_index])

    if probability >= 0.60:
        risk_level = "High"
        action = (
            "Arrange a retention discussion and review workload, "
            "satisfaction, and career growth."
        )
    elif probability >= 0.35:
        risk_level = "Medium"
        action = (
            "Schedule a manager check-in and review workload "
            "and development opportunities."
        )
    else:
        risk_level = "Low"
        action = (
            "Continue regular engagement, recognition, "
            "and career development."
        )

    return {
        "attrition_probability": round(probability, 4),
        "risk_level": risk_level,
        "recommended_action": action,
        "model_type": "Random Forest prototype trained on synthetic data",
    }
