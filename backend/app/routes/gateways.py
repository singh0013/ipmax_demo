"""
IPMAX Demo Version — Gateways / Device Inventory
List / Get: OPEN
Create / Update / Delete / SSH Test / ARP Sweep: LOCKED (402)
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from ..database import get_db
from ..schemas.schemas import GatewayResponse
from ..auth import require_admin, require_editor, require_viewer

router = APIRouter(prefix="/gateways", tags=["gateways"])

PURCHASE_RESPONSE = JSONResponse(
    status_code=402,
    content={"detail": "purchase_required"}
)


def _to_response(gw):
    from ..models.models import Gateway
    return GatewayResponse(
        id=gw.id,
        name=gw.name,
        ip_address=str(gw.ip_address),
        vendor=gw.vendor,
        username=gw.username,
        ssh_port=gw.ssh_port,
        role=gw.role,
        is_active=gw.is_active,
        last_seen=gw.last_seen,
        created_at=gw.created_at,
        subnet_ids=[str(s.id) for s in (gw.subnets or [])],
    )


# ── OPEN: List / Get ──────────────────────────────────────────────

@router.get("", response_model=List[GatewayResponse])
async def list_gateways(db: AsyncSession = Depends(get_db), _=Depends(require_viewer)):
    from sqlalchemy.future import select
    from sqlalchemy.orm import selectinload
    from ..models.models import Gateway
    result = await db.execute(
        select(Gateway).options(selectinload(Gateway.subnets)).order_by(Gateway.id)
    )
    return [_to_response(gw) for gw in result.scalars().all()]


@router.get("/{gateway_id}", response_model=GatewayResponse)
async def get_gateway(gateway_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_viewer)):
    from sqlalchemy.future import select
    from sqlalchemy.orm import selectinload
    from ..models.models import Gateway
    result = await db.execute(
        select(Gateway).options(selectinload(Gateway.subnets)).where(Gateway.id == gateway_id)
    )
    gw = result.scalar_one_or_none()
    if not gw:
        raise HTTPException(status_code=404, detail="Gateway not found")
    return _to_response(gw)


# ── LOCKED: Create / Update / Delete / SSH Test / ARP Sweep ───────

@router.post("", status_code=201)
async def create_gateway(_=Depends(require_admin)):
    return PURCHASE_RESPONSE

@router.put("/{gateway_id}")
async def update_gateway(gateway_id: int, _=Depends(require_admin)):
    return PURCHASE_RESPONSE

@router.delete("/{gateway_id}", status_code=204)
async def delete_gateway(gateway_id: int, _=Depends(require_admin)):
    return PURCHASE_RESPONSE

@router.post("/{gateway_id}/test")
async def test_gateway_connection(gateway_id: int, _=Depends(require_editor)):
    return PURCHASE_RESPONSE

@router.post("/{gateway_id}/arp-sweep")
async def arp_sweep(gateway_id: int, _=Depends(require_editor)):
    return PURCHASE_RESPONSE
