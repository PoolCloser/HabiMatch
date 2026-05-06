import httpx
import os
from jose import jwt
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("EXPO_PUBLIC_SUPABASE_ANON_KEY")

# Step 1: get token
response = httpx.post(
    f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
    headers={"apikey": SUPABASE_KEY},
    json={"email": "test@gmail.com", "password": "SuperMonkey"}
)
print("Auth status:", response.status_code)
print("Response:", response.json())
token = response.json()["access_token"]

# Step 2: fetch JWKS manually with apikey header
jwks_response = httpx.get(
    f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json",
    headers={"apikey": SUPABASE_KEY}
)
print("JWKS status:", jwks_response.status_code)

payload = jwt.decode(
    token,
    jwks_response.json(),
    algorithms=["ES256"],
    audience="authenticated",
)
print("SUCCESS - user id:", payload["sub"])