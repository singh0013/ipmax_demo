"""
IPMAX Demo Version — Scheduled Tasks (all locked, 402)
"""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from ..auth import require_admin, require_viewer

router = APIRouter(prefix="/schedules", tags=["Schedules"])

PURCHASE_RESPONSE = JSONResponse(
    status_code=402,
    content={"detail": "purchase_required"}
)


@router.get("")
async def list_schedules(_=Depends(require_viewer)):
    return PURCHASE_RESPONSE

@router.get("/subnet/{subnet_id}")
async def get_subnet_schedule(subnet_id: str, _=Depends(require_viewer)):
    return PURCHASE_RESPONSE

@router.post("")
async def create_schedule(_=Depends(require_admin)):
    return PURCHASE_RESPONSE

@router.patch("/{schedule_id}")
async def patch_schedule(schedule_id: str, _=Depends(require_admin)):
    return PURCHASE_RESPONSE

@router.delete("/{schedule_id}")
async def delete_schedule(schedule_id: str, _=Depends(require_admin)):
    return PURCHASE_RESPONSE


# ── Stub for main.py import compatibility ───────────────────────

async def start_scheduler():
    """Disabled in demo version."""
    print("ℹ️  Scheduler disabled in demo version")
