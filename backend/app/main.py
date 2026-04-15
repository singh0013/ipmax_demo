from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routes import (subnets_router, ips_router, dashboard_router,
                     audit_router, imports_router, auth_router, users_router,
                     discovery_router, gateways_router, tasks_router, support_router)
from .database import AsyncSessionLocal
from .models import User
from .auth import hash_password
from sqlalchemy import select


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(User).where(User.username == "admin"))
            if not result.scalar_one_or_none():
                admin = User(
                    username      = "admin",
                    email         = "admin@ipam.local",
                    password_hash = hash_password("Admin@123"),
                    role          = "admin",
                    is_active     = True,
                )
                db.add(admin)
                await db.commit()
                print("✅ Default admin user created (admin / Admin@123) — please change password after login")
            else:
                print("✅ Admin user already exists")
        except Exception as e:
            print(f"⚠️  Could not create admin user: {e}")

    # Scheduler disabled in demo version
    print("ℹ️  Demo version — scheduler disabled")

    yield  # App runs here


app = FastAPI(
    title       = settings.APP_NAME,
    version     = settings.VERSION,
    docs_url    = "/api/docs",
    redoc_url   = "/api/redoc",
    openapi_url = "/api/openapi.json",
    lifespan    = lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:80", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router,      prefix="/api")
app.include_router(users_router,     prefix="/api")
app.include_router(subnets_router,   prefix="/api")
app.include_router(ips_router,       prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(audit_router,     prefix="/api")
app.include_router(imports_router,   prefix="/api")
app.include_router(discovery_router, prefix="/api")
app.include_router(gateways_router,  prefix="/api")
app.include_router(tasks_router,     prefix="/api")
app.include_router(support_router,   prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.VERSION}
