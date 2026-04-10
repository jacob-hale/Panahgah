import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const CONTRIBUTION_OPTIONS = [
  { key: 'monetary', label: 'Monetary donor' },
  { key: 'volunteer', label: 'Volunteer' },
  { key: 'skills', label: 'Skills contributor' },
  { key: 'in_kind', label: 'In-kind (goods)' },
  { key: 'time', label: 'Time / mentoring' },
  { key: 'social_media', label: 'Social media / advocacy' },
] as const;

const PRIMARY_TYPES = ['individual', 'organization', 'faith_group', 'corporate'] as const;

export function RegisterPage() {
  const { isAuthenticated, isLoading, register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [primarySupporterType, setPrimarySupporterType] = useState<string>('individual');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [interests, setInterests] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const toggleInterest = (key: string) => {
    setInterests((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Password and confirm password must match.');
      return;
    }
    setSubmitting(true);
    try {
      const contributionInterests = CONTRIBUTION_OPTIONS.filter((o) => interests[o.key]).map((o) => o.key);
      await register({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        primarySupporterType,
        region: region.trim() || undefined,
        country: country.trim() || undefined,
        contributionInterests,
      });
      navigate('/');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Registration failed.';
      setError(msg.replace(/^"|"$/g, '') || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="row justify-content-center">
      <div className="col-12 col-md-10 col-lg-7">
        <div className="card shadow-sm">
          <div className="card-body">
            <h1 className="h4 mb-3">Create a donor account</h1>
            <p className="text-body-secondary small mb-4">
              Password must be at least 14 characters. Staff can record donations and allocations to your profile after you
              sign up—no payment is processed on this site.
            </p>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit} className="d-grid gap-3">
              <div>
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={14}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={14}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="displayName" className="form-label">
                  Display name
                </label>
                <input
                  id="displayName"
                  type="text"
                  className="form-control"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                />
              </div>
              <div className="row g-2">
                <div className="col-md-6">
                  <label htmlFor="firstName" className="form-label">
                    First name (optional)
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    className="form-control"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="lastName" className="form-label">
                    Last name (optional)
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    className="form-control"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="phone" className="form-label">
                  Phone (optional)
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="form-control"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="primaryType" className="form-label">
                  Primary supporter type
                </label>
                <select
                  id="primaryType"
                  className="form-select"
                  value={primarySupporterType}
                  onChange={(event) => setPrimarySupporterType(event.target.value)}
                >
                  {PRIMARY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="row g-2">
                <div className="col-md-6">
                  <label htmlFor="region" className="form-label">
                    Region (optional)
                  </label>
                  <input
                    id="region"
                    type="text"
                    className="form-control"
                    value={region}
                    onChange={(event) => setRegion(event.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="country" className="form-label">
                    Country (optional)
                  </label>
                  <input
                    id="country"
                    type="text"
                    className="form-control"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                  />
                </div>
              </div>
              <fieldset>
                <legend className="form-label mb-2">How you would like to contribute (select any)</legend>
                <div className="d-flex flex-column gap-2">
                  {CONTRIBUTION_OPTIONS.map((o) => (
                    <div key={o.key} className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`int-${o.key}`}
                        checked={!!interests[o.key]}
                        onChange={() => toggleInterest(o.key)}
                      />
                      <label className="form-check-label" htmlFor={`int-${o.key}`}>
                        {o.label}
                      </label>
                    </div>
                  ))}
                </div>
              </fieldset>
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Creating account…' : 'Create account'}
              </button>
            </form>
            <p className="small text-body-secondary mt-3 mb-0">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
