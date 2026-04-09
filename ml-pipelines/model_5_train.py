import argparse
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, PowerTransformer, StandardScaler


FEATURE_COLS = [
    "platform",
    "day_of_week",
    "post_hour",
    "post_type",
    "media_type",
    "num_hashtags",
    "mentions_count",
    "has_call_to_action",
    "call_to_action_type",
    "content_topic",
    "sentiment_tone",
    "caption_length",
    "features_resident_story",
    "campaign_name",
    "is_boosted",
    "boost_budget_php",
]


def time_split(df: pd.DataFrame, time_col: str, frac: float = 0.8):
    df = df.sort_values(time_col).copy()
    cut = int(len(df) * frac)
    return df.iloc[:cut].copy(), df.iloc[cut:].copy()


def build_preprocessor(X: pd.DataFrame):
    num_cols = [c for c in X.columns if pd.api.types.is_numeric_dtype(X[c])]
    cat_cols = [c for c in X.columns if c not in num_cols]
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifacts-dir", required=True)
    args = parser.parse_args()

    payload = json.loads(input())
    posts = payload.get("posts", [])
    if not posts:
        raise ValueError("No posts provided for training.")

    df = pd.DataFrame(posts)
    required = FEATURE_COLS + ["donation_referrals", "created_at"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")

    df = df[required].copy()
    df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce")
    df = df.dropna(subset=["created_at", "donation_referrals"])
    df["donation_referrals"] = pd.to_numeric(df["donation_referrals"], errors="coerce")
    df = df.dropna(subset=["donation_referrals"])

    if len(df) < 30:
        raise ValueError("Not enough rows to train (need at least 30).")

    train_df, test_df = time_split(df, "created_at", 0.8)
    X_train = train_df.drop(columns=["donation_referrals", "created_at"])
    y_train = train_df["donation_referrals"]
    X_test = test_df.drop(columns=["donation_referrals", "created_at"])
    y_test = test_df["donation_referrals"]

    pre = build_preprocessor(X_train)
    predictive = Pipeline(
        [("pre", pre), ("model", RandomForestRegressor(n_estimators=350, min_samples_leaf=4, random_state=42))]
    )
    explanatory = Pipeline([("pre", pre), ("model", LinearRegression())])

    predictive.fit(X_train, y_train)
    explanatory.fit(X_train, y_train)

    pred = predictive.predict(X_test)
    mse = mean_squared_error(y_test, pred)
    rmse = mse**0.5

    artifacts_dir = Path(args.artifacts_dir)
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    predictive_path = artifacts_dir / "model5_predictive.joblib"
    explanatory_path = artifacts_dir / "model5_explanatory.joblib"

    joblib.dump(predictive, predictive_path)
    joblib.dump(explanatory, explanatory_path)

    print(
        json.dumps(
            {
                "rows_used": int(len(df)),
                "train_rows": int(len(train_df)),
                "test_rows": int(len(test_df)),
                "mae": float(mean_absolute_error(y_test, pred)),
                "rmse": float(rmse),
                "r2": float(r2_score(y_test, pred)),
                "predictive_model_path": str(predictive_path),
                "explanatory_model_path": str(explanatory_path),
            }
        )
    )


if __name__ == "__main__":
    main()
