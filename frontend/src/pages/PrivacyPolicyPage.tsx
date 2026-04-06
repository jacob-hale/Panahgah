export function PrivacyPolicyPage() {
  return (
    <section className="card shadow-sm">
      <div className="card-body">
        <h1 className="h4 mb-3">Privacy Policy</h1>
        <p>
          Panahgah uses secure authentication cookies for session management and stores a browser
          preference cookie for UI theme selection. We also store a local consent acknowledgment in
          localStorage after you accept the cookie notice.
        </p>
        <p className="mb-0">
          This project handles sensitive case data. Access is role-restricted and audited through
          backend authorization policies.
        </p>
      </div>
    </section>
  );
}
