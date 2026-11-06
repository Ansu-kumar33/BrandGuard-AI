# BrandGuard AI

BrandGuard AI helps a human reviewer compare marketing content with a brand's
voice, terminology, and approved facts before the content is used.

## Problem statement

Teams can publish inconsistent or unsupported brand claims when content review
is informal. BrandGuard AI brings brand guidelines, preliminary checks, suggested
edits, and explicit human review decisions into one small review workflow.

## Implemented features

- Dashboard metrics and saved review activity.
- Editable brand guideline profiles and an explicitly labelled demo profile.
- Rule-based checks for restricted/preferred language and a small set of
  absolute-claim patterns.
- Optional AI analysis via the backend and Groq structured JSON output.
- Account registration/login, Argon2 password hashing, signed JWT sessions, and
  per-user brand/review ownership.
- An estimated compliance score, detected findings, suggested corrections,
  and clear flags for claims requiring human verification.
- Human review, suggestion decisions, and persistent review history.
- No automatic approval or publishing.

Both analysis modes are preliminary aids. The score is an estimate, not a
guarantee; reviewers must verify claims and decide what to do.

## Technology

- Frontend: React, TypeScript, Vite, Tailwind CSS.
- Backend: Python, FastAPI, Pydantic, SQLAlchemy.
- Storage: SQLite.
- Optional AI: Groq API, called only from the backend through its OpenAI-compatible endpoint.
- Tests: pytest and Playwright.

## Project structure

```text
backend/
  auth.py                Registration, login, JWT validation
  analyze.py             AI analysis endpoint
  database.py            SQLite engine and sessions
  main.py                FastAPI app, CORS, and health check
  routes.py              Brand and review endpoints
  schemas.py             Request and response validation
  tests/                 Backend API and persistence tests
frontend/
  src/
    lib/                 API clients and rule-based analysis
    pages/               Login, registration, dashboard, and review screens
  e2e/                   Playwright browser workflow
```

## Requirements and local setup

- Node.js 20.19+ or 22.12+.
- Python 3.10+.

Install backend dependencies and start FastAPI in a PowerShell terminal from
the project root:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Generate a random secret and put it in backend/.env as JWT_SECRET_KEY.
py -c "import secrets; print(secrets.token_urlsafe(48))"
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

The local API health endpoint is `http://127.0.0.1:8000/api/health`; interactive
API docs are at `http://127.0.0.1:8000/docs`.

In a second terminal from the project root, install and start the frontend:

```powershell
cd frontend
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Open the URL Vite prints (normally `http://localhost:5173`). With
`VITE_API_BASE_URL` unset or empty, frontend `/api` requests use the existing
Vite proxy to `http://127.0.0.1:8000`.

## Environment variables

Use the committed example files as templates: `backend/.env.example` and
`frontend/.env.example`. Real `.env` files are ignored by Git.

| Variable | Where | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | Frontend build environment | FastAPI origin in production; leave empty locally to use the Vite proxy. |
| `FRONTEND_ORIGINS` | Backend | Comma-separated, exact browser origins allowed by CORS. Set this to the deployed frontend origin. |
| `BRANDGUARD_DATABASE_PATH` | Backend | SQLite file path; defaults to `backend/brandguard.db`. Its parent directory is created if needed. |
| `JWT_SECRET_KEY` | Backend only | Random signing secret (at least 32 characters); required before the backend starts. Generate a different value per environment and do not commit it. |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Backend only | Access-token lifetime in minutes; defaults to 30 and is limited to 1–10080. |
| `GROQ_API_KEY` | Backend only | Optional secret for live AI analysis. Never use a `VITE_` variable for this key. |
| Model | Backend | `openai/gpt-oss-120b`, sent to `https://api.groq.com/openai/v1`. |

Do not put secrets in frontend variables: Vite variables are included in browser
builds. When `FRONTEND_ORIGINS` is unset, local Vite origins are allowed. When
set, it replaces that local default; list each desired origin without a path,
for example `https://your-app.example`.

Authentication uses `POST /api/auth/register` and `POST /api/auth/login`.
Passwords are hashed with Argon2 and are never returned by the API. Registration
creates an account; log in to receive a signed JWT bearer token. The frontend
keeps that token in `sessionStorage` for the current browser tab, validates it
when the app loads, and sends it as `Authorization: Bearer ...` on protected
requests. `GET /api/auth/me` returns the current account. Sign out removes the
tab's token.

## API endpoint summary

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | API and SQLite health. |
| `POST` | `/api/auth/register` | Register with name, email, and a 12+ character password. |
| `POST` | `/api/auth/login` | Verify credentials and return a JWT bearer token. |
| `GET` | `/api/auth/me` | Read the authenticated account. |
| `GET`, `POST` | `/api/brands` | List or create brand profiles. |
| `GET`, `PUT`, `DELETE` | `/api/brands/{brand_id}` | Read, update, or delete a profile. |
| `GET`, `POST` | `/api/reviews` | List or save reviews. |
| `GET`, `PUT` | `/api/reviews/{review_id}` | Read or update a review and its human status. |
| `PUT` | `/api/reviews/{review_id}/suggestions/{issue_id}` | Save a suggestion decision. |
| `POST` | `/api/analyze` | Run AI analysis; requires authentication and the backend-only Groq key. |

## SQLite persistence

The backend creates tables at startup. By default, data is stored in
`backend/brandguard.db`. That existing local database is deliberately not part of
the source submission. SQLite can work on a single backend instance, but files
on temporary cloud storage can be lost when an instance restarts, is replaced,
or is redeployed.

For Render, attach a persistent disk to the backend service and set
`BRANDGUARD_DATABASE_PATH` to a file inside its mount directory (for example
`/var/data/brandguard.db`, if that is the mount path you configured). Confirm
the actual mount path and test writes across a restart/redeploy yourself;
SQLite persistence on Render has not been verified by this project.

## Deployment

### Render backend

1. Create a Render Web Service from this repository.
2. Set the build command to `pip install -r backend/requirements.txt`.
3. Set the start command to
   `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`.
4. Configure `FRONTEND_ORIGINS` with the exact deployed Vercel origin,
   a strong random `JWT_SECRET_KEY`, `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`,
   `GROQ_API_KEY` if AI is required, and
   `BRANDGUARD_DATABASE_PATH` if using a mounted persistent disk.
5. Registration is open to anyone who can reach the API. If Render offers
   access controls for the selected plan, use them to limit account creation
   and abuse during a public demo. Avoid putting sensitive or personal data in
   a publicly reachable instance.

### Vercel frontend

1. Import the repository as a Vercel project and set the project root to
   `frontend`.
2. Use `npm run build` as the build command and `dist` as the output directory.
3. Set `VITE_API_BASE_URL` to the deployed FastAPI origin (scheme and host,
   without a trailing slash). Vite reads this at build time.
4. Add the deployed Vercel origin to the backend's `FRONTEND_ORIGINS`, then
   redeploy/restart the backend as required by the hosting platform.

No deployment URLs are provided because this project has not been deployed.

## Security and known limitations

- Accounts are self-service: there is no email verification, password reset,
  administrator approval, or login rate limiting. Registration is open to
  anyone who can reach the API.
- JWTs are stored in browser `sessionStorage`. This limits their lifetime to a
  tab session but does not protect them from malicious same-origin JavaScript
  (for example, an XSS flaw). Use HTTPS and treat this as demo-grade auth.
- Sign-out removes the browser's token, but there is no server-side token
  revocation or refresh-token flow. A stolen token remains valid until expiry.
- Each new brand profile and review is scoped to its creator; other users
  receive no records and get 404 for another user's record IDs. Suggestions
  are protected through their parent review.
- On startup, the SQLite ownership migration adds nullable owner columns without
  deleting old rows. Records created before authentication remain unowned and
  are hidden rather than assigned to whichever user registers first.
- Browser-local records from the unauthenticated version are not auto-imported
  after login, to avoid attaching one browser user's data to another account.
  Existing local storage values are left untouched.
- Require HTTPS in deployment. CORS only controls browser cross-origin access;
  it does not authenticate callers. Wildcard origins are rejected and
  credentials are disabled.
- For a public demo, consider temporary hosting-platform access restrictions
  to limit account creation and API usage. Authentication does not make the
  application a production-ready identity system.
- CORS only controls browser cross-origin access; it does not authenticate
  callers or prevent direct API requests. Wildcard origins are rejected and
  credentials are disabled.
- Keep the Groq key only in the backend environment. AI provider responses
  are checked for the expected structure and for quoted text/facts, but still
  require a human to verify.
- Rule-based analysis is limited to configured terms and a small set of
  patterns. Neither analysis mode verifies claims as true.
- Browser-local profile/review data from earlier versions is imported once
  only when the backend database is empty.
- No automatic publishing or production-grade account recovery/abuse controls.

## Tests

Run backend tests from the project root:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements-test.txt
.\.venv\Scripts\python.exe -m pytest -q
```

Build the frontend:

```powershell
cd frontend
npm install
npm run build
```

Run the configured Playwright workflow (install Chromium once if needed):

```powershell
cd frontend
npx playwright install chromium
npm run test:e2e
```

The browser suite starts FastAPI and Vite and uses a temporary SQLite database
outside the project. It does not test cloud deployment or Render persistence.
