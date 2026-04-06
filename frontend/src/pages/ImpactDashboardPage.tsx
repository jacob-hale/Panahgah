import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

type Safehouse = { safehouse_id: number };
type Resident = { resident_id: number };
type Donation = { donation_id: number; estimated_value: number };

export function ImpactDashboardPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [safehouseCount, setSafehouseCount] = useState(0);
  const [residentCount, setResidentCount] = useState(0);
  const [donationCount, setDonationCount] = useState(0);
  const [estimatedDonationTotal, setEstimatedDonationTotal] = useState(0);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      setLoading(false);
      return;
    }

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const [safehouses, residents, donations] = await Promise.all([
          apiFetch<Safehouse[]>('/api/safehouses'),
          apiFetch<Resident[]>('/api/residents'),
          apiFetch<Donation[]>('/api/donations'),
        ]);

        setSafehouseCount(safehouses.length);
        setResidentCount(residents.length);
        setDonationCount(donations.length);
        setEstimatedDonationTotal(
          donations.reduce((sum, donation) => sum + (donation.estimated_value ?? 0), 0),
        );
      } catch {
        setError('Unable to load dashboard data. Ensure you are logged in with the required role.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <p>Checking session...</p>;
  }

  if (!isAuthenticated) {
    return <div className="alert alert-warning">Please log in to view the Impact Dashboard.</div>;
  }

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
