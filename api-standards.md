# API & Data Transfer Standards

## 1. DTOs (Data Transfer Objects) Mandatory
- **Never** return raw database Entities (e.g., `Resident`, `Safehouse`) directly from an API controller.
- Always create explicit Request/Response DTOs (e.g., `ResidentResponseDto`, `CreateResidentRequestDto`).
- Use AutoMapper or manual mapping extensions to map between Entities and DTOs.
- This prevents "over-posting" vulnerabilities and prevents sensitive backend data from leaking to the React frontend.

## 2. Standardized Error Handling
- Do not return raw stack traces to the frontend.
- API endpoints should return standardized HTTP status codes:
  - `200 OK` or `201 Created` for success.
  - `400 Bad Request` for validation errors.
  - `401 Unauthorized` for missing/invalid auth cookies.
  - `403 Forbidden` for logged-in users lacking the proper Role/Policy.
  - `404 Not Found` when a requested resource does not exist.

## 3. Asynchronous Code
- All Entity Framework database calls must be asynchronous (e.g., `ToListAsync()`, `FirstOrDefaultAsync()`).
- All controller actions must be `async Task<IActionResult>`.