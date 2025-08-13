FROM python:3.11-slim

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY api/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY api/ .

# Make debug script executable
RUN chmod +x startup_debug.py

# Expose port (will be overridden by Railway's PORT env var)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$PORT/api/health || exit 1

# Run debug script first, then the application
CMD ["sh", "-c", "python startup_debug.py && python -m uvicorn app:app --host 0.0.0.0 --port $PORT"]
