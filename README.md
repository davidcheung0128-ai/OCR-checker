# FSEE AI HVAC Duct Pressure Drop Calculator

AI-powered web app for analyzing HVAC engineering drawings (PDF) and calculating duct pressure drop using Young's Engineering Company standards. Upload a duct layout PDF, review AI-detected duct sections and fittings, adjust values, and export an Excel calculation report.

## Features

- **PDF drawing upload** — sends drawings to MinerU for visual parsing
- **AI-assisted duct detection** — identifies duct runs, fittings, and dimensions (VLLM integration planned)
- **Pressure drop calculation** — Darcy/Colebrook friction and ASHRAE fitting coefficients
- **Excel export** — generates Young's Engineering standard ESP calculation sheets
- **User feedback loop** — stores manual corrections in PostgreSQL for future model training

---

## Requirements

You only need **one** of the two setups below.

### Option A — Docker (recommended for all devices)

| Requirement | Minimum version |
|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS) or [Docker Engine](https://docs.docker.com/engine/install/) (Linux) | 20.10+ |
| [Docker Compose](https://docs.docker.com/compose/install/) | v2.0+ (included in Docker Desktop) |

Works on **Windows 10/11**, **macOS (Intel & Apple Silicon)**, and **Linux**.

### Option B — Local development (without Docker)

| Tool | Version |
|---|---|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL | 14+ (optional — backend falls back to SQLite if not configured) |

---

## Quick Start (Docker)

This is the fastest way to run the app on any machine.

### 1. Get the latest code

**New install:**

```bash
git clone https://github.com/davidcheung0128-ai/OCR-checker.git
cd OCR-checker
```

**Already cloned?** Pull the latest fix (required if you see a blank white screen):

```bash
cd OCR-checker
git pull origin main
```

### 2. Start all services

```bash
docker compose up --build
```

If containers were already running, restart them after pulling:

```bash
docker compose down
docker compose up --build
```

First run downloads images and installs dependencies — this may take a few minutes.

### 3. Open the app

| Service | URL |
|---|---|
| **Frontend (main UI)** | http://localhost:3000 |
| **Backend API docs** | http://localhost:8000/docs |
| **Backend health check** | http://localhost:8000 |

### 4. Stop the app

Press `Ctrl+C` in the terminal, then:

```bash
docker compose down
```

To also remove the database volume:

```bash
docker compose down -v
```

---

## Restarting the App

Use these commands whenever you pull new code, change config, or something stops working.

### Docker — quick restart (keep data)

Stop and start again without rebuilding:

```bash
cd OCR-checker
docker compose down
docker compose up
```

### Docker — full restart (after `git pull` or code changes)

Rebuild images and restart all services:

```bash
cd OCR-checker
git pull origin main
docker compose down
docker compose up --build
```

Run in the background (detached):

```bash
docker compose up --build -d
```

View logs while running in the background:

```bash
docker compose logs -f
```

Restart **one service only** (e.g. frontend after UI changes):

```bash
docker compose up -d --build frontend
docker compose restart backend
```

### Local dev — restart backend

In the backend terminal, press `Ctrl+C`, then:

```bash
cd backend
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate         # Windows
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Local dev — restart frontend

In the frontend terminal, press `Ctrl+C`, then:

```bash
cd frontend
npm run dev
```

If the UI still looks stale after a restart, hard-refresh the browser:

- **macOS:** `Cmd + Shift + R`
- **Windows / Linux:** `Ctrl + Shift + R`

---

## Git Workflow — Pull, Commit, and Push

Basic workflow for saving your changes and sharing them on GitHub.

### 1. Check what changed

```bash
cd OCR-checker
git status
```

### 2. Pull latest code first (avoid conflicts)

```bash
git pull origin main
```

### 3. Stage your changes

Stage specific files:

```bash
git add README.md
git add frontend/src/components/App.jsx
```

Or stage everything that changed:

```bash
git add .
```

### 4. Commit with a message

```bash
git commit -m "Describe what you changed in one clear sentence"
```

Example:

```bash
git commit -m "Update duct table labels and fix preview layout"
```

### 5. Push to GitHub

```bash
git push origin main
```

If this is your **first push on a new branch**:

```bash
git checkout -b my-feature-branch
git push -u origin my-feature-branch
```

### 6. Restart the app after pushing (Docker)

```bash
docker compose down
docker compose up --build
```

### Common git commands

| Task | Command |
|---|---|
| See recent commits | `git log --oneline -5` |
| Discard unstaged edits to a file | `git restore path/to/file` |
| See line-by-line changes | `git diff` |
| Create a new branch | `git checkout -b branch-name` |
| Switch back to main | `git checkout main` |

### If push is rejected

Someone else pushed first. Pull, then push again:

```bash
git pull origin main
git push origin main
```

If git reports merge conflicts, open the listed files, fix the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`), then:

```bash
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

---

## Local Development Setup (without Docker)

Use this if you prefer running services directly on your machine.

### Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend runs at http://localhost:8000.

### Frontend

Open a **second terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend runs at http://localhost:3000.

### Optional: configure the API URL

If the backend is on a different host or port, create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000
```

Restart the frontend after changing this file.

---

## Accessing from Other Devices on Your Network

The frontend and backend bind to `0.0.0.0`, so other devices on the same Wi-Fi/LAN can reach the app.

1. Find your machine's local IP address:
   - **Windows:** `ipconfig` → look for `IPv4 Address`
   - **macOS / Linux:** `ip addr` or `ifconfig` → look for `inet 192.168.x.x`

2. On another device (phone, tablet, another PC), open:
   ```
   http://<your-ip-address>:3000
   ```

3. If using Docker and the frontend cannot reach the backend from a remote device, set the API URL to your machine's IP in `docker-compose.yml`:
   ```yaml
   environment:
     - VITE_API_URL=http://<your-ip-address>:8000
   ```
   Then restart: `docker compose up -d --build frontend`

---

## How to Use the App

### Step 1 — Upload a PDF drawing

1. Open http://localhost:3000
2. In **"1. 上傳工程圖紙 (PDF)"**, click the upload area or drag and drop a **PDF** HVAC duct layout
3. The file is sent to the backend, which calls MinerU for visual parsing
4. Wait for the status message to change to **"解析成功"** (analysis complete)

> **Note:** Only PDF files are accepted by the backend. PNG upload is shown in the UI but not yet supported server-side.

### Step 2 — Configure system settings

In **"2. 系統與比例尺設定"**:

| Field | Description | Default |
|---|---|---|
| **設計總風量 (m³/s)** | Total design air flow rate for the system | `0.25` |
| **比例尺校準 (mm/px)** | Scale ratio for converting drawing pixels to real-world mm | `1.0` |

Adjust these to match your project's design conditions before exporting.

### Step 3 — Review, manually label, and correct components

The AI bounding boxes may not align correctly. Use manual labeling to fix them:

1. Select a row in the **Duct Section Details** table
2. Click **Re-box #N** (or toggle **Draw Box** for a new component)
3. **Delete** removes a wrong AI label box entirely (saved as incorrect detection for training)
4. Drag a rectangle on the drawing preview around the correct component
5. Fill in the label dialog (name, type, dimensions, ASHRAE code)
6. Click **Save & Train** — this stores the correction in the database for future recognition

| Indicator | Meaning |
|---|---|
| **Green box** | Manually verified label |
| **★** | Matched automatically from saved training data |
| **✓** | Manually labeled this session |

On the next upload, similar components (overlapping bounding boxes) will use your saved labels automatically.

### Step 4 — Preview, edit, and export Calculate sheet

1. Open **Step 4 — 標準 Excel** in the left sidebar
2. The preview shows the Young's `Calculate(B1F)(EAF-B1-02)` format (filename derived from your PDF, e.g. `02_EAF-B1-02@B1F.pdf` → `Calculate(B1F)(EAF-B1-02)-2.csv`)
3. **Amber cells** are editable (location, ref, flow rate, fitting names, dimensions)
4. **Green cells** auto-recalculate (D, Re, velocity, pressure loss) using Colebrook/Darcy formulas
5. Click a cell to view its formula in the formula bar
6. **Download** saves the filled CSV as `Calculate(FLOOR)(REF-NO)-2.csv`
7. **Template (.csv)** downloads the empty `Calculate(FLOOR)(REF-NO).csv` shell

### Step 5 — Submit corrections via API (optional)

If the AI misidentifies a fitting, corrections can be submitted via the API for future model training:

```bash
curl -X POST "http://localhost:8000/api/feedback" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "drawing.pdf",
    "original": "Elbow",
    "corrected": "T-Junction",
    "bbox": {"x": 10, "y": 20, "w": 100, "h": 50}
  }'
```

---

## Environment Variables

### Backend (`docker-compose.yml` or shell environment)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./local_fallback.db` | PostgreSQL connection string |
| `VLLM_API_URL` | `https://ai.fse.com.hk/vllm/v1` | VLLM API endpoint |
| `VLLM_MODEL` | `Qwen/Qwen3.6-27B-FP8` | LLM model name |
| `MINERU_API_URL` | `https://ai.fse.com.hk/mineru/file_parse` | MinerU PDF parsing endpoint |
| `OLLAMA_EMBEDDING_API` | `https://ai.fse.com.hk/api2` | Embedding API for legend matching |
| `OLLAMA_EMBEDDING_MODEL` | `bge-m3` | Embedding model name |

### Frontend

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend API base URL |

> **Important:** Vite uses `VITE_` prefixed variables (not `REACT_APP_`). Set these before starting the frontend.

---

## Project Structure

```
OCR-checker/
├── backend/
│   ├── main.py              # FastAPI app — upload, feedback, health check
│   ├── physics_engine.py    # Darcy/Colebrook pressure drop calculations
│   ├── excel_exporter.py    # Young's Engineering Excel generator
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.jsx         # React entry point
│   │   └── components/      # UI components (App, Header, Upload, Settings, Table)
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── Dockerfile
├── docker-compose.yml       # Orchestrates db + backend + frontend
└── README.md
```

---

## Troubleshooting

### Blank white screen at http://localhost:3000

**Cause:** The frontend crashed on load due to an environment variable error.

**Fix:** Make sure you are on the latest code. The app uses `import.meta.env.VITE_API_URL` (Vite syntax), not `process.env.REACT_APP_API_URL`.

Open the browser DevTools console (`F12` → Console). If you see `ReferenceError: process is not defined`, pull the latest changes and restart the frontend.

### Port already in use

```bash
# Find what is using port 3000 or 8000
# Windows
netstat -ano | findstr :3000

# macOS / Linux
lsof -i :3000
```

Change the port in `docker-compose.yml` or stop the conflicting process.

### Frontend cannot connect to backend

- Confirm the backend is running: visit http://localhost:8000 — you should see `{"status":"ok",...}`
- Check `VITE_API_URL` points to the correct backend address
- After changing env vars in Docker, rebuild: `docker compose up -d --build frontend`

### `Cannot find module @rollup/rollup-*` (npm error)

Reinstall frontend dependencies:

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### PDF upload fails

- Ensure the file is a valid `.pdf`
- The MinerU API must be reachable from your backend (requires network access to `ai.fse.com.hk` or your configured endpoint)
- Check backend logs: `docker compose logs backend`

### Docker containers won't start on Apple Silicon (M1/M2/M3)

Docker Desktop handles architecture translation automatically. If a specific image fails, add `platform: linux/amd64` under the service in `docker-compose.yml`.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/api/upload` | Upload PDF for MinerU analysis |
| `GET` | `/api/training/labels` | List saved manual labels for training |
| `POST` | `/api/feedback` | Save manual label correction (JSON body) |
| `POST` | `/api/export/excel` | Generate and download Young's Standard Excel |

Interactive docs: http://localhost:8000/docs

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS, Axios, Lucide Icons |
| Backend | FastAPI, Uvicorn, SQLAlchemy, httpx |
| Database | PostgreSQL (pgvector) with SQLite fallback |
| AI Services | MinerU (PDF parsing), VLLM/Qwen (structuring), Ollama/bge-m3 (embeddings) |
| Physics | NumPy, SciPy (Colebrook solver), NetworkX |
| Export | pandas, openpyxl |
| Infrastructure | Docker Compose |

---

## License

Internal use — Young's Engineering Company / FSEE.
