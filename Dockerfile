
FROM node:20-slim AS frontend

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM python:3.10-slim

WORKDIR /app

# Install Java 11
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openjdk-11-jdk \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH

# Copy frontend build
COPY --from=frontend /app/dist /app/dist

# Install Python dependencies
RUN pip install --no-cache-dir \
    fastapi==0.103.1 \
    uvicorn==0.23.2 \
    python-multipart==0.0.6 \
    minio==7.1.15 \
    psycopg2-binary==2.9.7 \
    sqlalchemy==2.0.20 \
    spark-rapids-user-tools==23.10.0 \
    pydantic==2.0.3 \
    pandas==1.5.3

# Copy backend code
COPY backend /app/backend

# Expose port
EXPOSE 8080

# Start the application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
