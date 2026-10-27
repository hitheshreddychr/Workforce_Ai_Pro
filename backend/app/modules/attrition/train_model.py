
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import train_test_split


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "attrition_model.joblib"
REPORT_PATH = BASE_DIR / "model_evaluation.txt"


def main():
    # Synthetic data for prototype demonstration only.
    # Do not use these records to make real employment decisions.
    data = pd.DataFrame(
        [
            [1, "Yes", 1, 25000, "Yes"],
            [2, "Yes", 2, 28000, "Yes"],
            [1, "Yes", 1, 30000, "Yes"],
            [2, "Yes", 2, 32000, "Yes"],
            [1, "No", 3, 35000, "Yes"],
            [3, "No", 5, 45000, "No"],
            [4, "No", 8, 55000, "No"],
            [5, "No", 10, 65000, "No"],
            [4, "Yes", 6, 50000, "No"],
            [3, "No", 7, 60000, "No"],
            [2, "Yes", 2, 33000, "Yes"],
            [5, "No", 12, 70000, "No"],
            [3, "No", 4, 42000, "No"],
            [1, "Yes", 1, 26000, "Yes"],
            [4, "No", 9, 62000, "No"],
            [2, "No", 3, 38000, "Yes"],
            [5, "No", 11, 75000, "No"],
            [3, "Yes", 5, 44000, "Yes"],
            [4, "No", 8, 58000, "No"],
            [2, "Yes", 2, 31000, "Yes"],
        ],
        columns=[
            "satisfaction",
            "overtime",
            "years_at_company",
            "monthly_income",
            "attrition",
        ],
    )

    data["overtime"] = data["overtime"].map({"No": 0, "Yes": 1})
    data["attrition"] = data["attrition"].map({"No": 0, "Yes": 1})

    features = [
        "satisfaction",
        "overtime",
        "years_at_company",
        "monthly_income",
    ]

    X = data[features]
    y = data["attrition"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.25,
        random_state=42,
        stratify=y,
    )

    model = RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        class_weight="balanced",
    )

    model.fit(X_train, y_train)
    predictions = model.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)

    report = classification_report(
        y_test,
        predictions,
        labels=[0, 1],
        target_names=["No Attrition", "Attrition"],
        zero_division=0,
    )

    matrix = confusion_matrix(
        y_test,
        predictions,
        labels=[0, 1],
    )

    # Keep the saved model format compatible with ml_service.py.
    joblib.dump(
        {
            "model": model,
            "features": features,
        },
        MODEL_PATH,
    )

    evaluation = (
        "WORKFORCE AI PRO - MODEL EVALUATION\n"
        "==================================\n"
        "Dataset: Synthetic prototype data\n"
        f"Total rows: {len(data)}\n"
        f"Training rows: {len(X_train)}\n"
        f"Testing rows: {len(X_test)}\n"
        f"Features: {', '.join(features)}\n"
        f"Accuracy: {accuracy:.2%}\n\n"
        "Classification Report:\n"
        f"{report}\n"
        "Confusion Matrix (rows=actual, columns=predicted):\n"
        f"{matrix}\n\n"
        "LIMITATIONS:\n"
        "- Dataset contains only 20 synthetic records.\n"
        "- Test set contains only 5 records.\n"
        "- Metrics do not establish real-world performance.\n"
        "- Predictions must not be used to make employment decisions.\n"
        "- Validate with suitable representative data before real use.\n"
    )

    REPORT_PATH.write_text(evaluation, encoding="utf-8")

    print(evaluation)
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Evaluation report saved to: {REPORT_PATH}")


if __name__ == "__main__":
    main()
