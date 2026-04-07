import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';

type DonorMlInsights = {
  donor_lapse: {
    low_count: number;
    medium_count: number;
    high_count: number;
    top_count: number;
    top_segments: { supporter_type: string; acquisition_channel: string; avg_score: number }[];
    top_donors: {
      supporter_id: number;
      score: number;
      supporter_type: string;
      acquisition_channel: string;
      days_since_last_donation?: number | null;
      donation_count_hist?: number | null;
      avg_estimated_value_hist?: number | null;
    }[];
    metrics: {
      roc_auc?: number | null;
      avg_precision: number;
      f1: number;
      test_positive_rate: number;
      train_rows: number;
      test_rows: number;
    };
    key_features: { feature: string; importance: number }[];
  };
  pipeline_health: { status: string; last_trained_at_utc?: string | null };
};

export function DonorLapseInsightsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DonorMlInsights | null>(null);
  const [training, setTraining] = useState(false);
  const [trainError, setTrainError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiFetch<DonorMlInsights>('/api/ml/donor/insights'));
    } catch {
      setError('Unable to load donor lapse insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const lapse = data?.donor_lapse;
  const notTrained = data?.pipeline_health.status !== 'ok';

  const handleRetrain = async () => {
    setTraining(true);
    setTrainError(null);
    try {
      await apiFetch('/api/ml/donor/train', { method: 'POST' });
      await load();
    } catch (e) {
      setTrainError(e instanceof Error ? e.message : 'Training failed.');
    } finally {
      setTraining(false);
    }
  };

  return (
    <section>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Donor lapse insights
          </li>
        </ol>
      </nav>

      <h1 className="h3 mb-2">Donor lapse insights</h1>
      <p className="text-body-secondary">High-risk donor analytics, segment risk profile, and model quality metrics.</p>
      <div className="d-flex gap-2 align-items-center mb-3">
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleRetrain} disabled={training}>
          {training ? 'Retraining...' : 'Retrain donor models'}
        </button>
        {trainError ? <span className="small text-danger">{trainError}</span> : null}
      </div>

      {loading ? <p>Loading donor lapse insights...</p> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {!loading && !error && notTrained ? (
        <div className="alert alert-warning">Model not trained yet. Retrain donor models from Admin dashboard first.</div>
      ) : null}

      {!loading && !error && !notTrained && lapse ? (
        <div className="d-grid gap-4">
          <div className="row g-3">
            <div className="col-12 col-md-3"><div className="card"><div className="card-body"><div className="small text-body-secondary">High risk</div><div className="display-6">{lapse.high_count}</div></div></div></div>
            <div className="col-12 col-md-3"><div className="card"><div className="card-body"><div className="small text-body-secondary">Medium risk</div><div className="display-6">{lapse.medium_count}</div></div></div></div>
            <div className="col-12 col-md-3"><div className="card"><div className="card-body"><div className="small text-body-secondary">Low risk</div><div className="display-6">{lapse.low_count}</div></div></div></div>
            <div className="col-12 col-md-3"><div className="card"><div className="card-body"><div className="small text-body-secondary">Top worklist size</div><div className="display-6">{lapse.top_count}</div></div></div></div>
          </div>

          <div className="card"><div className="card-body">
            <h2 className="h5 mb-2">Top high-risk donors</h2>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead><tr><th>Supporter ID</th><th>Score</th><th>Type</th><th>Channel</th><th>Days since last gift</th><th>Donation count</th><th>Avg value</th></tr></thead>
                <tbody>
                  {lapse.top_donors.map((r) => (
                    <tr key={r.supporter_id}>
                      <td>{r.supporter_id}</td><td>{r.score.toFixed(3)}</td><td>{r.supporter_type}</td><td>{r.acquisition_channel}</td>
                      <td>{r.days_since_last_donation ?? 'N/A'}</td><td>{r.donation_count_hist ?? 'N/A'}</td><td>{r.avg_estimated_value_hist?.toFixed(2) ?? 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div></div>

          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <div className="card"><div className="card-body">
                <h2 className="h6">Top risk segments</h2>
                <ul className="small mb-0">
                  {lapse.top_segments.map((s) => (
                    <li key={`${s.supporter_type}-${s.acquisition_channel}`}>
                      {s.supporter_type} / {s.acquisition_channel}: {s.avg_score.toFixed(3)}
                    </li>
                  ))}
                </ul>
              </div></div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="card"><div className="card-body">
                <h2 className="h6">Model metrics</h2>
                <div className="small">
                  ROC-AUC: {lapse.metrics.roc_auc?.toFixed(3) ?? 'N/A'} | AP: {lapse.metrics.avg_precision.toFixed(3)} | F1:{' '}
                  {lapse.metrics.f1.toFixed(3)} | Train/Test: {lapse.metrics.train_rows}/{lapse.metrics.test_rows}
                </div>
                <h3 className="h6 mt-3">Top features</h3>
                <ul className="small mb-0">
                  {lapse.key_features.map((f) => (
                    <li key={f.feature}>
                      {f.feature}: {f.importance.toFixed(4)}
                    </li>
                  ))}
                </ul>
              </div></div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
