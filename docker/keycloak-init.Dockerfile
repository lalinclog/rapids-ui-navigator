
FROM python:3.10-slim

WORKDIR /app

# Install necessary packages
RUN apt-get update && apt-get install -y \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install requests python-keycloak

# Container will execute this script
CMD ["python", "backend/scripts/keycloak_init.py"]