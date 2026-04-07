import argparse
import json
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, f1_score, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, PowerTransformer, StandardScaler


def time_split(df: pd.DataFrame, time_col: str, frac: float = 0.8):
    df = df.sort_values(time_col).copy()
    cut = int(len(df) * frac)
    return df.iloc[:cut].copy(), df.iloc[cut:].copy()


def build_preprocessor(x: pd.DataFrame):
    num_cols = [c for c in x.columns if pd.api.types.is_numeric_dtype(x[c])]
    cat_cols = [c for c in x.columns if c not in num_cols]
    return ColumnTransformer(
        [
            (
                "num",
                Pipeline(
                    [
                        ("imp", SimpleImputer(strategy="median")),
                        ("pow", PowerTransformer(method="yeo-johnson", standardize=False)),
                        ("sc", StandardScaler()),
                    ]
                ),
                num_cols,
            ),
            (
                "cat",
                Pipeline(
                    [
                        ("imp", SimpleImputer(strategy="most_frequent")),
                        ("ohe", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                cat_cols,
            ),
        ]
    )


def safe_float(v, default=0.0):
    try:
        return float(v)
    except Exception:
        return default


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


def top_feature_block(pipeline, x_test, y_test):
    imp = permutation_importance(pipeline, x_test, y_test, n_repeats=8, random_state=42)
    feature_rows = pd.DataFrame({"feature": x_test.columns, "importance": imp.importances_mean})
    top = feature_rows.sort_values("importance", ascending=False).head(5)
    return [
        {"feature": str(row["feature"]), "importance": safe_float(row["importance"])}
        for _, row in top.iterrows()
    ]


def summarize_scores(scored: pd.DataFrame, score_col: str, top_n: int = 20):
    scored = scored.copy()
    scored["band"] = pd.cut(scored[score_col], bins=[-0.001, 0.35, 0.65, 1.0], labels=["Low", "Medium", "High"])
    counts = scored["band"].value_counts(dropna=False)
    seg = (
        scored.groupby(["supporter_type", "acquisition_channel"], dropna=False)[score_col]
        .mean()
        .reset_index()
        .sort_values(score_col, ascending=False)
        .head(5)
    )
    return {
        "low_count": int(counts.get("Low", 0)),
        "medium_count": int(counts.get("Medium", 0)),
        "high_count": int(counts.get("High", 0)),
        "top_count": int(min(top_n, len(scored))),
        "top_segments": [
            {
                "supporter_type": str(row["supporter_type"]) if pd.notna(row["supporter_type"]) else "Unknown",
                "acquisition_channel": str(row["acquisition_channel"]) if pd.notna(row["acquisition_channel"]) else "Unknown",
                "avg_score": safe_float(row[score_col]),
            }
            for _, row in seg.iterrows()
        ],
        "top_donors": [],
    }


def train_lapse(donations: pd.DataFrame, supporters: pd.DataFrame):
    rows = []
    d = donations.sort_values(["supporter_id", "donation_date"]).copy()
    for sid, g in d.groupby("supporter_id"):
        g = g.reset_index(drop=True)
        for i in range(1, len(g) - 1):
            snapshot_date = g.loc[i, "donation_date"]
            hist = g.loc[:i]
            future = g.loc[i + 1 :]
            has_future_90 = (
                (future["donation_date"] > snapshot_date)
                & (future["donation_date"] <= snapshot_date + pd.Timedelta(days=90))
            ).any()
            rows.append(
                {
                    "supporter_id": sid,
                    "snapshot_date": snapshot_date,
                    "label": int(not has_future_90),
                    "days_since_last_donation": (snapshot_date - hist["donation_date"].max()).days,
                    "donation_count_hist": len(hist),
                    "sum_estimated_value_hist": hist["estimated_value"].fillna(0).sum(),
                    "avg_estimated_value_hist": hist["estimated_value"].fillna(0).mean(),
                    "recurring_rate_hist": hist["is_recurring"].astype(int).mean(),
                    "monetary_share_hist": (hist["donation_type"] == "Monetary").mean(),
                    "social_channel_share_hist": (hist["channel_source"] == "SocialMedia").mean(),
                }
            )

    m = pd.DataFrame(rows).merge(
        supporters[["supporter_id", "supporter_type", "relationship_type", "region", "country", "acquisition_channel"]],
        on="supporter_id",
        how="left",
    )
    if len(m) < 40:
        raise ValueError("Not enough donor lapse rows to train (need at least 40).")

    train_df, test_df = time_split(m, "snapshot_date", 0.8)
    x_train = train_df.drop(columns=["label", "snapshot_date"])
    y_train = train_df["label"]
    x_test = test_df.drop(columns=["label", "snapshot_date"])
    y_test = test_df["label"]
    if y_train.nunique() < 2 or y_test.nunique() < 2:
        raise ValueError("Donor lapse data needs both classes in train and test splits.")

    pre = build_preprocessor(x_train)
    predictive = Pipeline([("pre", pre), ("model", RandomForestClassifier(n_estimators=300, min_samples_leaf=4, random_state=42))])
    explanatory = Pipeline([("pre", pre), ("model", LogisticRegression(max_iter=2000, class_weight="balanced"))])
    predictive.fit(x_train, y_train)
    explanatory.fit(x_train, y_train)

    prob = predictive.predict_proba(x_test)[:, 1]
    pred = (prob >= 0.5).astype(int)

    scored = m.copy()
    features = [c for c in scored.columns if c not in ["label", "snapshot_date"]]
    scored["score"] = predictive.predict_proba(scored[features])[:, 1]
    top_donors = scored.sort_values("score", ascending=False).head(20)
    summary = summarize_scores(scored, "score")
    summary["top_donors"] = [
        {
            "supporter_id": int(row["supporter_id"]),
            "score": safe_float(row["score"]),
            "supporter_type": str(row["supporter_type"]) if pd.notna(row["supporter_type"]) else "Unknown",
            "acquisition_channel": str(row["acquisition_channel"]) if pd.notna(row["acquisition_channel"]) else "Unknown",
            "days_since_last_donation": safe_float(row["days_since_last_donation"], None),
            "donation_count_hist": safe_float(row["donation_count_hist"], None),
            "avg_estimated_value_hist": safe_float(row["avg_estimated_value_hist"], None),
            "hist_median_amount": None,
            "suggested_ask_floor": None,
            "suggested_ask_ceiling": None,
        }
        for _, row in top_donors.iterrows()
    ]
    summary["metrics"] = safe_metric_block(y_test, prob, pred, len(train_df), len(test_df))
    summary["key_features"] = top_feature_block(predictive, x_test, y_test)
    summary["ask_ladder_summary"] = {"suggested_ask_floor_avg": 0.0, "suggested_ask_ceiling_avg": 0.0}
    return predictive, explanatory, summary, len(m)


def train_upgrade(donations: pd.DataFrame, supporters: pd.DataFrame):
    m = donations[donations["donation_type"] == "Monetary"].sort_values(["supporter_id", "donation_date"]).copy()
    m["amount"] = pd.to_numeric(m["amount"], errors="coerce")
    rows = []
    for sid, g in m.groupby("supporter_id"):
        g = g.reset_index(drop=True)
        if len(g) < 3:
            continue
        for i in range(1, len(g) - 1):
            snapshot_date = g.loc[i, "donation_date"]
            hist = g.loc[:i]
            next_amt = g.loc[i + 1, "amount"]
            baseline = hist["amount"].median()
            if pd.isna(next_amt) or pd.isna(baseline):
                continue
            rows.append(
                {
                    "supporter_id": sid,
                    "snapshot_date": snapshot_date,
                    "label": int(next_amt > baseline),
                    "hist_median_amount": baseline,
                    "hist_mean_amount": hist["amount"].mean(),
                    "hist_std_amount": hist["amount"].std(),
                    "gift_count_hist": len(hist),
                    "recurring_rate_hist": hist["is_recurring"].astype(int).mean(),
                    "social_channel_share_hist": (hist["channel_source"] == "SocialMedia").mean(),
                }
            )

    m2 = pd.DataFrame(rows).merge(
        supporters[["supporter_id", "supporter_type", "relationship_type", "region", "country", "acquisition_channel"]],
        on="supporter_id",
        how="left",
    )
    if len(m2) < 40:
        raise ValueError("Not enough donor upgrade rows to train (need at least 40).")

    train_df, test_df = time_split(m2, "snapshot_date", 0.8)
    x_train = train_df.drop(columns=["label", "snapshot_date"])
    y_train = train_df["label"]
    x_test = test_df.drop(columns=["label", "snapshot_date"])
    y_test = test_df["label"]
    if y_train.nunique() < 2 or y_test.nunique() < 2:
        raise ValueError("Donor upgrade data needs both classes in train and test splits.")

    pre = build_preprocessor(x_train)
    predictive = Pipeline([("pre", pre), ("model", RandomForestClassifier(n_estimators=300, min_samples_leaf=4, random_state=42))])
    explanatory = Pipeline([("pre", pre), ("model", LogisticRegression(max_iter=2000, class_weight="balanced"))])
    predictive.fit(x_train, y_train)
    explanatory.fit(x_train, y_train)

    prob = predictive.predict_proba(x_test)[:, 1]
    pred = (prob >= 0.5).astype(int)

    scored = m2.copy()
    features = [c for c in scored.columns if c not in ["label", "snapshot_date"]]
    scored["score"] = predictive.predict_proba(scored[features])[:, 1]
    cands = scored.sort_values("score", ascending=False).head(20).copy()
    cands["ask_floor"] = cands["hist_median_amount"] * 1.10
    cands["ask_ceiling"] = cands["hist_median_amount"] * 1.30

    summary = summarize_scores(scored, "score")
    summary["top_donors"] = [
        {
            "supporter_id": int(row["supporter_id"]),
            "score": safe_float(row["score"]),
            "supporter_type": str(row["supporter_type"]) if pd.notna(row["supporter_type"]) else "Unknown",
            "acquisition_channel": str(row["acquisition_channel"]) if pd.notna(row["acquisition_channel"]) else "Unknown",
            "days_since_last_donation": None,
            "donation_count_hist": safe_float(row["gift_count_hist"], None),
            "avg_estimated_value_hist": None,
            "hist_median_amount": safe_float(row["hist_median_amount"], None),
            "suggested_ask_floor": safe_float(row["ask_floor"], None),
            "suggested_ask_ceiling": safe_float(row["ask_ceiling"], None),
        }
        for _, row in cands.iterrows()
    ]
    summary["metrics"] = safe_metric_block(y_test, prob, pred, len(train_df), len(test_df))
    summary["key_features"] = top_feature_block(predictive, x_test, y_test)
    summary["ask_ladder_summary"] = {
        "suggested_ask_floor_avg": safe_float(cands["ask_floor"].mean()),
        "suggested_ask_ceiling_avg": safe_float(cands["ask_ceiling"].mean()),
    }
    return predictive, explanatory, summary, len(m2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifacts-dir", required=True)
    args = parser.parse_args()
    started = time.time()

    payload = json.loads(input())
    donations = pd.DataFrame(payload.get("donations", []))
    supporters = pd.DataFrame(payload.get("supporters", []))
    if donations.empty or supporters.empty:
        raise ValueError("Need non-empty donations and supporters payloads.")

    required_donation_cols = {
        "supporter_id",
        "donation_date",
        "estimated_value",
        "is_recurring",
        "donation_type",
        "channel_source",
        "amount",
    }
    required_supporter_cols = {
        "supporter_id",
        "supporter_type",
        "relationship_type",
        "region",
        "country",
        "acquisition_channel",
    }
    miss_don = sorted(required_donation_cols.difference(donations.columns))
    miss_sup = sorted(required_supporter_cols.difference(supporters.columns))
    if miss_don or miss_sup:
        raise ValueError(f"Missing columns - donations: {miss_don}; supporters: {miss_sup}")

    donations["donation_date"] = pd.to_datetime(donations["donation_date"], errors="coerce")
    donations = donations.dropna(subset=["donation_date"]).copy()
    donations["estimated_value"] = pd.to_numeric(donations["estimated_value"], errors="coerce").fillna(0.0)
    donations["is_recurring"] = donations["is_recurring"].fillna(False).astype(bool)

    lapse_pred, lapse_expl, lapse_summary, lapse_rows = train_lapse(donations, supporters)
    up_pred, up_expl, upgrade_summary, upgrade_rows = train_upgrade(donations, supporters)

    artifacts_dir = Path(args.artifacts_dir)
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(lapse_pred, artifacts_dir / "model1_predictive.joblib")
    joblib.dump(lapse_expl, artifacts_dir / "model1_explanatory.joblib")
    joblib.dump(up_pred, artifacts_dir / "model2_predictive.joblib")
    joblib.dump(up_expl, artifacts_dir / "model2_explanatory.joblib")

    duration_ms = int((time.time() - started) * 1000)
    output = {
        "donor_lapse": lapse_summary,
        "donor_upgrade": upgrade_summary,
        "pipeline_health": {
            "status": "ok",
            "last_trained_at_utc": pd.Timestamp.utcnow().isoformat(),
            "last_run_duration_ms": duration_ms,
            "rows_used_lapse": int(lapse_rows),
            "rows_used_upgrade": int(upgrade_rows),
            "initiated_by": str(payload.get("initiated_by", "manual")),
            "warnings": [],
        },
    }
    output_path = artifacts_dir / "donor_mlr_latest.json"
    output_path.write_text(json.dumps(output), encoding="utf-8")
    print(json.dumps(output))


if __name__ == "__main__":
    main()
