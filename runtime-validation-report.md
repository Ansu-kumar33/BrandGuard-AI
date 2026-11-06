# Runtime Validation Report

**Updated**: 2026-11-06
**Scope**: Local checks for the BrandGuard AI workspace; no cloud deployment was performed.

## Results

| Check | Result | Details |
|---|---|---|
| Backend | PASS | `pytest -q`: 19 passed, 1 Starlette/httpx deprecation warning. |
| Frontend | PASS | `npm run build`: TypeScript and Vite production build succeeded. |
| Browser E2E | PASS | `npm run test:e2e`: 1 Playwright workflow passed at 390px, including registration, login, brand profile create/edit, rule-based checks, suggestion and review decisions, dashboard/history, reload, sign-out, and the missing-key AI error. |
| Tenant isolation | PASS | Backend tests verify users cannot list, read, update, delete, or create reviews against another user's data. |
| SQLite migration | PASS | The ownership migration test confirms pre-auth rows remain present and unowned. |
| SQLite restart test | PASS | The backend test suite verifies that user accounts, saved records, and token-authenticated access survive a local backend restart using an isolated temporary database. |

Tests ran against the workspace-root project. The nested, untracked
`BrandGuard-AI/` directory is a stale duplicate and was not tested; submit the
workspace root's current project files, not that duplicate.

## AI verification

The root backend loaded `GROQ_API_KEY` from its ignored `backend/.env` file
without exposing its value. An authenticated local analysis request to Groq
using `openai/gpt-oss-120b` returned HTTP 200 with a valid structured response.
The frontend E2E verified the missing-key error path. The key must remain
backend-only.

## Deployment and security status

- No Render or Vercel deployment was performed. Production URLs, CORS behavior
  against a deployed domain, and cloud SQLite persistence have not been tested.
- The README contains manual Render and Vercel setup instructions; no deployment
  manifests or live deployment were validated.
- Authentication uses Argon2 password hashes and JWT bearer tokens; brand and
  review endpoints are scoped to the current account. The frontend stores tokens
  in sessionStorage for the current tab.
- Authentication does not include email verification, password recovery, or
  login/registration rate limiting, server-side token revocation, or refresh
  tokens. sessionStorage tokens remain readable to same-origin JavaScript, so
  this is not a production-grade identity system.
- CORS is configurable using exact origins, rejects wildcard configuration, and
  does not enable credentials. CORS is not an authentication mechanism.
- SQLite persistence was verified locally by the automated restart test only.
  A cloud instance needs a persistent disk and a restart/redeploy test.
- The configured local SQLite database was not changed during this audit; tests
  used isolated temporary databases.

**Conclusion**: The workspace-root project passes its local feature and
regression checks and is ready for a hackathon demo submission. It is not
deployed or a production-grade identity service. Ensure the stale nested
duplicate is excluded from submission.
