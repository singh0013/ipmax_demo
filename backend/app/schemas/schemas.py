from pydantic import BaseModel, Field, field_validator, field_serializer
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID
import ipaddress

# ── Subnet Schemas ─────────────────────────────────────────────

class SubnetBase(BaseModel):
    name:           str           = Field(..., min_length=1, max_length=100)
    network:        str           = Field(..., description="Network address e.g. 192.168.1.0")
    cidr:           int           = Field(..., ge=0, le=128)
    gateway:        Optional[str] = None
    vlan_id:        Optional[int] = Field(None, ge=1, le=4094)
    interface_name: Optional[str] = Field(None, max_length=100)
    description:    Optional[str] = None
    location:       Optional[str] = None

    @field_validator("network", mode="before")
    @classmethod
    def validate_network(cls, v):
        return str(v)

    @field_validator("gateway", mode="before")
    @classmethod
    def validate_gateway(cls, v):
        return str(v) if v is not None else None

class SubnetCreate(SubnetBase):
    pass

class SubnetUpdate(BaseModel):
    name:           Optional[str] = Field(None, min_length=1, max_length=100)
    gateway:        Optional[str] = None
    vlan_id:        Optional[int] = Field(None, ge=1, le=4094)
    interface_name: Optional[str] = Field(None, max_length=100)
    description:    Optional[str] = None
    location:       Optional[str] = None

class SubnetResponse(SubnetBase):
    id:         UUID
    created_at: datetime
    updated_at: datetime
    ip_count:   Optional[int] = 0
    used_count: Optional[int] = 0

    model_config = {"from_attributes": True}

# ── IP Address Schemas ──────────────────────────────────────────

class IPAddressBase(BaseModel):
    ip_address:  str           = Field(..., description="IP address e.g. 192.168.1.10")
    hostname:    Optional[str] = Field(None, max_length=255)
    status:      str           = Field("free", pattern="^(used|free|reserved|deprecated)$")
    assigned_to: Optional[str] = Field(None, max_length=255)
    mac_address: Optional[str] = None
    description: Optional[str] = None
    tags:        Optional[List[str]] = None

    @field_validator("ip_address", mode="before")
    @classmethod
    def validate_ip(cls, v):
        return str(v)

    @field_validator("mac_address", mode="before")
    @classmethod
    def validate_mac(cls, v):
        return str(v) if v is not None else None

class IPAddressCreate(IPAddressBase):
    subnet_id: UUID

class IPAddressUpdate(BaseModel):
    hostname:    Optional[str] = None
    status:      Optional[str] = Field(None, pattern="^(used|free|reserved|deprecated)$")
    assigned_to: Optional[str] = None
    mac_address: Optional[str] = None
    description: Optional[str] = None
    tags:        Optional[List[str]] = None

class IPAddressResponse(IPAddressBase):
    id:         UUID
    subnet_id:  UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

# ── Dashboard Schema ────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_subnets:    int
    total_ips:        int
    used_ips:         int
    free_ips:         int
    reserved_ips:     int
    deprecated_ips:   int
    utilization_pct:  float

# ── Auth Schemas ────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token:         str
    token_type:           str  = "bearer"
    role:                 str
    username:             str
    must_change_password: bool = False

class UserCreate(BaseModel):
    username: str  = Field(..., min_length=3, max_length=50)
    email:    str
    password: str  = Field(..., min_length=8)
    role:     str  = Field("viewer", pattern="^(admin|editor|viewer)$")

class UserResponse(BaseModel):
    id:         UUID
    username:   str
    email:      str
    role:       str
    is_active:  bool
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = {"from_attributes": True}

class UserUpdate(BaseModel):
    role:      Optional[str]  = Field(None, pattern="^(admin|editor|viewer)$")
    is_active: Optional[bool] = None
    email:     Optional[str]  = None

# ── Audit Log Schemas ───────────────────────────────────────────

class AuditLogResponse(BaseModel):
    id:          UUID
    table_name:  str
    record_id:   UUID
    action:      str
    changed_by:  str
    old_data:    Optional[Any] = None
    new_data:    Optional[Any] = None
    ip_address:  Optional[str] = None
    created_at:  datetime

    model_config = {"from_attributes": True}

    @field_validator("ip_address", mode="before")
    @classmethod
    def coerce_ip(cls, v):
        return str(v) if v is not None else None

# ── Activity Log ────────────────────────────────────────────────

class ActivityLogResponse(BaseModel):
    id:          UUID
    job_type:    str
    status:      str
    started_by:  str
    filename:    Optional[str] = None
    total:       int = 0
    processed:   int = 0
    succeeded:   int = 0
    failed:      int = 0
    summary:     Optional[str] = None
    logs:        Optional[list] = []
    started_at:  datetime
    finished_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class ImportResult(BaseModel):
    total:    int
    imported: int
    updated:  int = 0
    skipped:  int
    errors:   List[str]

# ── Gateway / Device Inventory Schemas ─────────────────────────

class GatewayCreate(BaseModel):
    name:       str           = Field(..., min_length=1, max_length=100)
    ip_address: str           = Field(..., description="Switch/Router IP")
    vendor:     str           = Field("arista", pattern="^(arista|cisco|hp|juniper)$")
    username:   str           = Field(..., min_length=1, max_length=100)
    password:   str           = Field(..., min_length=1)   # plain — will be encrypted
    ssh_port:   int           = Field(22, ge=1, le=65535)
    role:       str           = Field("gateway", pattern="^(gateway|switch|router|firewall)$")
    is_active:  bool          = True
    subnet_ids: List[UUID]    = []

    @field_validator("ip_address", mode="before")
    @classmethod
    def validate_ip(cls, v):
        return str(v)

class GatewayUpdate(BaseModel):
    name:       Optional[str]       = Field(None, min_length=1, max_length=100)
    ip_address: Optional[str]       = None
    vendor:     Optional[str]       = Field(None, pattern="^(arista|cisco|hp|juniper)$")
    username:   Optional[str]       = None
    password:   Optional[str]       = None   # plain — will be encrypted if provided
    ssh_port:   Optional[int]       = Field(None, ge=1, le=65535)
    role:       Optional[str]       = Field(None, pattern="^(gateway|switch|router|firewall)$")
    is_active:  Optional[bool]      = None
    subnet_ids: Optional[List[UUID]]= None

    @field_validator("ip_address", mode="before")
    @classmethod
    def validate_ip(cls, v):
        return str(v) if v is not None else None

class GatewayResponse(BaseModel):
    id:         int
    name:       str
    ip_address: str
    vendor:     str
    username:   str
    ssh_port:   int
    role:       str
    is_active:  bool
    last_seen:  Optional[datetime] = None
    created_at: datetime
    subnet_ids: List[str] = []

    model_config = {"from_attributes": True}

    @field_validator("ip_address", mode="before")
    @classmethod
    def coerce_ip(cls, v):
        return str(v) if v is not None else None
