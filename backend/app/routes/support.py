"""
IPMAX Demo Version — Support routes
Logs download, backup, restore: LOCKED (402)
Status check: OPEN
"""
import os
import subprocess
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..auth import require_admin

router = APIRouter(prefix="/support", tags=["Support"])

PURCHASE_RESPONSE = JSONResponse(
    status_code=402,
    content={"detail": "purchase_required"}
)


# ── LOCKED endpoints ──────────────────────────────────────────────

@router.get("/logs/download")
async def download_logs(_=Depends(require_admin)):
    return PURCHASE_RESPONSE

@router.post("/backup/download")
async def download_backup(_=Depends(require_admin)):
    return PURCHASE_RESPONSE

@router.post("/backup/restore")
async def restore_backup(_=Depends(require_admin)):
    return PURCHASE_RESPONSE

@router.get("/backup/restore/{job_id}")
async def restore_status(job_id: str, _=Depends(require_admin)):
    return PURCHASE_RESPONSE


# ── OPEN: Status ──────────────────────────────────────────────────

@router.get("/status")
async def support_status(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    try:
        await db.execute(sa_text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    pg_ok = subprocess.run(["which", "pg_dump"], stdout=subprocess.PIPE).returncode == 0
    return {"db_connected": db_ok, "pg_dump_available": pg_ok,
            "tz": os.environ.get("TZ", "UTC"), "version": "0.4.0"}
