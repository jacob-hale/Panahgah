# Backend Architecture & Security Guidelines

## 1. Database Separation (Mandatory)
The application strictly enforces separation of concerns at the data layer:
- `ApplicationDbContext`: Inherits from `DbContext`. Handles all business data (Residents, Safehouses, etc.). Uses `PanahgahAppConnection`.
- `AuthIdentityDbContext`: Inherits from `IdentityDbContext<ApplicationUser>`. Handles all authentication, roles, and user data. Uses `PanahgahIdentityConnection`.
- **Rule:** Never map business entities directly to `ApplicationUser`. Use a foreign key (like an email string) if a relationship is needed.

## 2. Authentication & Authorization Policies
- **No Magic Strings:** All roles must be defined in `AuthRoles.cs` (`public const string Admin = "Admin";`). All policies must be defined in `AuthPolicies.cs`.
- **Policy-Based Routing:** Use `[Authorize(Policy = AuthPolicies.RequireAdmin)]` instead of `[Authorize(Roles = "Admin")]`.
- **Endpoint Protection:** All endpoints modifying data (POST, PUT, DELETE) must require the Admin policy. 
- **Delete Integrity:** Any `DELETE` endpoint must require a body payload containing a confirmation flag (e.g., `public bool ConfirmDelete { get; set; }`) to execute.

## 3. Security Hardening Configurations
- **Identity Endpoints:** Utilize `app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>();` for standard auth operations.
- **Password Policy:** Enforce length over complexity (NIST guidelines). `RequiredLength = 14`. Disable requirements for digits, uppercase, lowercase, and non-alphanumeric characters.
- **Cookie Security:** - `HttpOnly = true`
  - `SameSite = SameSiteMode.Lax`
  - `SecurePolicy = CookieSecurePolicy.Always`
  - `SlidingExpiration = true`
- **Response Headers:** Implement a custom middleware for CSP: `default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'`.
- **HSTS:** Enforce `app.UseHsts()` in non-development environments.
- **Middleware Order:** `app.UseAuthentication()` MUST immediately precede `app.UseAuthorization()`.