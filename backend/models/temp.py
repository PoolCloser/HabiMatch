import httpx
import os
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

# Try different known Supabase JWKS endpoints
endpoints = [
    f"{SUPABASE_URL}/auth/v1/jwks",
    f"{SUPABASE_URL}/.well-known/jwks.json",
    f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json",
]

for url in endpoints:
    r = httpx.get(url, headers={"apikey": SUPABASE_KEY})
    print(f"{r.status_code} - {url}")
    if r.status_code == 200:
        print(r.text[:200])