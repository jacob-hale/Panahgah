import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';

type DonorMlInsights = {
  donor_upgrade: {
    low_count: number;
    medium_count: number;
    high_count: number;
    top_count: number;
    top_segments: { supporter_type: string; acquisition_channel: string; avg_score: number }[];
    top_donors: {
      supporter_id: number;
      supporter_name?: string | null;
      supporter_email?: string | null;
      supporter_phone?: string | null;
      score: number;
      supporter_type: string;
      acquisition_channel: string;
      donation_count_hist?: number | null;
      hist_median_amount?: number | null;
      suggested_ask_floor?: number | null;
      suggested_ask_ceiling?: number | null;
    }[];
    ask_ladder_summary: { suggested_ask_floor_avg: number; suggested_ask_ceiling_avg: number };
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

export function DonorUpgradeInsightsPage() {
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
      setError('Unable to load donor upgrade insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const up = data?.donor_upgrade;
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
            Donor upgrade insights
          </li>
        </ol>
      </nav>

      <h1 className="h3 mb-2">Donor upgrade insights</h1>
      <p className="text-body-secondary">High-upgrade donor analytics with ask-ladder guidance and model quality metrics.</p>
      <div className="d-flex gap-2 align-items-center mb-3">
        <button type="button" className="btn btn-primary btn-sm" onClick={handleRetrain} disabled={training}>
          {training ? 'Retraining...' : 'Retrain donor models'}
        </button>
        {trainError ? <span className="small text-danger">{trainError}</span> : null}
      </div>

      {loading ? <p>Loading donor upgrade insights...</p> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {!loading && !error && notTrained ? (
        <div className="alert alert-warning">Model not trained yet. Retrain donor models from Admin dashboard first.</div>
      ) : null}

      {!loading && !error && !notTrained && up ? (
        <div className="d-grid gap-4">
          <div className="row g-3">
            <div className="col-12 col-md-3"><div className="card"><div className="card-body"><div className="small text-body-secondary">High potential</div><div className="display-6">{up.high_count}</div></div></div></div>
            <div className="col-12 col-md-3"><div className="card"><div className="card-body"><div className="small text-body-secondary">Medium potential</div><div className="display-6">{up.medium_count}</div></div></div></div>
            <div className="col-12 col-md-3"><div className="card"><div className="card-body"><div className="small text-body-secondary">Low potential</div><div className="display-6">{up.low_count}</div></div></div></div>
            <div className="col-12 col-md-3"><div className="card"><div className="card-body"><div className="small text-body-secondary">Ask ladder avg</div><div className="fw-semibold">{up.ask_ladder_summary.suggested_ask_floor_avg.toFixed(0)} - {up.ask_ladder_summary.suggested_ask_ceiling_avg.toFixed(0)}</div></div></div></div>
          </div>

          <div className="card"><div className="card-body">
            <h2 className="h5 mb-2">Top upgrade candidates</h2>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Score</th><th>Type</th><th>Channel</th><th>Gift count</th><th>Median amount</th><th>Ask floor</th><th>Ask ceiling</th></tr></thead>
                <tbody>
                  {up.top_donors.map((r) => (
                    <tr key={r.supporter_id}>
                      <td>{r.supporter_name || `Supporter #${r.supporter_id}`}</td>
                      <td>{r.supporter_email || 'N/A'}</td>
                      <td className="mlr-contact-phone">{r.supporter_phone || 'N/A'}</td>
                      <td>{r.score.toFixed(3)}</td><td>{r.supporter_type}</td><td>{r.acquisition_channel}</td>
                      <td>{r.donation_count_hist ?? 'N/A'}</td><td>{r.hist_median_amount?.toFixed(2) ?? 'N/A'}</td><td>{r.suggested_ask_floor?.toFixed(2) ?? 'N/A'}</td><td>{r.suggested_ask_ceiling?.toFixed(2) ?? 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div></div>

          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <div className="card"><div className="card-body">
                <h2 className="h6">Top opportunity segments</h2>
                <ul className="small mb-0">
                  {up.top_segments.map((s) => (
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
                  ROC-AUC: {up.metrics.roc_auc?.toFixed(3) ?? 'N/A'} | AP: {up.metrics.avg_precision.toFixed(3)} | F1:{' '}
                  {up.metrics.f1.toFixed(3)} | Train/Test: {up.metrics.train_rows}/{up.metrics.test_rows}
                </div>
                <h3 className="h6 mt-3">Top features</h3>
                <ul className="small mb-0">
                  {up.key_features.map((f) => (
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



