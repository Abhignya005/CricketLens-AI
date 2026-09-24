@echo off
echo Starting CricketLens AI Backend (FastAPI on http://127.0.0.1:8000)...
cd backend
python -m uvicorn app.main:app --reload --port 8000
pause

