FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the simple app
COPY api/simple_app.py .

# Expose port
EXPOSE 8000

# Run the simple app
CMD ["python", "-m", "uvicorn", "simple_app:app", "--host", "0.0.0.0", "--port", "8000"]
