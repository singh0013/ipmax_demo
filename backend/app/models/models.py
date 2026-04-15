from sqlalchemy import Column, String, Integer, Text, ARRAY, ForeignKey, TIMESTAMP, Boolean, func
from sqlalchemy.dialects.postgresql import UUID, INET, MACADDR, JSONB
from sqlalchemy.orm import relationship
import uuid
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username      = Column(String(50),  nullable=False, unique=True)
    email         = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(String(20),  nullable=False, default="viewer")
    is_active     = Column(Boolean,     nullable=False, default=True)
    created_at    = Column(TIMESTAMP(timezone=True), server_default=func.now())
    last_login    = Column(TIMESTAMP(timezone=True))


class AuditLog(Base):
    __tablename__ = "audit_log"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    table_name  = Column(String(50),  nullable=False)
    record_id   = Column(UUID(as_uuid=True), nullable=False)
    action      = Column(String(10),  nullable=False)
    changed_by  = Column(String(100), nullable=False, default="system")
    old_data    = Column(JSONB)
    new_data    = Column(JSONB)
    ip_address  = Column(INET)
    created_at  = Column(TIMESTAMP(timezone=True), server_default=func.now())


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_type    = Column(String(30),  nullable=False)
    status      = Column(String(15),  nullable=False, default="running")
    started_by  = Column(String(100), nullable=False, default="system")
    filename    = Column(String(255))
    total       = Column(Integer, default=0)
    processed   = Column(Integer, default=0)
    succeeded   = Column(Integer, default=0)
    failed      = Column(Integer, default=0)
    summary     = Column(Text)
    logs        = Column(JSONB, default=list)
    started_at  = Column(TIMESTAMP(timezone=True), server_default=func.now())
    finished_at = Column(TIMESTAMP(timezone=True))


class Subnet(Base):
    __tablename__ = "subnets"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name           = Column(String(100), nullable=False)
    network        = Column(INET, nullable=False)
    cidr           = Column(Integer, nullable=False)
    gateway        = Column(INET)
    vlan_id        = Column(Integer)
    interface_name = Column(String(100))
    description    = Column(Text)
    location       = Column(String(100))
    created_at     = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at     = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    ip_addresses = relationship("IPAddress", back_populates="subnet", cascade="all, delete-orphan")


class IPAddress(Base):
    __tablename__ = "ip_addresses"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subnet_id   = Column(UUID(as_uuid=True), ForeignKey("subnets.id", ondelete="CASCADE"), nullable=False)
    ip_address  = Column(INET, nullable=False, unique=True)
    hostname    = Column(String(255))
    status      = Column(String(20), nullable=False, default="free")
    assigned_to = Column(String(255))
    mac_address = Column(MACADDR)
    description = Column(Text)
    tags        = Column(ARRAY(Text))
    created_at  = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at  = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    subnet = relationship("Subnet", back_populates="ip_addresses")


# ── Gateway / Device Inventory ──────────────────────────────────

class GatewaySubnet(Base):
    """Many-to-many: Gateway ↔ Subnet"""
    __tablename__ = "gateway_subnets"

    gateway_id = Column(Integer, ForeignKey("gateways.id", ondelete="CASCADE"), primary_key=True)
    subnet_id  = Column(UUID(as_uuid=True), ForeignKey("subnets.id", ondelete="CASCADE"), primary_key=True)


class Gateway(Base):
    __tablename__ = "gateways"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    name         = Column(String(100), nullable=False)
    ip_address   = Column(INET, nullable=False, unique=True)
    vendor       = Column(String(50), nullable=False, default="arista")
    username     = Column(String(100), nullable=False)
    password_enc = Column(Text, nullable=False)          # Fernet encrypted
    ssh_port     = Column(Integer, nullable=False, default=22)
    role         = Column(String(50), nullable=False, default="gateway")
    is_active    = Column(Boolean, nullable=False, default=True)
    last_seen    = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at   = Column(TIMESTAMP(timezone=True), server_default=func.now())

    subnets = relationship(
        "Subnet",
        secondary="gateway_subnets",
        backref="gateways",
        lazy="selectin"
    )
