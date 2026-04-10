import argparse
import json
import re
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.base import clone
from sklearn.metrics import average_precision_score, f1_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split
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
    """Map free-text reintegration_status to 0/1. Unmapped values are excluded from supervised training."""
    s = normalize_status(status)
    if not s:
        return None
    # Multi-word phrases first (substring checks). Longer / more specific phrases before generic tokens.
    negative_phrases = (
        "high risk",
        "not ready",
        "not completed",
        "in progress",
        "pending review",
        "on hold",
        "on-hold",
        "preparation",
        "awaiting",
        "screening",
        "intake",
    )
    for phrase in negative_phrases:
        if phrase in s:
            return 0

    positive_phrases = (
        "successfully",
        "reintegration complete",
        "case closed",
        "closed successfully",
    )
    for phrase in positive_phrases:
        if phrase in s:
            return 1

    # Single-word tokens: use word tokens so "inactive" does not match "active".
    words = set(re.findall(r"[a-z0-9]+", s))

    positive_words = frozenset(
        {
            "ready",
            "readiness",
            "reintegrated",
            "reintegration",
            "successful",
            "success",
            "completed",
            "complete",
            "stable",
            "discharged",
            "graduated",
            "reunified",
            "restored",
            "transitioned",
            "transition",
            "closure",
            "closed",
            "achieved",
            "cleared",
            "exit",
            "reunification",
        }
    )
    negative_words = frozenset(
        {
            "pending",
            "reopened",
            "unsafe",
            "active",
            "ongoing",
            "enrolled",
            "current",
            "admitted",
            "withdrawn",
            "cancelled",
            "canceled",
            "suspended",
            "deferred",
            "delayed",
            "stalled",
            "paused",
            "monitoring",
            "hold",
            "waiting",
            "tbd",
            "unknown",
        }
    )
    if words & positive_words:
        return 1
    if words & negative_words:
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


def safe_metric_block(y_true, y_prob, y_pred, train_rows: int, test_rows: int, extras=None):
    positive_rate = float(np.mean(y_true)) if len(y_true) else 0.0
    roc_auc = float(roc_auc_score(y_true, y_prob)) if len(set(y_true)) > 1 else None
    out = {
        "roc_auc": roc_auc,
        "avg_precision": float(average_precision_score(y_true, y_prob)) if len(y_true) else 0.0,
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "test_positive_rate": positive_rate,
        "train_rows": int(train_rows),
        "test_rows": int(test_rows),
    }
    if extras:
        out.update(extras)
    return out


def _cv_fold_count(y: pd.Series, max_folds: int = 5) -> int:
    """Stratified k-fold size k: at most max_folds, at least 2, limited by minority class and n."""
    n = len(y)
    if n < 8:
        return 0
    vc = y.value_counts()
    if len(vc) < 2:
        return 0
    min_class = int(vc.min())
    n_splits = min(max_folds, min_class, max(2, n // 2))
    n_splits = max(2, int(n_splits))
    if n < n_splits * 2:
        n_splits = min(n_splits, n // 2)
    if n_splits < 2:
        return 0
    return n_splits


def _fold_metrics_one_split(y_true, y_prob):
    if len(y_true) == 0:
        return None, None, None
    if len(set(y_true)) < 2:
        return None, float(average_precision_score(y_true, y_prob)), float(
            f1_score(y_true, (y_prob >= 0.5).astype(int), zero_division=0)
        )
    return (
        float(roc_auc_score(y_true, y_prob)),
        float(average_precision_score(y_true, y_prob)),
        float(f1_score(y_true, (y_prob >= 0.5).astype(int), zero_division=0)),
    )


def best_f1_threshold(y_true, proba):
    best_t, best_f1 = 0.5, 0.0
    for t in np.linspace(0.05, 0.95, 19):
        pred = (proba >= t).astype(int)
        f1v = f1_score(y_true, pred, zero_division=0)
        if f1v > best_f1:
            best_f1, best_t = f1v, t
    return float(best_t), float(best_f1)


def stratified_cv_metrics_block(pipeline_template, x: pd.DataFrame, y: pd.Series, max_folds: int = 5):
    """Mean ± std over stratified folds; OOF probabilities for threshold tuning."""
    n_splits = _cv_fold_count(y, max_folds=max_folds)
    if n_splits < 2:
        return None

    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    aucs, aps, f1s = [], [], []
    for train_idx, val_idx in skf.split(x, y):
        pipe = clone(pipeline_template)
        pipe.fit(x.iloc[train_idx], y.iloc[train_idx])
        proba = pipe.predict_proba(x.iloc[val_idx])[:, 1]
        yt = y.iloc[val_idx]
        roc_m, ap_m, f1_m = _fold_metrics_one_split(yt, proba)
        if roc_m is not None:
            aucs.append(roc_m)
        if ap_m is not None:
            aps.append(ap_m)
        if f1_m is not None:
            f1s.append(f1_m)

    oof_proba = cross_val_predict(
        clone(pipeline_template), x, y, cv=skf, method="predict_proba", n_jobs=1
    )[:, 1]

    opt_t, opt_f1 = best_f1_threshold(y.values, oof_proba)

    fold_test_n = max(1, len(y) // n_splits)
    return {
        "roc_auc": float(np.mean(aucs)) if aucs else None,
        "roc_auc_std": float(np.std(aucs)) if len(aucs) > 1 else 0.0,
        "avg_precision": float(np.mean(aps)) if aps else 0.0,
        "avg_precision_std": float(np.std(aps)) if len(aps) > 1 else 0.0,
        "f1": opt_f1,
        "f1_cv_mean": float(np.mean(f1s)) if f1s else 0.0,
        "f1_cv_std": float(np.std(f1s)) if len(f1s) > 1 else 0.0,
        "optimal_threshold": opt_t,
        "test_positive_rate": float(np.mean(y)),
        "train_rows": int(len(y)),
        "test_rows": int(fold_test_n),
        "eval_mode": "stratified_cv",
        "cv_folds": int(n_splits),
    }


def rf_pipeline_from_x(x_train_df: pd.DataFrame):
    pre = build_preprocessor(x_train_df)
    return Pipeline(
        [
            ("pre", pre),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=300,
                    min_samples_leaf=3,
                    random_state=42,
                    class_weight="balanced_subsample",
                ),
            ),
        ]
    )


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
    parser.add_argument(
        "--min-labeled-rows",
        type=int,
        default=12,
        help="Minimum residents with mappable reintegration_status labels (both classes required).",
    )
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
    min_labeled = max(8, int(args.min_labeled_rows))
    if len(train_df) < min_labeled:
        raise ValueError(
            f"Need at least {min_labeled} labeled resident rows (reintegration_status) to train. "
            f"Currently {len(train_df)} labeled after mapping statuses."
        )
    if train_df["label"].nunique() < 2:
        raise ValueError(
            "Reintegration labels need both positive and negative classes. "
            f"Labeled rows: {len(train_df)}."
        )

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

    rf_template = rf_pipeline_from_x(x)
    cv_block = stratified_cv_metrics_block(rf_template, x, y, max_folds=5)

    if cv_block is not None:
        metrics = cv_block
    else:
        try:
            x_train_m, x_test_m, y_train_m, y_test_m = train_test_split(
                x, y, test_size=0.25, random_state=42, stratify=stratify_y
            )
        except ValueError:
            x_train_m, x_test_m, y_train_m, y_test_m = train_test_split(x, y, test_size=0.25, random_state=42)
        p_hold = rf_pipeline_from_x(x_train_m)
        p_hold.fit(x_train_m, y_train_m)
        prob_test = p_hold.predict_proba(x_test_m)[:, 1]
        opt_t, opt_f1 = best_f1_threshold(y_test_m.values, prob_test)
        pred_opt = (prob_test >= opt_t).astype(int)
        metrics = safe_metric_block(
            y_test_m,
            prob_test,
            pred_opt,
            len(x_train_m),
            len(x_test_m),
            {
                "eval_mode": "holdout_25pct",
                "optimal_threshold": opt_t,
                "roc_auc_std": None,
                "avg_precision_std": None,
                "f1_cv_mean": None,
                "f1_cv_std": None,
                "cv_folds": None,
            },
        )

    predictive = rf_pipeline_from_x(x)
    predictive.fit(x, y)
    explanatory = Pipeline(
        [("pre", build_preprocessor(x)), ("model", LogisticRegression(max_iter=2000, class_weight="balanced"))]
    )
    explanatory.fit(x, y)

    try:
        _, xi_te, _, yi_te = train_test_split(
            x, y, test_size=0.2, random_state=42, stratify=stratify_y
        )
    except ValueError:
        _, xi_te, _, yi_te = train_test_split(x, y, test_size=0.2, random_state=42)
    key_features = top_features_block(predictive, xi_te, yi_te)

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

    def unmapped_status_samples(df_base, limit=25):
        m = df_base[df_base["label"].isna() & df_base["reintegration_status"].notna()]
        if m.empty:
            return []
        raw = m["reintegration_status"].dropna().astype(str).str.strip()
        uniq = sorted(set(raw.tolist()))
        return uniq[:limit]

    label_audit = {
        "labeled_negative": int((train_df["label"] == 0).sum()),
        "labeled_positive": int((train_df["label"] == 1).sum()),
        "unmapped_status_samples": unmapped_status_samples(base),
    }

    duration_ms = int((time.time() - started) * 1000)
    warnings_out = []
    if len(train_df) < 30:
        warnings_out.append(
            f"Only {len(train_df)} labeled residents: metrics may be unstable; aim for 30+ for production confidence."
        )
    unlabeled_n = int(base["label"].isna().sum())
    if unlabeled_n > 0:
        warnings_out.append(
            f"{unlabeled_n} residents had reintegration_status values that did not map to a label and were scored but not used for training."
        )

    output = {
        "readiness_distribution": {
            "high_count": int(counts.get("High", 0)),
            "medium_count": int(counts.get("Medium", 0)),
            "low_count": int(counts.get("Low", 0)),
        },
        "top_resident_worklist": top_rows,
        "key_features": key_features,
        "model_metrics": metrics,
        "label_audit": label_audit,
        "pipeline_health": {
            "status": "ok",
            "last_trained_at_utc": pd.Timestamp.utcnow().isoformat(),
            "last_run_duration_ms": duration_ms,
            "rows_used": int(len(train_df)),
            "initiated_by": str(payload.get("initiated_by", "manual")),
            "warnings": warnings_out,
        },
    }

    artifacts_dir = Path(args.artifacts_dir)
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    (artifacts_dir / "girls_reintegration_mlr_latest.json").write_text(json.dumps(output), encoding="utf-8")
    print(json.dumps(output))


if __name__ == "__main__":
    main()
