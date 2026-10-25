# Northstar — Wind Intelligence

## Files and directories

```text
.
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py                 # FastAPI API, BMRS integration, and metrics
│   ├── tests/
│   │   └── test_dashboard.py       # Backend tests
│   ├── Dockerfile                  # Backend container instructions
│   └── requirements.txt            # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # Dashboard and charts
│   │   ├── main.tsx                # React application entry point
│   │   ├── store.ts                # Redux store
│   │   ├── windApi.ts              # RTK Query API and data types
│   │   ├── styles.css              # Dashboard styles
│   │   └── vite-env.d.ts           # Vite environment types
│   ├── Dockerfile                  # Frontend container instructions
│   ├── index.html                  # Web page entry point
│   ├── nginx.conf                  # Frontend hosting and API proxy
│   ├── package.json                # Frontend dependencies and scripts
│   ├── tsconfig.json               # TypeScript configuration
│   └── vite.config.ts              # Vite configuration
├── .gitignore                      # Excludes generated and private files
├── docker-compose.yml              # Starts frontend and backend together
├── vercel.json                     # Vercel frontend build configuration
└── README.md                       # Project files and run instructions
```

## How to start the application

### With Docker

Install and start Docker Desktop. Open PowerShell in the project root—the folder containing `docker-compose.yml`—and run:

```powershell
docker compose up --build
```

When the containers have started, open **http://localhost:8080**. Keep the terminal open while using the application. Press **Ctrl+C** to stop it. To remove the stopped containers, run `docker compose down` from the project root.

### Without Docker

Install Python 3.11 or newer and Node.js 20 or newer. Open two PowerShell terminals in the project root.

In the first terminal, start the backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

In the second terminal, start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, normally **http://localhost:5173**. Keep both terminals open while using the application.

## Vercel/Heroku application link

**Application URL:** 
