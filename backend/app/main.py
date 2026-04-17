from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends
from app.middleware.auth import require_auth

app = FastAPI(title="HabiMatch API")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/protected")
def protected_example(user: dict = Depends(require_auth)):
    return {"user_id": user.get("sub"), "email": user.get("email")}
