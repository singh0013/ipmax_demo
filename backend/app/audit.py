from sqlalchemy.ext.asyncio import AsyncSession
from .models import AuditLog
from uuid import UUID
import json


def _serialize(obj):
    if obj is None:
        return None
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    try:
        return str(obj)
    except Exception:
        return None


async def write_audit(
    db: AsyncSession,
    *,
    table_name: str,
    record_id: UUID,
    action: str,
    changed_by: str = "system",
    old_data: dict = None,
    new_data: dict = None,
    ip_address: str = None,
):
    entry = AuditLog(
        table_name  = table_name,
        record_id   = record_id,
        action      = action,
        changed_by  = changed_by,
        old_data    = {k: _serialize(v) for k, v in old_data.items()} if old_data else None,
        new_data    = {k: _serialize(v) for k, v in new_data.items()} if new_data else None,
        ip_address  = ip_address,
    )
    db.add(entry)
