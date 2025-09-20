FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the aimakerspace library
COPY aimakerspace/ ./aimakerspace/

# Copy the API directory
COPY api/ .

# Expose port
EXPOSE 8000

# Run the full app
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
