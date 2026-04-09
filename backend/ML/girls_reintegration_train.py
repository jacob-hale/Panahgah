import argparse
import json
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


def safe_float(v, default=0.0):
    try:
        return float(v)
    except Exception:
        return default


def parse_numeric_from_text(v, default=0.0):
    if v is None:
        return default
    if isinstance(v, (int, float)):
        return float(v)
    text = str(v)
    digits = "".join(ch for ch in text if ch.isdigit() or ch == ".")
    if not digits:
        return default
    try:
        return float(digits)
    except Exception:
        return default


def normalize_status(v: str) -> str:
    if v is None:
        return ""
    return str(v).strip().lower()


def readiness_label(status: str):
    s = normalize_status(status)
    if not s:
        return None
    positive_tokens = ("ready", "reintegrated", "successful", "completed", "stable")
    negative_tokens = ("high risk", "not ready", "pending", "reopened", "unsafe")
    if any(token in s for token in positive_tokens):
        return 1
    if any(token in s for token in negative_tokens):
        return 0
    return None


def build_preprocessor(df: pd.DataFrame):
    numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    categorical_cols = [c for c in df.columns if c not in numeric_cols]
    return ColumnTransformer(
        [
            (
                "num",
                Pipeline(
                    [
                        ("imp", SimpleImputer(strategy="median")),
                        ("sc", StandardScaler()),
                    ]
                ),
                numeric_cols,
            ),
            (
                "cat",
                Pipeline(
                    [
                        ("imp", SimpleImputer(strategy="most_frequent")),
                        ("ohe", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical_cols,
            ),
        ]
    )


def safe_metric_block(y_true, y_prob, y_pred, train_rows: int, test_rows: int):
    positive_rate = float(np.mean(y_true)) if len(y_true) else 0.0
    roc_auc = float(roc_auc_score(y_true, y_prob)) if len(set(y_true)) > 1 else None
    return {
        "roc_auc": roc_auc,
        "avg_precision": float(average_precision_score(y_true, y_prob)) if len(y_true) else 0.0,
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "test_positive_rate": positive_rate,
        "train_rows": int(train_rows),
        "test_rows": int(test_rows),
    }


def top_features_block(model, x_test, y_test):
    imp = permutation_importance(model, x_test, y_test, n_repeats=8, random_state=42)
    df = pd.DataFrame({"feature": x_test.columns, "importance": imp.importances_mean})
    top = df.sort_values("importance", ascending=False).head(8)
    return [
        {"feature": str(row["feature"]), "importance": safe_float(row["importance"])}
        for _, row in top.iterrows()
    ]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifacts-dir", required=True)
    args = parser.parse_args()
    started = time.time()

    payload = json.loads(input())
    residents = pd.DataFrame(payload.get("residents", []))
    safehouses = pd.DataFrame(payload.get("safehouses", []))
    process_recordings = pd.DataFrame(payload.get("process_recordings", []))
    home_visitations = pd.DataFrame(payload.get("home_visitations", []))
    education_records = pd.DataFrame(payload.get("education_records", []))
    health_records = pd.DataFrame(payload.get("health_records", []))
    intervention_plans = pd.DataFrame(payload.get("intervention_plans", []))
    incident_reports = pd.DataFrame(payload.get("incident_reports", []))

    if residents.empty:
        raise ValueError("Need resident rows to train reintegration model.")

    if not education_records.empty:
        for col in ["attendance_rate", "progress_percent", "gpa_like_score"]:
            if col not in education_records.columns:
                education_records[col] = np.nan
            education_records[col] = pd.to_numeric(education_records[col], errors="coerce")

    if not health_records.empty:
        for col in ["nutrition_score", "sleep_score", "energy_score", "general_health_score"]:
            if col not in health_records.columns:
                health_records[col] = np.nan
            health_records[col] = pd.to_numeric(health_records[col], errors="coerce")

    # Build feature table.
    base = residents.copy()
    base["resident_code"] = base["internal_code"].fillna("")
    base["present_age_num"] = base["present_age"].apply(parse_numeric_from_text)
    base["length_of_stay_num"] = base["length_of_stay"].apply(parse_numeric_from_text)
    base["label"] = base["reintegration_status"].apply(readiness_label)

    if not safehouses.empty:
        safehouse_map = safehouses.rename(columns={"name": "safehouse_name"})[["safehouse_id", "safehouse_code", "safehouse_name"]]
        base = base.merge(safehouse_map, on="safehouse_id", how="left")
    else:
        base["safehouse_code"] = "Unknown"
        base["safehouse_name"] = "Unknown"

    def agg_count(df, col_name):
        if df.empty:
            return pd.DataFrame({"resident_id": [], col_name: []})
        return df.groupby("resident_id").size().reset_index(name=col_name)

    def agg_mean(df, value_cols):
        if df.empty:
            data = {"resident_id": []}
            for c in value_cols:
                data[c] = []
            return pd.DataFrame(data)
        return df.groupby("resident_id")[value_cols].mean().reset_index()

    proc_counts = agg_count(process_recordings, "process_recordings_count")
    visit_counts = agg_count(home_visitations, "home_visitations_count")
    intervention_counts = agg_count(intervention_plans, "intervention_plans_count")
    incident_counts = agg_count(incident_reports, "incident_reports_count")

    base = base.merge(proc_counts, on="resident_id", how="left")
    base = base.merge(visit_counts, on="resident_id", how="left")
    base = base.merge(intervention_counts, on="resident_id", how="left")
    base = base.merge(incident_counts, on="resident_id", how="left")

    if not process_recordings.empty:
        p = process_recordings.copy()
        p["session_duration_minutes"] = pd.to_numeric(p["session_duration_minutes"], errors="coerce")
        p["progress_noted"] = p["progress_noted"].fillna(False).astype(int)
        p["concerns_flagged"] = p["concerns_flagged"].fillna(False).astype(int)
        p["referral_made"] = p["referral_made"].fillna(False).astype(int)
        p_means = p.groupby("resident_id")[["session_duration_minutes", "progress_noted", "concerns_flagged", "referral_made"]].mean().reset_index()
        base = base.merge(p_means, on="resident_id", how="left")

    if not home_visitations.empty:
        v = home_visitations.copy()
        v["follow_up_needed"] = v["follow_up_needed"].fillna(False).astype(int)
        v["safety_concerns_noted"] = v["safety_concerns_noted"].fillna(False).astype(int)
        v_means = v.groupby("resident_id")[["follow_up_needed", "safety_concerns_noted"]].mean().reset_index()
        base = base.merge(v_means, on="resident_id", how="left")

    if not education_records.empty:
        e_means = agg_mean(education_records, ["attendance_rate", "progress_percent", "gpa_like_score"])
        base = base.merge(e_means, on="resident_id", how="left")

    if not health_records.empty:
        h_means = agg_mean(health_records, ["nutrition_score", "sleep_score", "energy_score", "general_health_score"])
        base = base.merge(h_means, on="resident_id", how="left")

    if not incident_reports.empty:
        i = incident_reports.copy()
        i["resolved"] = i["resolved"].fillna(False).astype(int)
        i["high_severity"] = i["severity"].astype(str).str.lower().isin(["high", "critical", "severe"]).astype(int)
        i_means = i.groupby("resident_id")[["resolved", "high_severity"]].mean().reset_index()
        base = base.merge(i_means, on="resident_id", how="left")

    for col in [
        "process_recordings_count",
        "home_visitations_count",
        "intervention_plans_count",
        "incident_reports_count",
    ]:
        if col not in base.columns:
            base[col] = 0
        base[col] = base[col].fillna(0)

    train_df = base.dropna(subset=["label"]).copy()
    if len(train_df) < 30:
        raise ValueError("Need at least 30 labeled resident rows (reintegration_status) to train.")
    if train_df["label"].nunique() < 2:
        raise ValueError("Reintegration labels need both positive and negative classes.")

    features = [
        "safehouse_code",
        "case_status",
        "case_category",
        "current_risk_level",
        "initial_risk_level",
        "reintegration_type",
        "present_age_num",
        "length_of_stay_num",
        "process_recordings_count",
        "home_visitations_count",
        "intervention_plans_count",
        "incident_reports_count",
        "session_duration_minutes",
        "progress_noted",
        "concerns_flagged",
        "referral_made",
        "follow_up_needed",
        "safety_concerns_noted",
        "attendance_rate",
        "progress_percent",
        "gpa_like_score",
        "nutrition_score",
        "sleep_score",
        "energy_score",
        "general_health_score",
        "resolved",
        "high_severity",
    ]
    for col in features:
        if col not in train_df.columns:
            train_df[col] = np.nan
            base[col] = np.nan

    x = train_df[features]
    y = train_df["label"].astype(int)
    stratify_y = y if y.nunique() > 1 else None
    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.25, random_state=42, stratify=stratify_y
    )

    pre = build_preprocessor(x_train)
    predictive = Pipeline(
        [("pre", pre), ("model", RandomForestClassifier(n_estimators=300, min_samples_leaf=3, random_state=42))]
    )
    explanatory = Pipeline(
        [("pre", pre), ("model", LogisticRegression(max_iter=2000, class_weight="balanced"))]
    )
    predictive.fit(x_train, y_train)
    explanatory.fit(x_train, y_train)

    prob_test = predictive.predict_proba(x_test)[:, 1]
    pred_test = (prob_test >= 0.5).astype(int)
    metrics = safe_metric_block(y_test, prob_test, pred_test, len(x_train), len(x_test))
    key_features = top_features_block(predictive, x_test, y_test)

    all_features = base[features].copy()
    base["readiness_score"] = predictive.predict_proba(all_features)[:, 1]
    base["readiness_band"] = pd.cut(
        base["readiness_score"],
        bins=[-0.001, 0.35, 0.65, 1.0],
        labels=["Low", "Medium", "High"],
    ).astype(str)

    counts = base["readiness_band"].value_counts(dropna=False)
    worklist = base.sort_values("readiness_score", ascending=False).head(20)
    top_rows = []
    for _, row in worklist.iterrows():
        top_rows.append(
            {
                "resident_id": int(row["resident_id"]),
                "resident_code": str(row.get("resident_code") or f"Resident #{int(row['resident_id'])}"),
                "safehouse": str(row.get("safehouse_code") or row.get("safehouse_name") or "Unknown"),
                "readiness_score": safe_float(row["readiness_score"]),
                "readiness_band": str(row["readiness_band"]),
                "process_recordings_count": int(safe_float(row.get("process_recordings_count"), 0)),
                "home_visitations_count": int(safe_float(row.get("home_visitations_count"), 0)),
                "intervention_plans_count": int(safe_float(row.get("intervention_plans_count"), 0)),
                "incident_reports_count": int(safe_float(row.get("incident_reports_count"), 0)),
            }
        )

    duration_ms = int((time.time() - started) * 1000)
    output = {
        "readiness_distribution": {
            "high_count": int(counts.get("High", 0)),
            "medium_count": int(counts.get("Medium", 0)),
            "low_count": int(counts.get("Low", 0)),
        },
        "top_resident_worklist": top_rows,
        "key_features": key_features,
        "model_metrics": metrics,
        "pipeline_health": {
            "status": "ok",
            "last_trained_at_utc": pd.Timestamp.utcnow().isoformat(),
            "last_run_duration_ms": duration_ms,
            "rows_used": int(len(train_df)),
            "initiated_by": str(payload.get("initiated_by", "manual")),
            "warnings": [],
        },
    }

    artifacts_dir = Path(args.artifacts_dir)
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    (artifacts_dir / "girls_reintegration_mlr_latest.json").write_text(json.dumps(output), encoding="utf-8")
    print(json.dumps(output))


if __name__ == "__main__":
    main()
