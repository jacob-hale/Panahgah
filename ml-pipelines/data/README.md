# Optional data files for ML pipeline notebooks

Place CSV/JSON exports here (or in the project root) so notebooks resolve them from `ml-pipelines/data/`.

| Notebook | Files |
|----------|--------|
| [`model_1_donor_lapse.ipynb`](../model_1_donor_lapse.ipynb) | `donations.csv`, `supporters.csv` |
| [`model_2_donor_upgrade.ipynb`](../model_2_donor_upgrade.ipynb) | `donations.csv`, `supporters.csv` |
| [`model_5_post_yield.ipynb`](../model_5_post_yield.ipynb) | `social_media_posts.csv` |
| [`model_7_girls_reintegration_readiness.ipynb`](../model_7_girls_reintegration_readiness.ipynb) | Optional `girls_reintegration_export.json` (notebook has synthetic fallback if missing) |

---

## Model 7 JSON

The notebook [`model_7_girls_reintegration_readiness.ipynb`](../model_7_girls_reintegration_readiness.ipynb) runs end-to-end with **built-in synthetic data** if this file is missing.

To train on **real** data shaped like production, save a JSON file here:

**Path:** `girls_reintegration_export.json`

**Shape:** Same top-level keys as the payload passed to `backend/ML/girls_reintegration_train.py` on stdin:

- `residents`, `safehouses`, `process_recordings`, `home_visitations`, `education_records`, `health_records`, `intervention_plans`, `incident_reports`
- Optional: `initiated_by` (string)

Column names should match what the C# service selects (see `GirlsReintegrationMlPipelineService.TrainAsync`).

**Working directory:** Run Jupyter with the project **repo root** or the **`ml-pipelines/`** folder so the notebook finds this path (`data/girls_reintegration_export.json` relative to `ml-pipelines`).

Do not commit large exports if they contain sensitive data; add `*.json` to `.gitignore` locally if needed.
