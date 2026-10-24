#!/usr/bin/env python3
"""
Cryptographic Secret Key Generator for FIDELIS / CANON.
Generates an entropy-rich 32-character / 256-bit URL-safe secret key suitable for production JWT signing.
"""

import secrets

def generate_secret(num_bytes: int = 32) -> str:
    return secrets.token_urlsafe(num_bytes)

if __name__ == "__main__":
    secret = generate_secret(32)
    print("Generated 256-bit cryptographically secure SECRET_KEY:")
    print(secret)
    print("\nCopy into your production .env:")
    print(f"SECRET_KEY={secret}")
