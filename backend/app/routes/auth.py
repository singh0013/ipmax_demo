from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timezone

from ..database import get_db
from ..models import User
from ..auth import verify_password, create_access_token, get_current_user
from ..schemas import LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.username == payload.username, User.is_active == True)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    # Update last_login
    await db.execute(
        update(User).where(User.id == user.id)
        .values(last_login=datetime.now(timezone.utc))
    )

    token = create_access_token({"sub": user.username, "role": user.role})
    # Flag first-time login (default password check)
    must_change = (user.username == "admin" and
                   __import__('bcrypt').checkpw(b"Admin@123", user.password_hash.encode()))
    return TokenResponse(
        access_token       = token,
        role               = user.role,
        username           = user.username,
        must_change_password = must_change,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
