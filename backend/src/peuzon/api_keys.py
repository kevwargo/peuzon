import secrets
from base64 import urlsafe_b64encode
from hashlib import sha256


def encode(secret: str) -> str:
    binhash = sha256(secret.encode()).digest()
    return urlsafe_b64encode(binhash).decode()


def generate(table=None) -> str:
    secret = secrets.token_urlsafe(32)
    if table:
        table.put_item(Item={"hash": encode(secret)})

    return secret
