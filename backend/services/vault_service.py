import os
import hvac

class VaultService:
    def __init__(self):
        self.client = hvac.Client(
            url=os.getenv("VAULT_ADDR", "http://vault:8200"),
            token=os.getenv("VAULT_TOKEN", "root")
        )
        assert self.client.is_authenticated(), "Vault authentication failed"

    def get_minio_creds(self):
            retries = 5
            for i in range(retries):
                try:
                    secret = self.client.secrets.kv.v2.read_secret_version(path="minio")
                    data = secret['data']['data']
                    return data['access_key'], data['secret_key']
                except hvac.exceptions.InvalidPath:
                    if i < retries - 1:
                        print(f"MinIO secret not found, retrying... ({i+1}/{retries})")
                        time.sleep(3)
                    else:
                        raise
