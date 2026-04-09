import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';

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
    avg_precision: number;
    f1: number;
    test_positive_rate: number;
    train_rows: number;
    test_rows: number;
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
  const [training, setTraining] = useState(false);
  const [trainError, setTrainError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiFetch<GirlsReintegrationInsights>('/api/ml/girls-reintegration/insights'));
    } catch {
      setError('Unable to load girls reintegration insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleRetrain = async () => {
    setTraining(true);
    setTrainError(null);
    try {
      await apiFetch('/api/ml/girls-reintegration/train', { method: 'POST' });
      await load();
    } catch (e) {
      setTrainError(e instanceof Error ? e.message : 'Training failed.');
    } finally {
      setTraining(false);
    }
  };

  const notTrained = !data || data.pipeline_health?.status !== 'ok';

  return (
    <section>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Girls reintegration insights
          </li>
        </ol>
      </nav>

      <h1 className="h3 mb-2">Girls reintegration insights</h1>
      <p className="text-body-secondary">
        Reintegration-readiness scoring to prioritize case conference worklists and intervention planning.
      </p>
      <div className="d-flex gap-2 align-items-center mb-3">
        <button type="button" className="btn btn-primary btn-sm" onClick={handleRetrain} disabled={training}>
          {training ? 'Retraining...' : 'Retrain reintegration model'}
        </button>
        {trainError ? <span className="small text-danger">{trainError}</span> : null}
      </div>

      {loading ? <p>Loading girls reintegration insights...</p> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {!loading && !error && notTrained ? (
        <div className="alert alert-warning">Model not trained yet. Run retraining to generate insights.</div>
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

          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <div className="card">
                <div className="card-body">
                  <h2 className="h6">Model metrics</h2>
                  <div className="small">
                    ROC-AUC: {data.model_metrics.roc_auc?.toFixed(3) ?? 'N/A'} | AP:{' '}
                    {data.model_metrics.avg_precision.toFixed(3)} | F1: {data.model_metrics.f1.toFixed(3)} | Train/Test:{' '}
                    {data.model_metrics.train_rows}/{data.model_metrics.test_rows}
                  </div>
                  <div className="small text-body-secondary mt-2">
                    Last trained: {data.pipeline_health.last_trained_at_utc || 'N/A'} | Rows used:{' '}
                    {data.pipeline_health.rows_used ?? 'N/A'}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="card">
                <div className="card-body">
                  <h2 className="h6">Top features</h2>
                  <ul className="small mb-0">
                    {data.key_features.map((feature) => (
                      <li key={feature.feature}>
                        {feature.feature}: {feature.importance.toFixed(4)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
