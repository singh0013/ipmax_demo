"""
IPMAX Demo Version — Import/Export routes
Import, export, and template endpoints are locked (402).
Activity log endpoints remain open.
"""
import io
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from ..database import get_db
from ..models import ActivityLog
from ..schemas import ActivityLogResponse
from ..auth import get_current_user

router = APIRouter(prefix="/import", tags=["Import / Export"])

PURCHASE_RESPONSE = JSONResponse(
    status_code=402,
    content={"detail": "purchase_required"}
)


# ── LOCKED: IP Import / Export ───────────────────────────────────

@router.post("/ips/csv")
async def import_ips_csv(_=Depends(get_current_user)):
    return PURCHASE_RESPONSE

@router.get("/ips/csv/template")
async def download_ip_template(_=Depends(get_current_user)):
    return PURCHASE_RESPONSE

@router.get("/ips/export")
async def export_ips_csv(_=Depends(get_current_user)):
    return PURCHASE_RESPONSE


# ── LOCKED: Subnet Import / Export ──────────────────────────────

@router.post("/subnets/csv")
async def import_subnets_csv(_=Depends(get_current_user)):
    return PURCHASE_RESPONSE

@router.get("/subnets/csv/template")
async def download_subnet_template(_=Depends(get_current_user)):
    return PURCHASE_RESPONSE

@router.get("/subnets/export")
async def export_subnets_csv(_=Depends(get_current_user)):
    return PURCHASE_RESPONSE


# ── OPEN: Activity Log ───────────────────────────────────────────

@router.get("/activity", response_model=List[ActivityLogResponse])
async def list_activity(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    result = await db.execute(
        select(ActivityLog).order_by(ActivityLog.started_at.desc()).limit(limit)
    )
    return result.scalars().all()


@router.get("/activity/{job_id}", response_model=ActivityLogResponse)
async def get_activity(job_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    from fastapi import HTTPException
    result = await db.execute(select(ActivityLog).where(ActivityLog.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Activity not found")
    return job


# ── OPEN: Column metadata (used by UI dropdowns) ─────────────────

@router.get("/columns/subnets")
async def subnet_columns(_=Depends(get_current_user)):
    return {"default": ["network","name","gateway","vlan_id","interface_name","location"],
            "available": {"network":"Network (CIDR)","name":"Name","gateway":"Gateway",
                          "vlan_id":"VLAN ID","interface_name":"Interface Name",
                          "location":"Location","description":"Description","created_at":"Created At"}}

@router.get("/columns/ips")
async def ip_columns(_=Depends(get_current_user)):
    return {"default": ["ip_address","hostname","status","subnet","location","assigned_to","mac_address","tags"],
            "available": {"ip_address":"IP Address","hostname":"Hostname","status":"Status",
                          "subnet":"Subnet (CIDR)","subnet_name":"Subnet Name","location":"Location",
                          "assigned_to":"Assigned To","mac_address":"MAC Address","tags":"Tags",
                          "description":"Description","created_at":"Created At"}}
