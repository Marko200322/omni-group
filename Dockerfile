FROM python:3.12-slim AS base
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src /app/src
ENV PYTHONPATH=/app/src

FROM base AS forge
CMD ["python", "-m", "forge.master_forge"]

FROM base AS atina
CMD ["python", "-m", "atina.worker"]

FROM base AS astra
ENV PORT=8080
CMD ["gunicorn", "-b", "0.0.0.0:8080", "--workers", "2", "--threads", "4", "astra.app:app"]
