# Rehabilitation Progress Management System

A full-stack clinical workflow application for tracking rehabilitation plans, patient adherence, multidimensional assessments, recovery trends, risk signals, and short-term outcome predictions.

The system supports administrators, therapists, and patients through role-specific interfaces and server-enforced data access rules. The web interface is English by default and includes an English/Chinese language switch with persisted user preference.

## Highlights

- Role-based workflows for administrators, therapists, and patients
- JWT authentication with bcrypt password hashing
- Patient records with functional short-term and long-term goals
- Rehabilitation plans, exercises, schedules, and precautions
- Patient training check-ins and automatically calculated completion rates
- Longitudinal charts for eight rehabilitation indicators
- Explainable progress-risk alerts based on recent clinical changes
- Per-metric recovery prediction using scikit-learn linear regression
- CSV export for assessment and training data
- English-first interface with complete English/Chinese switching
- Responsive layouts for desktop and mobile use

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, React Router 7, Recharts 3, Axios |
| Backend | FastAPI, Pydantic 2, Uvicorn |
| Data | SQLAlchemy 2, SQLite |
| Authentication | JWT, python-jose, passlib, bcrypt |
| Analytics | pandas, NumPy, scikit-learn |
| Testing | React Testing Library, Python API smoke tests, Puppeteer DOM audits |

## Architecture

```text
Browser
  |
  | React SPA, JWT Bearer token
  v
FastAPI /api
  |-- Authentication and role checks
  |-- Patient, plan, exercise, assessment, and log services
  |-- Trend aggregation and risk rules
  |-- scikit-learn prediction pipeline
  |-- CSV export
  v
SQLAlchemy ORM
  v
SQLite
```

Authorization is enforced by the backend, not only by frontend routing:

| Role | Access |
| --- | --- |
| Administrator | System overview, all patients, and user administration |
| Therapist | Assigned patients, rehabilitation plans, assessments, predictions, and exports |
| Patient | Own progress, own record, and training check-ins |

## Core Workflows

### Patient records

Therapists maintain demographic information, diagnosis, treatment stage, admission date, initial assessment, and observable functional goals. Long-term and short-term goals are stored separately.

### Rehabilitation plans

Each plan includes a date range, weekly frequency, session duration, status, precautions, and a set of exercises. Exercises store sets, repetitions, duration, descriptions, and a target clinical metric.

### Assessments

The application tracks the following measures:

| Metric | Scale | Range | Direction |
| --- | --- | --- | --- |
| Pain | Numeric Rating Scale (NRS) | 0-10 | Lower is better |
| Range of motion | Goniometer reading | 0-180 degrees | Higher is better |
| Muscle strength | Manual Muscle Testing (MMT) | 0-5 | Higher is better |
| Balance | Berg Balance Scale | 0-56 | Higher is better |
| Walking distance | 6-Minute Walk Test | 0-1000 m | Higher is better |
| Activities of daily living | Barthel Index | 0-100 | Higher is better |
| Training completion | Weekly check-in calculation | 0-100% | Higher is better |
| Composite recovery | Normalized recorded metrics | 0-100 | Higher is better |

The integer clinical scales are validated by the backend. Training completion is calculated from check-ins for the corresponding calendar week and is not entered manually.

### Trends and risk alerts

Assessment history is converted into chart-ready time series. The composite recovery index normalizes available metrics to their clinical ranges, reverse-scores pain, excludes missing values, and averages the result.

The risk engine compares recent assessments and reports clinically meaningful deterioration. Pain changes use an NRS minimum clinically important difference threshold of two points to avoid noisy alerts.

### Outcome prediction

The prediction service fits a separate `LinearRegression` model for each metric and projects the selected number of weeks ahead. Results include:

- Current and predicted values
- Weekly slope
- R-squared score
- Risk level and an explainable message
- Clinical range clipping and integer formatting where required

The prediction feature is intended as a trend-support tool, not a diagnostic system.

## Project Structure

```text
.
|-- backend/
|   |-- app/
|   |   |-- routers/          # FastAPI route modules
|   |   |-- auth.py           # JWT and password utilities
|   |   |-- models.py         # SQLAlchemy models
|   |   |-- prediction.py     # Regression and risk logic
|   |   |-- schemas.py        # Pydantic request/response models
|   |   `-- seed.py           # Deterministic demo data
|   `-- requirements.txt
|-- data-therapy/
|   |-- public/
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- api.js
|   |   |-- context.js        # Authentication and language contexts
|   |   `-- translations.js   # UI, server-message, and demo-data translations
|   `-- package.json
|-- docs/                     # API and architecture notes
|-- refdata/                  # Clinical references and verification scripts
`-- README.md
```

## Requirements

- Python 3.10 or newer
- Node.js 18 or newer
- npm

## Local Setup

### 1. Start the backend

From the repository root:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

```bash
# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS or Linux
source .venv/bin/activate
```

Install dependencies, create the demo database, and start FastAPI:

```bash
pip install -r requirements.txt
python -m app.seed
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API is available at `http://127.0.0.1:8000/api`, and Swagger UI is available at `http://127.0.0.1:8000/docs`.

### 2. Start the frontend

In a second terminal:

```bash
cd data-therapy
npm install
npm start
```

Open `http://localhost:3000`. Create React App proxies `/api` requests to the backend during development.

## Demo Accounts

Running `python -m app.seed` creates these accounts:

| Role | Username | Password |
| --- | --- | --- |
| Administrator | `admin` | `admin123` |
| Therapist | `wang.therapist` | `therapist123` |
| Patient | `zhang.wei` | `patient123` |

These credentials are for local demonstration only.

## Configuration

### Backend environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `REHAB_SECRET_KEY` | JWT signing secret | Development-only fallback |
| `REHAB_DB_PATH` | SQLite database path | `backend/rehab.db` |

Always set a strong `REHAB_SECRET_KEY` outside local development.

### Frontend environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `REACT_APP_API_BASE` | Optional backend origin | Same-origin `/api` requests |

Example:

```bash
REACT_APP_API_BASE=https://api.example.com npm run build
```

## API Overview

| Area | Representative endpoints |
| --- | --- |
| Authentication | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Users | `GET /api/users`, `PATCH /api/users/{id}` |
| Patients | `GET /api/patients`, `POST /api/patients`, `GET /api/patients/{id}` |
| Plans | `GET /api/plans/patient/{id}`, `POST /api/plans` |
| Exercises | `POST /api/plans/{id}/exercises`, `DELETE /api/plans/exercises/{id}` |
| Assessments | `GET /api/assessments/patient/{id}`, `POST /api/assessments` |
| Trends | `GET /api/assessments/patient/{id}/trends` |
| Insights | `GET /api/assessments/patient/{id}/insights` |
| Predictions | `POST /api/predictions/patient/{id}?weeks_ahead=4` |
| Training logs | `GET /api/training-logs/patient/{id}`, `POST /api/training-logs` |
| Export | `GET /api/export/patient/{id}/assessments`, `GET /api/export/patient/{id}/training` |
| Statistics | `GET /api/stats/overview` |

FastAPI provides the authoritative interactive API reference at `/docs` while the backend is running.

## Verification

Run frontend tests:

```bash
cd data-therapy
npm test -- --watchAll=false
```

Create an optimized frontend build:

```bash
npm run build
```

With the backend running, execute the API smoke test from the repository root:

```bash
python refdata/e2e_test.py
```

The repository also includes Puppeteer-based DOM checks for language switching, persistence, authenticated navigation, responsive layout, and visible Chinese-character auditing in English mode.

## Production Notes

- Set `REHAB_SECRET_KEY` through a secret manager or protected environment variable.
- Replace SQLite with a managed relational database when concurrent writes or horizontal scaling are required.
- Serve the frontend build through a production web server and proxy `/api` to FastAPI.
- Restrict CORS to the deployed frontend origin.
- Run FastAPI behind a production process manager and TLS-terminating reverse proxy.
- Do not use the bundled demo accounts or seeded data in a real clinical environment.

## Clinical Disclaimer

This project is an educational workflow and data-visualization system. Its alerts and predictions do not replace clinical judgment, diagnosis, treatment planning, or validated medical-device software.
