#!/bin/bash
# File: ./init-keycloak.sh

# Wait for Keycloak to be ready
echo "Waiting for Keycloak to start..."
while ! curl -s -f http://localhost:8081/realms/master >/dev/null; do
  sleep 5
done

# Run initialization if not already done
if [ ! -f "./.keycloak-init-done" ]; then
  echo "Initializing Keycloak..."
  docker-compose -f docker-compose.yml run --rm keycloak-init
  touch ./.keycloak-init-done
  echo "Keycloak setup complete."
else
  echo "Keycloak already initialized. Skipping."
fi