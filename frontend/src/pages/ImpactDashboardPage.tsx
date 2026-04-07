import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

type PublicImpactSummary = {
  safehouse_count: number;
  resident_count: number;
  donation_count: number;
  estimated_donation_total_php: number;
};

export function ImpactDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [safehouseCount, setSafehouseCount] = useState(0);
  const [residentCount, setResidentCount] = useState(0);
  const [donationCount, setDonationCount] = useState(0);
  const [estimatedDonationTotal, setEstimatedDonationTotal] = useState(0);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const summary = await apiFetch<PublicImpactSummary>('/api/public-impact/summary');
        setSafehouseCount(summary.safehouse_count);
        setResidentCount(summary.resident_count);
        setDonationCount(summary.donation_count);
        setEstimatedDonationTotal(summary.estimated_donation_total_php);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  return (
    <section>
      <h1 className="h3 mb-3">Impact Dashboard</h1>
      {loading ? <p>Loading dashboard...</p> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}

      {!loading && !error ? (
        <div className="row g-3">
          <div className="col-12 col-md-6 col-lg-3">
            <div className="card h-100">
              <div className="card-body">
                <h2 className="h6 text-body-secondary">Safehouses</h2>
                <p className="display-6 mb-0">{safehouseCount}</p>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6 col-lg-3">
            <div className="card h-100">
              <div className="card-body">
                <h2 className="h6 text-body-secondary">Residents</h2>
                <p className="display-6 mb-0">{residentCount}</p>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6 col-lg-3">
            <div className="card h-100">
              <div className="card-body">
                <h2 className="h6 text-body-secondary">Donations</h2>
                <p className="display-6 mb-0">{donationCount}</p>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6 col-lg-3">
            <div className="card h-100">
              <div className="card-body">
                <h2 className="h6 text-body-secondary">Estimated Value (PHP)</h2>
                <p className="display-6 mb-0">{estimatedDonationTotal.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
