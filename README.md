# Northstar · Wind Intelligence

A trader-focused UK wind generation dashboard for day-ahead procurement. It compares Elexon BMRS national WIND forecasts against metered WIND output, quantifies forecast error, and breaks accuracy down by delivery hour and forecast lead. Since January 2026 has passed, this is a retrospective analysis of the January forecast decisions, not a live forecast for tomorrow.

**Scope:** National WIND generation only, for January 2026 delivery intervals. The application does not query or display other fuel types.

## Submission links

- **Live application:** Not deployed yet. Add the Vercel URL here after deployment.
- **Public source repository:** Add the GitHub repository URL after creating the public repository.

Do not submit with these placeholders. The application requires a reachable FastAPI backend as well as the Vercel frontend; deployment steps are described below.

## Project files

```text
.
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py              # FastAPI routes, BMRS fetch, cache, metrics
│   ├── tests/
│   │   └── test_dashboard.py    # Forecast selection and metric tests
│   ├── Dockerfile               # Backend container build instructions
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Dashboard page, charts and interactions
│   │   ├── main.tsx             # React entry point and Redux provider
│   │   ├── store.ts             # Redux store
│   │   ├── windApi.ts           # RTK Query API and response types
│   │   ├── styles.css           # Responsive dashboard styling
│   │   └── vite-env.d.ts        # Vite environment variable types
│   ├── Dockerfile               # Frontend build and Nginx container
│   ├── index.html               # Browser entry HTML
│   ├── nginx.conf               # Static site and /api reverse proxy
│   ├── package.json             # JavaScript dependencies and commands
│   ├── tsconfig.json            # TypeScript compiler settings
│   └── vite.config.ts           # Vite development proxy and build settings
├── docker-compose.yml           # Runs backend and frontend together
├── vercel.json                  # Vercel frontend build settings
├── .gitignore                   # Excludes dependencies and generated files
└── README.md                    # Setup, architecture, methodology and AI disclosure
```

## Run locally without Docker (recommended for a first run)

You need Python 3.11 or newer and Node.js 20 or newer. The frontend and backend are two separate programs, so open **two terminals** in VS Code and leave both running while you use the app.

### Terminal 1: backend

Start in the project folder, then run:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

If PowerShell says script execution is disabled when activating the virtual environment, you can skip activation and install/run with your normal Python, or use `.\.venv\Scripts\python.exe -m pip install -r requirements.txt` and `.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000`.

When startup finishes, keep this terminal open. Check the API at [http://localhost:8000/api/health](http://localhost:8000/api/health); FastAPI's interactive API documentation is at [http://localhost:8000/docs](http://localhost:8000/docs).

### Terminal 2: frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (normally [http://localhost:5173](http://localhost:5173)). Keep both terminals open: the frontend sends its `/api` requests to the backend on port 8000. Stop either program with **Ctrl+C** in its terminal.

### Run the automated checks

In a terminal from the project folder:

```powershell
cd backend
python -m pip install pytest
python -m pytest -q
cd ..\frontend
npm install
npm run build
```

## Run with Docker

Docker lets you run the backend and frontend in isolated, packaged environments. After installing and starting **Docker Desktop**, open PowerShell in the project folder and run:

```powershell
docker compose up --build
```

On the first run, Docker downloads the base images and installs the dependencies, so it can take a little while. When the services are ready:

- Open the complete application at [http://localhost:8080](http://localhost:8080).
- The backend is available at [http://localhost:8000](http://localhost:8000), with interactive API documentation at [http://localhost:8000/docs](http://localhost:8000/docs).
- Leave this terminal open while using the application. Press **Ctrl+C** to stop the services. Run `docker compose down` afterward if you want to remove the stopped containers.

In simple terms:

1. A **Dockerfile** is a recipe for packaging one part of the app, together with the runtime and dependencies it needs.
2. An **image** is the built package made from that recipe. Docker Compose builds the frontend and backend images.
3. A **container** is a running instance of an image. Compose starts one container for the API and one for the website.
4. **Ports** make services reachable from your computer. In `8080:80`, the first number (`8080`) is the address on your computer and the second (`80`) is the port inside the frontend container. So you visit `localhost:8080`. The backend is similarly exposed at `localhost:8000`.
5. The frontend's Nginx web server forwards `/api` requests to the backend container over Docker's private service network. The backend then requests the forecast and actual data from BMRS.

Use the local, non-Docker instructions if you just want to edit or run the app without learning Docker first.

## Architecture

- **Frontend:** React + TypeScript, Redux Toolkit and RTK Query for API fetching, caching and state; Recharts for forecast/actual, hourly accuracy, lead-time accuracy and residual visualisations.
- **Backend:** Python + FastAPI. `GET /api/dashboard` fetches BMRS `FUELHH` (`fuelType=WIND`) and `WINDFOR`, normalizes half-hour data, computes metrics and serves a dashboard-shaped response. `GET /api/health` is the container health check.
- **Caching:** Dashboard responses are cached in process for 15 minutes by default. Set `CACHE_SECONDS` to change this. `GET /api/dashboard?refresh=true` forces a refresh.
- **Containers:** Docker Compose runs the FastAPI service and an Nginx-served frontend; Nginx proxies `/api` to the backend.

## Deployment before submission

Vercel hosts the React frontend; the FastAPI backend must also be deployed to a public Python host (for example, Render). A Vercel frontend by itself cannot call the backend running on your own computer.

1. Create a **public GitHub repository** with a random, non-identifying name. Push this project to it; do not upload `node_modules`, virtual environments, credentials or API secrets.
2. Deploy the `backend/` directory to a Python web-service host. Set its start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (use the host's documented port variable) and its root directory to `backend` if it asks for one. Confirm the deployed `/api/health` URL responds with `{"status":"ok"}`.
3. Create a Vercel project connected to your GitHub repository. Keep the project root at the repository root so `vercel.json` can run the configured frontend build.
4. In Vercel's project settings, set `VITE_API_BASE_URL` to the public backend API base URL, ending in `/api/` (for example, `https://your-service.example.com/api/`). Set the backend's `CORS_ORIGINS` environment variable to the Vercel site's origin (for example, `https://your-site.vercel.app`), then redeploy both services if required.
5. Test the public dashboard, refresh action, charts and CSV export. Put the real Vercel and GitHub URLs in the **Submission links** section above and in your submission.

Deployment needs accounts and credentials. None are configured in this project, so the public app and repository links must be filled in by you after publishing.

## Data and methodology

- BMRS API base: `https://data.elexon.co.uk/bmrs/api/v1/datasets`
- Actuals: `FUELHH`, filtered by `fuelType=WIND`.
- Forecasts: `WINDFOR`, selected by delivery `startTime` and forecast `publishTime`.
- Window: `2026-01-01T00:00:00Z` inclusive to `2026-02-01T00:00:00Z` exclusive.
- If BMRS has multiple actual publications for an interval, the latest-published actual is used.
- Forecast rule: for each half-hour delivery interval, choose the latest forecast published at least 24 hours before delivery. Intervals without an eligible forecast remain missing rather than being filled with a later, hindsight-informed forecast.
- Error/residual: forecast minus actual. Negative bias means wind was under-forecast. MAE and RMSE are in MW; MAPE is reported only for matched intervals with non-zero actual generation. Hourly MAE groups by UTC delivery hour. Lead-time MAE groups forecast leads into 24-hour bands.
- High-error markers flag matched intervals at or above the 90th-percentile absolute historical residual. This is an observed-error risk indicator, not a probabilistic forecast confidence interval.
- Metrics use only matched forecast/actual intervals. Empty or unavailable upstream data is reported explicitly; there is no fabricated demo dataset.
- BMRS endpoint availability and historical retention are controlled by Elexon; an upstream failure is surfaced as an API error and the frontend offers retry.

## AI tools

AI assistance (GitHub Copilot) was used during development to scaffold the application, draft implementation and tests, and refine documentation. Changes should be reviewed and validated by a developer before production use.

## Interview video preparation

Record two short sections within the required 10-minute maximum: up to five minutes for a customer-facing product walkthrough and up to five minutes for a technical-lead walkthrough. Show the running application and use the architecture, methodology, and file guide above for the technical explanation. Upload the video to YouTube as **Unlisted**, test the link in a private/incognito window, and include it with your repository and deployed-app links when submitting.
