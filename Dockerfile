# ---- web (React + Vite + Tailwind) ----
FROM node:20-slim AS webbuild
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ---- api + models ----
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY matches.csv ./
# data/deliveries.csv (26MB) is gitignored — if present, the live model trains;
# if absent, src/train.py skips it and the API returns 503 for /api/live (see data/README.md).
COPY data/ ./data/
COPY src/ ./src/
COPY api/ ./api/
COPY frontend/ ./frontend/
COPY --from=webbuild /web/dist ./web/dist
RUN python -m src.train
EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
