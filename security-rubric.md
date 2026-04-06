# Security Grading Rubric & Requirements

## Core Requirements Checklist:
- [ ] **HTTPS/TLS:** `app.UseHttpsRedirection()` is active.
- [ ] **Identity DB:** Authentication data is in a separate database from application data.
- [ ] **Password Policy:** Minimum length 14, no complexity requirements (digits, symbols, etc.).
- [ ] **Authentication Order:** `app.UseAuthentication()` precedes `app.UseAuthorization()`.
- [ ] **Policy Authorization:** Endpoints are protected by Policies, not hardcoded Roles. Modifying data requires Admin policy.
- [ ] **Data Integrity:** DELETE actions require explicit confirmation data in the payload.
- [ ] **Cookie Security:** Auth cookie is `HttpOnly`, `SameSite=Lax`, `SecurePolicy=Always`.
- [ ] **Privacy:** A GDPR cookie consent UI exists and saves state in localStorage.
- [ ] **Headers:** A strict Content-Security-Policy (CSP) is enforced via middleware.
- [ ] **HSTS:** `app.UseHsts()` is active for non-development environments.