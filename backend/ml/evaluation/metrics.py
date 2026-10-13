from typing import Dict, Any, List
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report


def calculate_evaluation_metrics(
    y_true: List[int],
    y_pred: List[int],
    class_names: List[str]
) -> Dict[str, Any]:
    """
    Calculate performance metrics required for MCA final-year project evaluation:
    - Overall Accuracy
    - Macro & Weighted Precision
    - Macro & Weighted Recall
    - Macro & Weighted F1-score
    - Per-class breakdown report
    """
    present = sorted(set(y_true))
    labels = list(range(len(class_names)))
    acc = accuracy_score(y_true, y_pred)
    prec_macro = precision_score(y_true, y_pred, labels=present, average="macro", zero_division=0)
    prec_weighted = precision_score(y_true, y_pred, labels=present, average="weighted", zero_division=0)
    rec_macro = recall_score(y_true, y_pred, labels=present, average="macro", zero_division=0)
    rec_weighted = recall_score(y_true, y_pred, labels=present, average="weighted", zero_division=0)
    f1_macro = f1_score(y_true, y_pred, labels=present, average="macro", zero_division=0)
    f1_weighted = f1_score(y_true, y_pred, labels=present, average="weighted", zero_division=0)

    report_dict = classification_report(
        y_true,
        y_pred,
        labels=labels,
        target_names=class_names,
        output_dict=True,
        zero_division=0
    )

    return {
        "accuracy": round(float(acc), 4),
        "precision_macro": round(float(prec_macro), 4),
        "precision_weighted": round(float(prec_weighted), 4),
        "recall_macro": round(float(rec_macro), 4),
        "recall_weighted": round(float(rec_weighted), 4),
        "f1_macro": round(float(f1_macro), 4),
        "f1_weighted": round(float(f1_weighted), 4),
        "classification_report": report_dict
    }
