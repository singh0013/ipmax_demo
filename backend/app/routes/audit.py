from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID

from ..database import get_db
from ..models import AuditLog
from ..schemas import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit Log"])


@router.get("/", response_model=List[AuditLogResponse])
async def list_audit_logs(
    table_name: Optional[str] = Query(None),
    action:     Optional[str] = Query(None),
    record_id:  Optional[UUID] = Query(None),
    limit:      int = Query(100, ge=1, le=500),
    offset:     int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = select(AuditLog).order_by(AuditLog.created_at.desc())

    if table_name:
        query = query.where(AuditLog.table_name == table_name)
    if action:
        query = query.where(AuditLog.action == action)
    if record_id:
        query = query.where(AuditLog.record_id == record_id)

    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()
