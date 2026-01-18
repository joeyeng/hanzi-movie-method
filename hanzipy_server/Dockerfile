# HanziPy Server Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY server.py .

# Port is set via PORT environment variable (default: 5000)
EXPOSE 6001

CMD ["python", "server.py"]
