# Tatoeba Chinese Example Sentences API Server
FROM python:3.11-slim

WORKDIR /app

# Install SQLite tools and wget
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Download the Tatoeba sentences database
RUN wget -O /app/sen_data.db "https://github.com/krmanik/Chinese-Example-Sentences/raw/main/Chinese%20Example%20Sentences/sen_data.db"

# Install Flask
RUN pip install --no-cache-dir flask flask-cors

# Copy server code
COPY server.py .

EXPOSE 6002

CMD ["python", "server.py"]
