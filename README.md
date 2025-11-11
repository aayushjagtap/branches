# Branches — ProjectBoard (React + FastAPI)

A lightweight Trello/Jira-style project management app built to showcase full-stack development skills.  
Built with **React + TypeScript (Vite)** on the frontend and **FastAPI (Python)** on the backend.

---

## Tech Stack

| Layer | Technology |
|--------|-------------|
| Frontend | React, TypeScript, Vite |
| Backend | FastAPI, Uvicorn |
| Database (planned) | PostgreSQL + SQLAlchemy |
| Auth (planned) | JWT authentication |
| Deployment (planned) | Vercel (FE), Render/Fly.io (BE) |

---

## Quick Start (Local)

### 1. Prerequisites
- Node.js 18+ and npm
- Python 3.10+ installed
- Git installed

### 2. Run the Backend
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install fastapi "uvicorn[standard]" loguru
python -m uvicorn app.main:app --reload --port 8000
# visit http://localhost:8000/health -> {"status": "ok"}
