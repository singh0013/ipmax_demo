"""
IPMAX Demo Version — Users routes
Create / Delete: LOCKED (402)
List / Edit / Reset password: OPEN
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..models import User
from ..auth import hash_password, require_admin, get_current_user
from ..schemas import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])

PURCHASE_RESPONSE = JSONResponse(
    status_code=402,
    content={"detail": "purchase_required"}
)

class PasswordChange(BaseModel):
    current_password: Optional[str] = None
    new_password: str


# ── OPEN: List ────────────────────────────────────────────────────

@router.get("/", response_model=List[UserResponse])
async def list_users(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(User).order_by(User.username))
    return result.scalars().all()


# ── LOCKED: Create ────────────────────────────────────────────────

@router.post("/", status_code=201)
async def create_user(_=Depends(require_admin)):
    return PURCHASE_RESPONSE


# ── OPEN: Edit ────────────────────────────────────────────────────

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(user, key, value)
    await db.flush()
    await db.refresh(user)
    return user


# ── OPEN: Reset password ──────────────────────────────────────────

@router.post("/{user_id}/reset-password", response_model=UserResponse)
async def admin_reset_password(
    user_id: UUID,
    payload: PasswordChange,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = hash_password(payload.new_password)
    await db.flush()
    await db.refresh(user)
    return user


@router.post("/me/change-password")
async def change_own_password(
    payload: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import bcrypt
    if not payload.current_password:
        raise HTTPException(status_code=400, detail="Current password required")
    if not bcrypt.checkpw(payload.current_password.encode(), current_user.password_hash.encode()):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    current_user.password_hash = hash_password(payload.new_password)
    await db.flush()
    return {"message": "Password changed successfully"}


# ── LOCKED: Delete ────────────────────────────────────────────────

@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: UUID, _=Depends(require_admin)):
    return PURCHASE_RESPONSE
