import argparse
import json
from pathlib import Path

import joblib
import pandas as pd


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


def _to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-path", required=True)
    args = parser.parse_args()

    model_path = Path(args.model_path)
    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")

    payload = json.loads(input())
    posts = payload.get("posts", [])
    if not posts:
        print(
            json.dumps(
                {
                    "baseline_expected_referrals": 0.0,
                    "best_windows": [],
                    "best_post_type_by_platform": [],
                    "story_effect": {
                        "with_story_avg": 0.0,
                        "without_story_avg": 0.0,
                        "with_story_count": 0,
                        "without_story_count": 0,
                    },
                }
            )
        )
        return

    df = pd.DataFrame(posts)
    for col in FEATURE_COLS:
        if col not in df.columns:
            df[col] = None

    model = joblib.load(model_path)
    feature_df = df[FEATURE_COLS].copy()
    preds = model.predict(feature_df)
    df["pred_referrals"] = preds

    baseline = float(df["pred_referrals"].mean())

    win_tbl = (
        df.groupby(["day_of_week", "post_hour"], dropna=False)["pred_referrals"]
        .mean()
        .sort_values(ascending=False)
        .reset_index()
        .head(5)
    )
    win_tbl["uplift_pct"] = (
        ((win_tbl["pred_referrals"] / baseline) - 1.0) * 100 if baseline > 0 else 0.0
    )

    ptype_tbl = (
        df.groupby(["platform", "post_type"], dropna=False)["pred_referrals"]
        .mean()
        .sort_values(ascending=False)
        .reset_index()
    )
    best_by_platform = ptype_tbl.groupby("platform", as_index=False).head(1).copy()
    best_by_platform["uplift_pct"] = (
        ((best_by_platform["pred_referrals"] / baseline) - 1.0) * 100
        if baseline > 0
        else 0.0
    )

    story_yes = df[df["features_resident_story"] == True]["pred_referrals"]  # noqa: E712
    story_no = df[df["features_resident_story"] != True]["pred_referrals"]  # noqa: E712

    out = {
        "baseline_expected_referrals": baseline,
        "best_windows": [
            {
                "day_of_week": str(row["day_of_week"]),
                "post_hour": int(row["post_hour"]) if pd.notna(row["post_hour"]) else None,
                "avg_referrals": _to_float(row["pred_referrals"]),
                "uplift_pct": _to_float(row["uplift_pct"]),
            }
            for _, row in win_tbl.iterrows()
        ],
        "best_post_type_by_platform": [
            {
                "platform": str(row["platform"]),
                "post_type": str(row["post_type"]),
                "avg_referrals": _to_float(row["pred_referrals"]),
                "uplift_pct": _to_float(row["uplift_pct"]),
            }
            for _, row in best_by_platform.iterrows()
        ],
        "story_effect": {
            "with_story_avg": float(story_yes.mean()) if len(story_yes) else 0.0,
            "without_story_avg": float(story_no.mean()) if len(story_no) else 0.0,
            "with_story_count": int(len(story_yes)),
            "without_story_count": int(len(story_no)),
        },
    }

    print(json.dumps(out))


if __name__ == "__main__":
    main()
