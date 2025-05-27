
#!/usr/bin/env python3
import os
import requests
import json
import sys
import time

# Keycloak configuration
KEYCLOAK_URL = os.environ.get("KEYCLOAK_URL", "http://keycloak:8080")
ADMIN_USERNAME = os.environ.get("KC_BOOTSTRAP_ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("KC_BOOTSTRAP_ADMIN_PASSWORD", "admin")
REALM_NAME = "rapids-realm"

# Define roles
ROLES = [
    {"name": "admin", "description": "Administrator role with full access"},
    {"name": "engineer", "description": "Engineer role for development and system configuration"},
    {"name": "data_steward", "description": "Data steward role for data governance"},
    {"name": "analyst", "description": "Analyst role for data analysis"},
    {"name": "department_role", "description": "Department-specific access role"}
]

# Define groups
GROUPS = [
    {"name": "Administrators", "roles": ["admin"]},
    {"name": "Engineering", "roles": ["engineer"]},
    {"name": "Data Team", "roles": ["data_steward", "analyst"]},
    {"name": "Marketing", "roles": ["department_role", "analyst"]},
    {"name": "Sales", "roles": ["department_role"]}
]

# Define sample users
USERS = [
    {"username": "admin_user", "password": "password", "firstName": "Admin", "lastName": "User", "email": "admin@example.com", "groups": ["Administrators"]},
    {"username": "engineer_user", "password": "password", "firstName": "Engineer", "lastName": "User", "email": "engineer@example.com", "groups": ["Engineering"]},
    {"username": "data_steward_user", "password": "password", "firstName": "Data", "lastName": "Steward", "email": "data.steward@example.com", "groups": ["Data Team"]},
    {"username": "analyst_user", "password": "password", "firstName": "Analyst", "lastName": "User", "email": "analyst@example.com", "groups": ["Data Team"]},
    {"username": "marketing_user", "password": "password", "firstName": "Marketing", "lastName": "User", "email": "marketing@example.com", "groups": ["Marketing"]},
    {"username": "sales_user", "password": "password", "firstName": "Sales", "lastName": "User", "email": "sales@example.com", "groups": ["Sales"]}
]

# Client configuration for API access
CLIENT_CONFIG = {
    "clientId": "rapids-api",
    "name": "Rapids API Client",
    "enabled": True,
    "clientAuthenticatorType": "client-secret",
    "secret": "rapids-api-secret",
    "redirectUris": ["*"],
    "serviceAccountsEnabled": True,
    "authorizationServicesEnabled": True,
    "directAccessGrantsEnabled": True,
    "publicClient": False,
    "protocol": "openid-connect"
}

# NextJS App client configuration
NEXTJS_CLIENT_CONFIG = {
    "clientId": "nextjs-app",
    "name": "NextJS Dashboard Application",
    "enabled": True,
    "clientAuthenticatorType": "client-secret",
    "secret": "nextjs-app-secret",
    "redirectUris": [
        "http://localhost:3000/*",
        "http://localhost:3000/silent-check-sso.html",
        "http://localhost:3000/api/auth/callback/keycloak"
    ],
    "webOrigins": [
        "http://localhost:3000",
        "+"
    ],
    "serviceAccountsEnabled": False,
    "authorizationServicesEnabled": False,
    "directAccessGrantsEnabled": True,
    "publicClient": True,
    "protocol": "openid-connect",
    "attributes": {
        "post.logout.redirect.uris": "http://localhost:3000/",
        "pkce.code.challenge.method": "S256"
    },
    "standardFlowEnabled": True,
    "implicitFlowEnabled": False
}

def get_admin_token():
    """Get admin access token from Keycloak"""
    url = f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD,
        "grant_type": "password",
        "client_id": "admin-cli"
    }
    
    response = requests.post(url, headers=headers, data=data)
    if response.status_code != 200:
        print(f"Failed to get admin token: {response.text}")
        return None
        
    return response.json()["access_token"]

def wait_for_keycloak():
    """Wait for Keycloak to be ready"""
    max_attempts = 20
    attempts = 0
    
    while attempts < max_attempts:
        try:
            response = requests.get(f"{KEYCLOAK_URL}")
            if response.status_code == 200:
                print("Keycloak is ready")
                return True
        except Exception as e:
            pass
            
        print(f"Waiting for Keycloak to be ready ({attempts}/{max_attempts})...")
        attempts += 1
        time.sleep(5)
        
    print("Keycloak did not become ready in time")
    return False

def create_realm(admin_token):
    """Create a new realm"""
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Check if realm already exists
    response = requests.get(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}", headers=headers)
    if response.status_code == 200:
        print(f"Realm '{REALM_NAME}' already exists")
        return True
        
    # Create new realm
    realm_data = {
        "realm": REALM_NAME,
        "enabled": True,
        "displayName": "Rapids Realm",
        "accessTokenLifespan": 1800,  # 30 minutes
        "ssoSessionMaxLifespan": 36000,  # 10 hours
        "revokeRefreshToken": True,
        "refreshTokenMaxReuse": 0,
        "accessTokenLifespanForImplicitFlow": 900
    }
    
    response = requests.post(f"{KEYCLOAK_URL}/admin/realms", headers=headers, json=realm_data)
    if response.status_code != 201:
        print(f"Failed to create realm: {response.status_code} {response.text}")
        return False

    print(f"Successfully created realm '{REALM_NAME}'")
    return True

def create_roles(admin_token):
    """Create roles in the realm"""
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    for role in ROLES:
        # Check if role exists
        response = requests.get(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/roles/{role['name']}", headers=headers)
        if response.status_code == 200:
            print(f"Role '{role['name']}' already exists")
            continue
            
        # Create role
        response = requests.post(
            f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/roles",
            headers=headers,
            json=role
        )
        
        if response.status_code != 201:
            print(f"Failed to create role '{role['name']}': {response.status_code} {response.text}")
        else:
            print(f"Created role '{role['name']}'")

def create_groups(admin_token):
    """Create groups and assign roles to them"""
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Get all roles
    response = requests.get(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/roles", headers=headers)
    if response.status_code != 200:
        print(f"Failed to get roles: {response.status_code} {response.text}")
        return
        
    # Create a mapping of role names to role objects
    all_roles = {role["name"]: role for role in response.json()}
    
    # Create groups and assign roles
    for group in GROUPS:
        # Check if group exists
        response = requests.get(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/groups?search={group['name']}", headers=headers)
        if response.status_code == 200 and len(response.json()) > 0 and response.json()[0]["name"] == group["name"]:
            print(f"Group '{group['name']}' already exists")
            group_id = response.json()[0]["id"]
        else:
            # Create group
            response = requests.post(
                f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/groups",
                headers=headers,
                json={"name": group["name"]}
            )
            
            if response.status_code != 201:
                print(f"Failed to create group '{group['name']}': {response.status_code} {response.text}")
                continue
                
            # Get the created group ID
            response = requests.get(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/groups?search={group['name']}", headers=headers)
            if response.status_code != 200:
                print(f"Failed to get group '{group['name']}': {response.status_code} {response.text}")
                continue
                
            group_id = response.json()[0]["id"]
            print(f"Created group '{group['name']}' with ID {group_id}")
        
        # Assign roles to the group
        for role_name in group["roles"]:
            if role_name not in all_roles:
                print(f"Role '{role_name}' not found")
                continue
                
            role = all_roles[role_name]
            
            # Assign role to group
            response = requests.post(
                f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/groups/{group_id}/role-mappings/realm",
                headers=headers,
                json=[role]
            )
            
            if response.status_code != 204:
                print(f"Failed to assign role '{role_name}' to group '{group['name']}': {response.status_code} {response.text}")
            else:
                print(f"Assigned role '{role_name}' to group '{group['name']}'")

def create_users(admin_token):
    """Create sample users and add them to groups"""
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Get all groups
    response = requests.get(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/groups", headers=headers)
    if response.status_code != 200:
        print(f"Failed to get groups: {response.status_code} {response.text}")
        return
        
    # Create a mapping of group names to group IDs
    all_groups = {}
    for group in response.json():
        all_groups[group["name"]] = group["id"]
    
    # Create users
    for user in USERS:
        # Check if user exists
        response = requests.get(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/users?username={user['username']}", headers=headers)
        if response.status_code == 200 and len(response.json()) > 0:
            print(f"User '{user['username']}' already exists")
            user_id = response.json()[0]["id"]
        else:
            # Create user
            user_data = {
                "username": user["username"],
                "enabled": True,
                "firstName": user["firstName"],
                "lastName": user["lastName"],
                "email": user["email"],
                "credentials": [
                    {
                        "type": "password",
                        "value": user["password"],
                        "temporary": False
                    }
                ]
            }
            
            response = requests.post(
                f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/users",
                headers=headers,
                json=user_data
            )
            
            if response.status_code != 201:
                print(f"Failed to create user '{user['username']}': {response.status_code} {response.text}")
                continue
                
            # Get the created user ID
            response = requests.get(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/users?username={user['username']}", headers=headers)
            if response.status_code != 200:
                print(f"Failed to get user '{user['username']}': {response.status_code} {response.text}")
                continue
                
            user_id = response.json()[0]["id"]
            print(f"Created user '{user['username']}' with ID {user_id}")
        
        # Add user to groups
        for group_name in user["groups"]:
            if group_name not in all_groups:
                print(f"Group '{group_name}' not found")
                continue
                
            group_id = all_groups[group_name]
            
            # Add user to group
            response = requests.put(
                f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/users/{user_id}/groups/{group_id}",
                headers=headers
            )
            
            if response.status_code != 204:
                print(f"Failed to add user '{user['username']}' to group '{group_name}': {response.status_code} {response.text}")
            else:
                print(f"Added user '{user['username']}' to group '{group_name}'")

def create_client(admin_token, client_config):
    """Create a client for API access"""
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Check if client exists
    response = requests.get(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/clients?clientId={client_config['clientId']}", headers=headers)
    if response.status_code == 200 and len(response.json()) > 0:
        print(f"Client '{client_config['clientId']}' already exists")
        return
    
    # Create client
    response = requests.post(
        f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/clients",
        headers=headers,
        json=client_config
    )
    
    if response.status_code != 201:
        print(f"Failed to create client '{client_config['clientId']}': {response.status_code} {response.text}")
    else:
        print(f"Created client '{client_config['clientId']}'")

def configure_protocol_mappers(admin_token, client_id_name):
    """Configure protocol mappers to include roles in access tokens"""
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Get client ID
    response = requests.get(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/clients?clientId={client_id_name}", headers=headers)
    if response.status_code != 200 or len(response.json()) == 0:
        print(f"Failed to get client '{client_id_name}': {response.status_code} {response.text}")
        return
        
    client_id = response.json()[0]["id"]
    
    # Create realm roles mapper
    realm_roles_mapper = {
        "name": "realm roles",
        "protocol": "openid-connect",
        "protocolMapper": "oidc-usermodel-realm-role-mapper",
        "consentRequired": False,
        "config": {
            "multivalued": "true",
            "userinfo.token.claim": "true",
            "id.token.claim": "true",
            "access.token.claim": "true",
            "claim.name": "realm_access.roles",
            "jsonType.label": "String"
        }
    }
    
    response = requests.post(
        f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/clients/{client_id}/protocol-mappers/models",
        headers=headers,
        json=realm_roles_mapper
    )
    
    if response.status_code != 201:
        print(f"Failed to create realm roles mapper for {client_id_name}: {response.status_code} {response.text}")
    else:
        print(f"Created realm roles mapper for {client_id_name}")
    
    # Create client roles mapper
    client_roles_mapper = {
        "name": "client roles",
        "protocol": "openid-connect",
        "protocolMapper": "oidc-usermodel-client-role-mapper",
        "consentRequired": False,
        "config": {
            "multivalued": "true",
            "userinfo.token.claim": "true",
            "id.token.claim": "true",
            "access.token.claim": "true",
            "claim.name": "resource_access.${client_id}.roles",
            "jsonType.label": "String"
        }
    }
    
    response = requests.post(
        f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/clients/{client_id}/protocol-mappers/models",
        headers=headers,
        json=client_roles_mapper
    )
    
    if response.status_code != 201:
        print(f"Failed to create client roles mapper for {client_id_name}: {response.status_code} {response.text}")
    else:
        print(f"Created client roles mapper for {client_id_name}")
    
    # Add groups mapper for NextJS app
    if client_id_name == NEXTJS_CLIENT_CONFIG["clientId"]:
        groups_mapper = {
            "name": "groups",
            "protocol": "openid-connect",
            "protocolMapper": "oidc-group-membership-mapper",
            "consentRequired": False,
            "config": {
                "full.path": "false",
                "id.token.claim": "true",
                "access.token.claim": "true",
                "claim.name": "groups",
                "userinfo.token.claim": "true"
            }
        }
        
        response = requests.post(
            f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/clients/{client_id}/protocol-mappers/models",
            headers=headers,
            json=groups_mapper
        )
        
        if response.status_code != 201:
            print(f"Failed to create groups mapper for {client_id_name}: {response.status_code} {response.text}")
        else:
            print(f"Created groups mapper for {client_id_name}")
        
        # Add username mapper
        username_mapper = {
            "name": "username",
            "protocol": "openid-connect",
            "protocolMapper": "oidc-usermodel-property-mapper",
            "consentRequired": False,
            "config": {
                "userinfo.token.claim": "true",
                "user.attribute": "username",
                "id.token.claim": "true",
                "access.token.claim": "true",
                "claim.name": "preferred_username",
                "jsonType.label": "String"
            }
        }
        
        response = requests.post(
            f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/clients/{client_id}/protocol-mappers/models",
            headers=headers,
            json=username_mapper
        )
        
        if response.status_code != 201:
            print(f"Failed to create username mapper for {client_id_name}: {response.status_code} {response.text}")
        else:
            print(f"Created username mapper for {client_id_name}")

def export_realm_json(admin_token):
    """Export realm configuration to a JSON file"""
    headers = {
        "Authorization": f"Bearer {admin_token}",
    }
    
    response = requests.get(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/partial-export?exportClients=true&exportGroupsAndRoles=true", headers=headers)
    if response.status_code != 200:
        print(f"Failed to export realm: {response.status_code} {response.text}")
        return
    
    # Save to file
    with open("realm-export.json", "w") as f:
        json.dump(response.json(), f, indent=2)
        
    print("Exported realm configuration to realm-export.json")

def main():
    print("Initializing Keycloak configuration...")
    
    if not wait_for_keycloak():
        sys.exit(1)
    
    # Get admin token
    admin_token = get_admin_token()
    if not admin_token:
        print("Failed to get admin token")
        sys.exit(1)
    
    # Create realm
    if not create_realm(admin_token):
        print("Failed to create realm")
        sys.exit(1)
    
    # Create roles
    create_roles(admin_token)
    
    # Create groups
    create_groups(admin_token)
    
    # Create users
    create_users(admin_token)
    
    # Create API client
    create_client(admin_token, CLIENT_CONFIG)
    
    # Configure protocol mappers for API client
    configure_protocol_mappers(admin_token, CLIENT_CONFIG["clientId"])
    
    # Create NextJS client
    create_client(admin_token, NEXTJS_CLIENT_CONFIG)
    
    # Configure protocol mappers for NextJS client
    configure_protocol_mappers(admin_token, NEXTJS_CLIENT_CONFIG["clientId"])
    
    # Export realm configuration
    export_realm_json(admin_token)
    
    print("Keycloak configuration completed successfully")

if __name__ == "__main__":
    main()