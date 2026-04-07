import { Link } from 'react-router-dom';

export function AdminDashboardPage() {
  return (
    <div>
      <header className="mb-4">
        <h1 className="h3 mb-1">Admin dashboard</h1>
        <p className="text-body-secondary mb-0">
          Overview shell for operational metrics. Widgets and KPIs can be wired in as requirements firm up.
        </p>
      </header>

      <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3 mb-4">
        <div className="col">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex flex-column">
              <h2 className="h6 text-body-secondary">Caseload snapshot</h2>
              <p className="display-6 text-muted mb-2">—</p>
              <p className="small text-body-secondary mb-3 flex-grow-1">Placeholder: active residents, admissions trend.</p>
              <Link className="btn btn-outline-primary btn-sm align-self-start" to="/admin/caseload">
                Open caseload inventory
              </Link>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex flex-column">
              <h2 className="h6 text-body-secondary">Sessions & process</h2>
              <p className="display-6 text-muted mb-2">—</p>
              <p className="small text-body-secondary mb-3 flex-grow-1">Placeholder: sessions this month, follow-ups due.</p>
              <Link className="btn btn-outline-primary btn-sm align-self-start" to="/admin/process-recordings">
                Open process recordings
              </Link>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex flex-column">
              <h2 className="h6 text-body-secondary">Safehouses & capacity</h2>
              <p className="display-6 text-muted mb-2">—</p>
              <p className="small text-body-secondary mb-3 flex-grow-1">Placeholder: occupancy vs capacity, regional load.</p>
              <span className="small text-body-secondary">Connect data source when ready.</span>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 text-body-secondary">Donations pipeline</h2>
              <p className="display-6 text-muted mb-2">—</p>
              <p className="small text-body-secondary mb-0">Placeholder: pledge vs received, in-kind mix.</p>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 text-body-secondary">Risk & incidents</h2>
              <p className="display-6 text-muted mb-2">—</p>
              <p className="small text-body-secondary mb-0">Placeholder: open incidents, escalations.</p>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex flex-column">
              <h2 className="h6 text-body-secondary">ML insights</h2>
              <p className="display-6 text-muted mb-2">—</p>
              <p className="small text-body-secondary mb-3 flex-grow-1">
                Model-backed social insights and AI-assisted post drafting.
              </p>
              <div className="d-flex gap-2">
                <Link className="btn btn-outline-primary btn-sm" to="/admin/social-insights">
                  Open insights
                </Link>
                <Link className="btn btn-primary btn-sm" to="/admin/social-post-studio">
                  Open post studio
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="card border border-dashed">
        <div className="card-body">
          <h2 className="h6 mb-2">Layout grid (reserved)</h2>
          <p className="small text-body-secondary mb-0">
            Extra row space for charts, tables, or embedded reports. Keep Bootstrap grid (<code>row</code> / <code>col</code>)
            for consistent spacing with the rest of the app.
          </p>
        </div>
      </section>
    </div>
  );
}
