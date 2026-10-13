from typing import List, Optional
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for headless environments
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix


def generate_confusion_matrix(
    y_true: List[int],
    y_pred: List[int],
    class_names: List[str],
    save_path: Optional[str] = None
) -> np.ndarray:
    """
    Computes confusion matrix and optionally exports a publication-ready heatmap plot.
    """
    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(class_names))))

    if save_path:
        size = max(10, len(class_names) * 0.45)
        plt.figure(figsize=(size, size * 0.85))
        plt.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
        plt.title("Confusion Matrix - Ingredient Recognition Model")
        plt.colorbar()

        tick_marks = np.arange(len(class_names))
        plt.xticks(tick_marks, class_names, rotation=45, ha="right")
        plt.yticks(tick_marks, class_names)

        # Annotate numbers
        thresh = cm.max() / 2.0 if cm.max() > 0 else 1.0
        for i in range(cm.shape[0]):
            for j in range(cm.shape[1]):
                plt.text(
                    j, i, format(cm[i, j], "d"),
                    horizontalalignment="center",
                    verticalalignment="center",
                    fontsize=7 if len(class_names) > 15 else 10,
                    color="white" if cm[i, j] > thresh else "black"
                )

        plt.tight_layout()
        plt.ylabel("True Label")
        plt.xlabel("Predicted Label")

        out_path = Path(save_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(str(out_path), dpi=150)
        plt.close()
        print(f"[OK] Saved confusion matrix plot to {save_path}")

    return cm
