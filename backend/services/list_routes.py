from api_service import router

for route in router.routes:
    print(f"{route.path} [{route.methods}] -> {route.name}")

