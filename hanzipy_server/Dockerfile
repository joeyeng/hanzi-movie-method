# HanziPy Server Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY server.py .
COPY frequency_data.py .
COPY build_offline_db.py .
COPY build_pronunciation_db.py .
COPY subtlex_data/ ./subtlex_data/

# Port is set via PORT environment variable (default: 5000)
EXPOSE 6001

CMD ["python", "server.py"]
