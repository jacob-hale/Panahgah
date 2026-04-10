import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';

const SMALL_SAMPLE_ROWS_USED = 30;
const SMALL_SAMPLE_TEST_ROWS = 15;

type GirlsReintegrationInsights = {
  readiness_distribution: {
    high_count: number;
    medium_count: number;
    low_count: number;
  };
  top_resident_worklist: {
    resident_id: number;
    resident_code: string;
    safehouse: string;
    readiness_score: number;
    readiness_band: string;
    process_recordings_count: number;
    home_visitations_count: number;
    intervention_plans_count: number;
    incident_reports_count: number;
  }[];
  key_features: { feature: string; importance: number }[];
  model_metrics: {
    roc_auc?: number | null;
    roc_auc_std?: number | null;
    avg_precision: number;
    avg_precision_std?: number | null;
    f1: number;
    f1_cv_mean?: number | null;
    f1_cv_std?: number | null;
    optimal_threshold?: number | null;
    test_positive_rate: number;
    train_rows: number;
    test_rows: number;
    eval_mode?: string | null;
    cv_folds?: number | null;
  };
  label_audit?: {
    labeled_negative: number;
    labeled_positive: number;
    unmapped_status_samples: string[];
  };
  pipeline_health: {
    status: string;
    last_trained_at_utc?: string | null;
    last_run_duration_ms?: number | null;
    rows_used?: number | null;
    warnings?: string[] | null;
  };
};

export function GirlsReintegrationInsightsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GirlsReintegrationInsights | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiFetch<GirlsReintegrationInsights>('/api/ml/girls-reintegration/insights'));
    } catch {
      setError('Unable to load resident reintegration insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const notTrained = !data || data.pipeline_health?.status !== 'ok';

  const rowsUsed = data?.pipeline_health?.rows_used ?? 0;
  const testRows = data?.model_metrics?.test_rows ?? 0;
  const showSmallSampleBanner =
    !notTrained &&
    data &&
    (rowsUsed < SMALL_SAMPLE_ROWS_USED || testRows < SMALL_SAMPLE_TEST_ROWS);

  return (
    <section>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Resident reintegration insights
          </li>
        </ol>
      </nav>

      <h1 className="h3 mb-2">Resident reintegration insights</h1>
      <p className="text-body-secondary">
        Reintegration-readiness scoring to prioritize case conference worklists and intervention planning.
      </p>

      {loading ? <p>Loading resident reintegration insights...</p> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {!loading && !error && notTrained ? (
        <div className="alert alert-warning">Model not trained yet. Run retraining to generate insights.</div>
      ) : null}

      {!loading && !error && showSmallSampleBanner ? (
        <div className="alert alert-info" role="status">
          Labeled sample size is small (rows used: {rowsUsed}
          {data?.model_metrics?.eval_mode === 'stratified_cv'
            ? `, ${data.model_metrics.cv_folds ?? '?'} CV folds`
            : `, ~${testRows} rows per validation fold`}
          ). The model's predictive power will improve as more residents move through the system and additional labeled
          outcomes are captured.
        </div>
      ) : null}

      {!loading && !error && !notTrained && data ? (
        <div className="d-grid gap-4">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <div className="card">
                <div className="card-body">
                  <div className="small text-body-secondary">High readiness</div>
                  <div className="display-6">{data.readiness_distribution.high_count}</div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card">
                <div className="card-body">
                  <div className="small text-body-secondary">Medium readiness</div>
                  <div className="display-6">{data.readiness_distribution.medium_count}</div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card">
                <div className="card-body">
                  <div className="small text-body-secondary">Low readiness</div>
                  <div className="display-6">{data.readiness_distribution.low_count}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h2 className="h5 mb-2">Top resident worklist</h2>
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Resident</th>
                      <th>Safehouse</th>
                      <th>Score</th>
                      <th>Band</th>
                      <th>Process logs</th>
                      <th>Home visits</th>
                      <th>Interventions</th>
                      <th>Incidents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_resident_worklist.map((row) => (
                      <tr key={row.resident_id}>
                        <td>{row.resident_code || `Resident #${row.resident_id}`}</td>
                        <td>{row.safehouse || 'N/A'}</td>
                        <td>{row.readiness_score.toFixed(3)}</td>
                        <td>{row.readiness_band}</td>
                        <td>{row.process_recordings_count}</td>
                        <td>{row.home_visitations_count}</td>
                        <td>{row.intervention_plans_count}</td>
                        <td>{row.incident_reports_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      ) : null}
    </section>
  );
}
