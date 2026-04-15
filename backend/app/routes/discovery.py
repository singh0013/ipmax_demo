"""
IPMAX Demo Version — Discovery routes
TCP Probe (scan + stop + status): OPEN
ARP Sweep: LOCKED (402)
"""
import asyncio
import socket
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text as sa_text
from pydantic import BaseModel

from ..database import get_db, AsyncSessionLocal
from ..models import Subnet, IPAddress, ActivityLog
from ..auth import require_editor

router = APIRouter(prefix="/discovery", tags=["Discovery"])

PROBE_PORTS = [22, 23, 80, 443, 3389, 8080, 8443, 161, 445, 21]
PORT_NAMES  = {
    22: "SSH", 23: "Telnet", 80: "HTTP", 443: "HTTPS",
    3389: "RDP", 8080: "HTTP-Alt", 8443: "HTTPS-Alt",
    161: "SNMP", 445: "SMB", 21: "FTP"
}

stopped_jobs: set = set()


# ── TCP / DNS helpers ─────────────────────────────────────────────

async def tcp_probe(ip: str, port: int, timeout: float = 0.5) -> bool:
    try:
        _, writer = await asyncio.wait_for(
            asyncio.open_connection(ip, port), timeout=timeout
        )
        writer.close()
        await writer.wait_closed()
        return True
    except Exception:
        return False


async def icmp_ping(ip: str, timeout: float = 1.0) -> bool:
    try:
        import icmplib
        result = icmplib.ping(ip, count=2, timeout=timeout, privileged=True, interval=0.1)
        if result.is_alive:
            return True
    except Exception:
        pass
    try:
        import icmplib
        result = icmplib.ping(ip, count=1, timeout=timeout, privileged=False)
        if result.is_alive:
            return True
    except Exception:
        pass
    probe_tasks = [tcp_probe(ip, p, timeout=timeout) for p in [22, 80, 443, 3389, 445, 8080, 23, 21, 8443, 161]]
    results = await asyncio.gather(*probe_tasks, return_exceptions=True)
    return any(r is True for r in results)


async def reverse_dns(ip: str) -> Optional[str]:
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, socket.gethostbyaddr, ip)
        return result[0]
    except Exception:
        return None


def ip_range(network: str, cidr: int) -> List[str]:
    import ipaddress as iplib
    try:
        net = iplib.ip_network(f"{network}/{cidr}", strict=False)
        return [str(ip) for ip in net.hosts()]
    except Exception:
        return []


# ── Background TCP scan ──────────────────────────────────────────

async def run_discovery(job_id, subnet_ids, username, timeout, snmp_community=None, use_snmp_arp=False):
    async with AsyncSessionLocal() as db:
        try:
            result  = await db.execute(select(Subnet).where(Subnet.id.in_(subnet_ids)))
            subnets = result.scalars().all()

            all_ips = []
            for s in subnets:
                all_ips.extend([(ip, s) for ip in ip_range(str(s.network), s.cidr)])

            total = len(all_ips)
            job_result = await db.execute(select(ActivityLog).where(ActivityLog.id == job_id))
            job = job_result.scalar_one_or_none()
            if job:
                job.total   = total
                job.summary = f"Scanning {total} IPs across {len(subnets)} subnet(s)…"
                await db.flush(); await db.commit()

            succeeded = failed = 0
            log_entries = []

            for idx, (ip_str, subnet) in enumerate(all_ips):
                if str(job_id) in stopped_jobs:
                    break

                try:
                    alive = await icmp_ping(ip_str, timeout=timeout)
                    if not alive:
                        failed += 1
                        no_resp_entry = {"ip": ip_str, "subnet": f"{subnet.network}/{subnet.cidr}",
                                         "status": "no_response", "ports": [], "hostname": None}
                        alive_entries   = [e for e in log_entries if e["status"] != "no_response"]
                        no_resp_entries = [e for e in log_entries if e["status"] == "no_response"][-9:]
                        log_entries     = alive_entries + no_resp_entries + [no_resp_entry]
                    else:
                        probe_tasks  = [tcp_probe(ip_str, p, timeout=0.4) for p in PROBE_PORTS]
                        port_results = await asyncio.gather(*probe_tasks, return_exceptions=True)
                        open_ports   = [p for p, r in zip(PROBE_PORTS, port_results) if r is True]
                        hostname     = await reverse_dns(ip_str)
                        port_desc    = ", ".join(PORT_NAMES.get(p, str(p)) for p in open_ports)
                        tags         = [PORT_NAMES.get(p, str(p)) for p in open_ports[:5]]

                        existing_check = await db.execute(
                            sa_text("SELECT id FROM ip_addresses WHERE ip_address::text = :ip"),
                            {"ip": ip_str}
                        )
                        existing_row = existing_check.fetchone()

                        if existing_row:
                            ex_full = await db.execute(
                                select(IPAddress).where(IPAddress.id == existing_row[0])
                            )
                            existing_ip = ex_full.scalar_one_or_none()
                            if existing_ip:
                                if existing_ip.status == "free":
                                    existing_ip.status = "used"
                                if hostname and not existing_ip.hostname:
                                    existing_ip.hostname = hostname
                                if tags:
                                    existing_ip.tags = list(set((existing_ip.tags or []) + tags))
                                await db.flush()
                                action = "updated"
                        else:
                            new_ip = IPAddress(
                                subnet_id   = subnet.id,
                                ip_address  = ip_str,
                                hostname    = hostname,
                                status      = "used",
                                description = f"Discovered — {port_desc}" if port_desc else "Discovered",
                                tags        = tags or None,
                            )
                            db.add(new_ip)
                            await db.flush()
                            action = "discovered"

                        log_entries.append({
                            "ip": ip_str, "subnet": f"{subnet.network}/{subnet.cidr}",
                            "status": action, "ports": open_ports, "hostname": hostname,
                        })
                        succeeded += 1

                except Exception as e:
                    log_entries.append({"ip": ip_str, "status": "error", "msg": str(e)})
                    failed += 1

                if job and (idx % 5 == 0):
                    job.processed = idx + 1
                    job.succeeded = succeeded
                    job.failed    = failed
                    job.logs      = log_entries[-100:]
                    await db.flush()
                    await db.commit()

            if job:
                was_stopped = str(job_id) in stopped_jobs
                if was_stopped:
                    stopped_jobs.discard(str(job_id))
                job.status      = "error" if was_stopped else ("completed" if succeeded > 0 or failed > 0 else "error")
                job.processed   = total
                job.succeeded   = succeeded
                job.failed      = failed
                job.logs        = log_entries
                job.summary     = (f"Scanned {total} IPs across {len(subnets)} subnet(s) — "
                                   f"{succeeded} alive, {failed} no response"
                                   + (" — Stopped by user" if was_stopped else ""))
                job.finished_at = datetime.now(timezone.utc)
                await db.flush()
            await db.commit()

        except Exception as e:
            await db.rollback()
            async with AsyncSessionLocal() as db2:
                r = await db2.execute(select(ActivityLog).where(ActivityLog.id == job_id))
                j = r.scalar_one_or_none()
                if j:
                    j.status      = "error"
                    j.summary     = f"Discovery failed: {str(e)}"
                    j.finished_at = datetime.now(timezone.utc)
                    await db2.commit()


# ── API Endpoints ─────────────────────────────────────────────────

class DiscoverRequest(BaseModel):
    subnet_ids:     List[UUID]
    timeout:        float          = 1.0
    snmp_community: Optional[str] = None
    use_snmp_arp:   bool           = False

class DiscoverResponse(BaseModel):
    job_id:        UUID
    message:       str
    total_subnets: int


@router.post("/scan", response_model=DiscoverResponse)
async def start_discovery(
    payload:          DiscoverRequest,
    background_tasks: BackgroundTasks,
    db:               AsyncSession = Depends(get_db),
    current_user=Depends(require_editor)
):
    if not payload.subnet_ids:
        raise HTTPException(status_code=400, detail="Select at least one subnet")

    result  = await db.execute(select(Subnet).where(Subnet.id.in_(payload.subnet_ids)))
    subnets = result.scalars().all()
    if not subnets:
        raise HTTPException(status_code=404, detail="No valid subnets found")

    job = ActivityLog(
        job_type   = "discovery",
        status     = "running",
        started_by = current_user.username,
        filename   = f"{len(subnets)} subnet(s)",
        summary    = f"Scanning: {', '.join(s.name for s in subnets)}",
    )
    db.add(job)
    await db.flush()
    await db.refresh(job)

    background_tasks.add_task(
        run_discovery, job.id, payload.subnet_ids,
        current_user.username, payload.timeout, None, False
    )

    return DiscoverResponse(
        job_id        = job.id,
        message       = f"Discovery started for {len(subnets)} subnet(s)",
        total_subnets = len(subnets)
    )


@router.post("/stop/{job_id}")
async def stop_discovery(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_editor)
):
    stopped_jobs.add(str(job_id))
    result = await db.execute(select(ActivityLog).where(ActivityLog.id == job_id))
    job    = result.scalar_one_or_none()
    if job and job.status == "running":
        job.status      = "error"
        job.summary     = (job.summary or "") + " — Stopped by user"
        job.finished_at = datetime.now(timezone.utc)
        await db.flush()
    return {"message": "Stop signal sent"}


@router.get("/status/{job_id}")
async def discovery_status(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_editor)
):
    result = await db.execute(select(ActivityLog).where(ActivityLog.id == job_id))
    job    = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "id":          str(job.id),
        "status":      job.status,
        "total":       job.total,
        "processed":   job.processed,
        "succeeded":   job.succeeded,
        "failed":      job.failed,
        "summary":     job.summary,
        "logs":        job.logs or [],
        "started_at":  job.started_at.isoformat() if job.started_at else None,
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
    }


# ── LOCKED: ARP Sweep ────────────────────────────────────────────

@router.post("/arp-sweep")
async def arp_sweep_locked(_=Depends(require_editor)):
    return JSONResponse(status_code=402, content={"detail": "purchase_required"})
