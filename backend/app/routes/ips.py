from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional
from uuid import UUID

from ..database import get_db
from ..models import IPAddress, Subnet
from ..schemas import IPAddressCreate, IPAddressUpdate, IPAddressResponse
from ..audit import write_audit
from ..auth import require_editor, require_viewer

router = APIRouter(prefix="/ips", tags=["IP Addresses"])


@router.get("/", response_model=List[IPAddressResponse])
async def list_ips(
    subnet_id: Optional[UUID] = Query(None),
    status:    Optional[str]  = Query(None),
    search:    Optional[str]  = Query(None, min_length=1),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_viewer)
):
    query = select(IPAddress)
    if subnet_id: query = query.where(IPAddress.subnet_id == subnet_id)
    if status:    query = query.where(IPAddress.status == status)
    if search:
        query = query.where(or_(
            IPAddress.hostname.ilike(f"%{search}%"),
            IPAddress.assigned_to.ilike(f"%{search}%"),
            IPAddress.description.ilike(f"%{search}%"),
        ))
    query = query.order_by(IPAddress.ip_address)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=IPAddressResponse, status_code=status.HTTP_201_CREATED)
async def create_ip(payload: IPAddressCreate, request: Request, db: AsyncSession = Depends(get_db), current_user=Depends(require_editor)):
    subnet_result = await db.execute(select(Subnet).where(Subnet.id == payload.subnet_id))
    if not subnet_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Subnet not found")
    existing = await db.execute(select(IPAddress).where(IPAddress.ip_address == payload.ip_address))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="IP address already exists")
    ip = IPAddress(**payload.model_dump())
    db.add(ip)
    await db.flush()
    await write_audit(db, table_name="ip_addresses", record_id=ip.id, action="CREATE",
        changed_by=current_user.username, new_data=payload.model_dump(),
        ip_address=request.client.host if request.client else None)
    await db.refresh(ip)
    return ip


@router.get("/{ip_id}", response_model=IPAddressResponse)
async def get_ip(ip_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(require_viewer)):
    result = await db.execute(select(IPAddress).where(IPAddress.id == ip_id))
    ip = result.scalar_one_or_none()
    if not ip:
        raise HTTPException(status_code=404, detail="IP address not found")
    return ip


@router.patch("/{ip_id}", response_model=IPAddressResponse)
async def update_ip(ip_id: UUID, payload: IPAddressUpdate, request: Request, db: AsyncSession = Depends(get_db), current_user=Depends(require_editor)):
    result = await db.execute(select(IPAddress).where(IPAddress.id == ip_id))
    ip = result.scalar_one_or_none()
    if not ip:
        raise HTTPException(status_code=404, detail="IP address not found")
    old_data = {c.name: str(getattr(ip, c.name)) for c in ip.__table__.columns}
    changes  = payload.model_dump(exclude_none=True)
    for key, value in changes.items():
        setattr(ip, key, value)
    await db.flush()
    await write_audit(db, table_name="ip_addresses", record_id=ip_id, action="UPDATE",
        changed_by=current_user.username, old_data=old_data, new_data=changes,
        ip_address=request.client.host if request.client else None)
    await db.refresh(ip)
    return ip


@router.delete("/{ip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ip(ip_id: UUID, request: Request, db: AsyncSession = Depends(get_db), current_user=Depends(require_editor)):
    result = await db.execute(select(IPAddress).where(IPAddress.id == ip_id))
    ip = result.scalar_one_or_none()
    if not ip:
        raise HTTPException(status_code=404, detail="IP address not found")
    old_data = {c.name: str(getattr(ip, c.name)) for c in ip.__table__.columns}
    # Write audit BEFORE delete so the record_id is still valid
    await write_audit(db, table_name="ip_addresses", record_id=ip_id, action="DELETE",
        changed_by=current_user.username, old_data=old_data,
        ip_address=request.client.host if request.client else None)
    await db.flush()
    await db.delete(ip)
