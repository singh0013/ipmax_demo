from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text as sa_text
from typing import List
from uuid import UUID

from ..database import get_db
from ..models import Subnet, IPAddress
from ..schemas import SubnetCreate, SubnetUpdate, SubnetResponse
from ..audit import write_audit
from ..auth import get_current_user, require_editor, require_viewer

router = APIRouter(prefix="/subnets", tags=["Subnets"])


@router.get("/", response_model=List[SubnetResponse])
async def list_subnets(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_viewer)
):
    result = await db.execute(select(Subnet).order_by(Subnet.name))
    subnets = result.scalars().all()
    response = []
    for subnet in subnets:
        count_result = await db.execute(select(func.count()).where(IPAddress.subnet_id == subnet.id))
        total = count_result.scalar() or 0
        used_result = await db.execute(select(func.count()).where(IPAddress.subnet_id == subnet.id, IPAddress.status == "used"))
        used = used_result.scalar() or 0
        s = SubnetResponse.model_validate(subnet)
        s.ip_count = total; s.used_count = used
        response.append(s)
    return response


@router.post("/", response_model=SubnetResponse, status_code=status.HTTP_201_CREATED)
async def create_subnet(payload: SubnetCreate, request: Request, db: AsyncSession = Depends(get_db), current_user=Depends(require_editor)):
    # Use ::text cast to avoid INET = varchar error
    existing = await db.execute(
        sa_text("SELECT id FROM subnets WHERE network::text = :net AND cidr = :cidr"),
        {"net": payload.network, "cidr": payload.cidr}
    )
    if existing.fetchone():
        raise HTTPException(status_code=409, detail="Subnet already exists")
    subnet = Subnet(**payload.model_dump())
    db.add(subnet)
    await db.flush()
    await write_audit(db, table_name="subnets", record_id=subnet.id, action="CREATE",
        changed_by=current_user.username, new_data=payload.model_dump(),
        ip_address=request.client.host if request.client else None)
    await db.refresh(subnet)
    result = SubnetResponse.model_validate(subnet)
    result.ip_count = 0; result.used_count = 0
    return result


@router.get("/{subnet_id}", response_model=SubnetResponse)
async def get_subnet(subnet_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(require_viewer)):
    result = await db.execute(select(Subnet).where(Subnet.id == subnet_id))
    subnet = result.scalar_one_or_none()
    if not subnet:
        raise HTTPException(status_code=404, detail="Subnet not found")
    return SubnetResponse.model_validate(subnet)


@router.patch("/{subnet_id}", response_model=SubnetResponse)
async def update_subnet(subnet_id: UUID, payload: SubnetUpdate, request: Request, db: AsyncSession = Depends(get_db), current_user=Depends(require_editor)):
    result = await db.execute(select(Subnet).where(Subnet.id == subnet_id))
    subnet = result.scalar_one_or_none()
    if not subnet:
        raise HTTPException(status_code=404, detail="Subnet not found")
    old_data = {c.name: str(getattr(subnet, c.name)) for c in subnet.__table__.columns}
    changes  = payload.model_dump(exclude_none=True)
    for key, value in changes.items():
        setattr(subnet, key, value)
    await db.flush()
    await write_audit(db, table_name="subnets", record_id=subnet_id, action="UPDATE",
        changed_by=current_user.username, old_data=old_data, new_data=changes,
        ip_address=request.client.host if request.client else None)
    await db.refresh(subnet)
    return SubnetResponse.model_validate(subnet)


@router.delete("/{subnet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subnet(subnet_id: UUID, request: Request, db: AsyncSession = Depends(get_db), current_user=Depends(require_editor)):
    result = await db.execute(select(Subnet).where(Subnet.id == subnet_id))
    subnet = result.scalar_one_or_none()
    if not subnet:
        raise HTTPException(status_code=404, detail="Subnet not found")
    old_data = {c.name: str(getattr(subnet, c.name)) for c in subnet.__table__.columns}
    await db.delete(subnet)
    await write_audit(db, table_name="subnets", record_id=subnet_id, action="DELETE",
        changed_by=current_user.username, old_data=old_data,
        ip_address=request.client.host if request.client else None)
