FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/data /app/exports

# Set Python path for imports
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8004

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004"] 