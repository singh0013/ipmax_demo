from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from pydantic import BaseModel

from ..database import get_db
from ..models import Subnet, IPAddress
from ..schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def subnet_capacity(cidr: int) -> int:
    """Usable IPs in a subnet. /32=1, /31=2, /30=2, else 2^(32-cidr)-2"""
    if cidr >= 31:
        return max(1, 2 ** (32 - cidr))
    return max(0, 2 ** (32 - cidr) - 2)


@router.get("/stats", response_model=DashboardStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    # Total subnets
    subnet_result = await db.execute(select(Subnet))
    subnets = subnet_result.scalars().all()
    total_subnets = len(subnets)

    # Total capacity from subnet CIDRs
    total_capacity = sum(subnet_capacity(s.cidr) for s in subnets)

    # IP status counts from DB
    ip_stats = await db.execute(
        select(IPAddress.status, func.count().label("count")).group_by(IPAddress.status)
    )
    counts = {row.status: row.count for row in ip_stats.all()}

    used       = counts.get("used", 0)
    reserved   = counts.get("reserved", 0)
    deprecated = counts.get("deprecated", 0)
    tracked    = sum(counts.values())

    free = max(0, total_capacity - tracked)
    utilization = round((used / total_capacity * 100), 1) if total_capacity > 0 else 0.0

    return DashboardStats(
        total_subnets   = total_subnets,
        total_ips       = total_capacity,
        used_ips        = used,
        free_ips        = free,
        reserved_ips    = reserved,
        deprecated_ips  = deprecated,
        utilization_pct = utilization,
    )


# ── Subnet utilization schema ────────────────────────────────────

class SubnetUtilization(BaseModel):
    id:           str
    name:         str
    network:      str
    cidr:         int
    location:     str | None
    capacity:     int
    used:         int
    reserved:     int
    deprecated:   int
    discovered:   int
    used_dhcp:    int
    free:         int
    utilization:  float

    model_config = {"from_attributes": True}


@router.get("/subnets", response_model=List[SubnetUtilization])
async def get_subnet_utilization(db: AsyncSession = Depends(get_db)):
    """Per-subnet utilization — used for dashboard bars"""

    subnet_result = await db.execute(select(Subnet))
    subnets = subnet_result.scalars().all()

    # Get IP counts per subnet per status in one query
    ip_counts = await db.execute(
        select(
            IPAddress.subnet_id,
            IPAddress.status,
            func.count().label("count")
        ).group_by(IPAddress.subnet_id, IPAddress.status)
    )

    # Build lookup: {subnet_id: {status: count}}
    lookup: dict = {}
    for row in ip_counts.all():
        sid = str(row.subnet_id)
        if sid not in lookup:
            lookup[sid] = {}
        lookup[sid][row.status] = row.count

    result = []
    for s in subnets:
        sid      = str(s.id)
        counts   = lookup.get(sid, {})
        capacity = subnet_capacity(s.cidr)

        used       = counts.get("used", 0)
        reserved   = counts.get("reserved", 0)
        deprecated = counts.get("deprecated", 0)
        discovered = counts.get("discovered", 0)
        used_dhcp  = counts.get("used-dhcp", 0)
        tracked    = sum(counts.values())
        free       = max(0, capacity - tracked)
        utilization = round(((used + used_dhcp) / capacity * 100), 1) if capacity > 0 else 0.0

        result.append(SubnetUtilization(
            id          = sid,
            name        = s.name,
            network     = str(s.network),
            cidr        = s.cidr,
            location    = s.location,
            capacity    = capacity,
            used        = used,
            reserved    = reserved,
            deprecated  = deprecated,
            discovered  = discovered,
            used_dhcp   = used_dhcp,
            free        = free,
            utilization = utilization,
        ))

    # Sort by utilization descending
    result.sort(key=lambda x: x.utilization, reverse=True)
    return result
