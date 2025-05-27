### Stage 1: Build Frontend ###
FROM node:20-alpine AS frontend

WORKDIR /app

# Copy only frontend files
COPY package*.json ./
# COPY frontend ./frontend
# WORKDIR /app/frontend
RUN npm ci

# Copy remaining files and build
COPY . .
RUN npm run build

### Stage 2: Build Backend ###
# FROM python:3.10-alpine
#FROM python:3.10
#FROM amazoncorretto:8-alpine3.21-jre
FROM python:3.10-slim

WORKDIR /app

# Set environment variables for better Python performance
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100 \
    PYTHONPATH=/app

# Set Java options for better memory management
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75 -XX:InitialRAMPercentage=50"

# Install Java 11
RUN apt-get update && apt-get install -y --no-install-recommends \
    default-jdk \
    curl \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME
#ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
#ENV PATH=$JAVA_HOME/bin:$PATH

# Copy frontend build into final image
COPY --from=frontend /app/dist /app/dist

# Install Python dependencies
# Install Python dependencies

RUN pip install --upgrade pip

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir \
    numpy==1.21.6 \
    pandas==1.4.3 \
    -r requirements.txt
    # && pip install --force-reinstall --no-cache-dir numpy pandas
    # Remove build dependencies to reduce image size
    # apk del cmake make g++ gcc musl-dev python3-dev postgresql-dev
# Copy backend code
COPY backend /app/backend

# Create a non-root user and set permissions
RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Start the application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "4"]