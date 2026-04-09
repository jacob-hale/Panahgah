export function PrivacyPolicyPage() {
  return (
    <section className="card shadow-sm">
      <div className="card-body">
        <h1 className="h4 mb-3">Privacy Policy</h1>
        <p className="text-body-secondary mb-4">
          This notice explains what data this site processes, why, how we protect it, and what choices you have.
          This is a student project and not legal advice.
        </p>

        <h2 className="h6 text-uppercase text-body-secondary" style={{ letterSpacing: '0.06em' }}>Who we are</h2>
        <p>
          <strong>Controller</strong>: Panahgah (project team). For course purposes, treat the site administrators as the
          data controller for the information processed by this website.
        </p>

        <h2 className="h6 text-uppercase text-body-secondary" style={{ letterSpacing: '0.06em' }}>What we collect</h2>
        <ul className="mb-4">
          <li>
            <strong>Account data</strong>: email address and password (stored as a salted hash by ASP.NET Identity), plus roles
            (e.g., Donor, Admin).
          </li>
          <li>
            <strong>Donor profile data</strong>: display name and optional fields (phone, region, country, contribution interests).
          </li>
          <li>
            <strong>Donation records</strong>: donations and allocations recorded in the system. Donors can only view their own history.
          </li>
          <li>
            <strong>Operational/case data</strong>: certain pages allow authorized staff to manage sensitive operational records.
          </li>
        </ul>

        <h2 className="h6 text-uppercase text-body-secondary" style={{ letterSpacing: '0.06em' }}>Why we use it (purposes)</h2>
        <ul className="mb-4">
          <li><strong>Provide the service</strong>: create accounts, sign users in, and show role-appropriate pages.</li>
          <li><strong>Security</strong>: protect access to sensitive data and prevent unauthorized changes.</li>
          <li><strong>Site operations</strong>: support basic administration, auditing, and troubleshooting.</li>
        </ul>

        <h2 className="h6 text-uppercase text-body-secondary" style={{ letterSpacing: '0.06em' }}>Cookies & local storage</h2>
        <p className="mb-2">
          This site uses <strong>essential authentication cookies</strong> to keep you signed in and protect your session.
          Essential cookies are required for login to work.
        </p>
        <ul className="mb-4">
          <li>
            <strong>Authentication cookie</strong>: set by ASP.NET Identity after login (HttpOnly and Secure).
          </li>
          <li>
            <strong>Cookie notice acknowledgement</strong>: stored in <code>localStorage</code> as{' '}
            <code>panahgah_cookie_consent_acknowledged</code> so the banner does not reappear.
          </li>
        </ul>

        <h2 className="h6 text-uppercase text-body-secondary" style={{ letterSpacing: '0.06em' }}>Who can access the data</h2>
        <ul className="mb-4">
          <li>
            <strong>Public visitors</strong>: can view public pages like the homepage and this policy.
          </li>
          <li>
            <strong>Donors</strong>: can access their own donor history and profile.
          </li>
          <li>
            <strong>Admins</strong>: can add, modify, and (with confirmation) delete records as part of site administration.
          </li>
        </ul>

        <h2 className="h6 text-uppercase text-body-secondary" style={{ letterSpacing: '0.06em' }}>Retention</h2>
        <p className="mb-4">
          We keep account, profile, and donation data for as long as the account is active or as needed for course/project purposes.
          Data may be removed by administrators during cleanup or resets.
        </p>

        <h2 className="h6 text-uppercase text-body-secondary" style={{ letterSpacing: '0.06em' }}>Your rights</h2>
        <p className="mb-4">
          Depending on where you live, you may have rights to access, correct, or delete your personal data and to request
          information about how it is used. For this project, contact the site administrators (course team) to request changes.
        </p>

        <h2 className="h6 text-uppercase text-body-secondary" style={{ letterSpacing: '0.06em' }}>Security</h2>
        <p className="mb-0">
          We use HTTPS in deployment, role-based authorization on protected APIs, and browser security headers (including a
          Content Security Policy) to reduce common web risks.
        </p>
      </div>
    </section>
  );
}
