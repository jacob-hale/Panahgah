# Frontend UI and Data Fetching Standards

## 1. Styling Constraints
- Use standard CSS and standard Bootstrap 5 classes only.
- Do not install Tailwind CSS, Emotion, Styled Components, or Material UI.
- Keep UI structures simple and functional (grids, cards, tables). We are prioritizing functionality over complex design.

## 2. State & Authentication Context
- Manage authentication globally via an `AuthContext.tsx`.
- The context must fetch `/api/auth/me` on mount to establish `isAuthenticated`, `authSession.roles`, and an `isLoading` flag.
- Components must check the `isLoading` flag before rendering role-gated UI to prevent flickering.

## 3. API Communication (Crucial)
- **Credentials:** Every single `fetch()` call to the backend MUST include `credentials: 'include'` to ensure the `HttpOnly` auth cookie is transmitted. 
- **Error Handling:** All fetch wrappers must gracefully handle `401 Unauthorized` and `403 Forbidden` responses by redirecting the user to the Login page or displaying a Bootstrap alert.

## 4. Defense in Depth (UI Gating)
- Role-gated UI (like the Admin Dashboard or Delete buttons) should check `authSession.roles.includes('Admin')` before rendering. 
- Understand that this is a UX feature, not a security boundary; the backend will ultimately reject unauthorized requests.

## 5. Destructive Actions
- Any action resulting in a `DELETE` request must be wrapped in a Bootstrap Modal.
- The Modal must require the user to type a specific string (e.g., "CONFIRM") into an input field before the "Delete" button becomes clickable.