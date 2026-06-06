"""Users management API (stub — admin only in production)."""
from fastapi import APIRouter
router = APIRouter()

DEMO_USERS = [
    {"id": 1, "email": "admin@crowdsafe.ai", "full_name": "System Administrator", "role": "admin", "is_active": True},
    {"id": 2, "email": "security@crowdsafe.ai", "full_name": "Security Officer", "role": "security_officer", "is_active": True},
    {"id": 3, "email": "manager@crowdsafe.ai", "full_name": "Event Manager", "role": "event_manager", "is_active": True},
    {"id": 4, "email": "viewer@crowdsafe.ai", "full_name": "Viewer Account", "role": "viewer", "is_active": True},
]

@router.get("/")
async def list_users():
    return {"users": DEMO_USERS, "total": len(DEMO_USERS)}

@router.get("/{user_id}")
async def get_user(user_id: int):
    user = next((u for u in DEMO_USERS if u["id"] == user_id), None)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(404, "User not found")
    return user
