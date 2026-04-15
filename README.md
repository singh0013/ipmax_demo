# IPMAX — IP Address Manager

> Enterprise IP Address Management tool for network teams — track, discover, and manage your entire IP space from one place.

![Version](https://img.shields.io/badge/version-v0.4.0-blue?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20FastAPI%20%2B%20PostgreSQL-informational?style=flat-square)
![Docker](https://img.shields.io/badge/docker-compose-2496ED?style=flat-square&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/license-Demo-orange?style=flat-square)

---

## What is IPMAX?

IPMAX is an internal network management tool built for corporate IT/network teams. It replaces manual spreadsheets and expensive tools like Infoblox or SolarWinds IPControl with a lightweight, self-hosted solution.

**Who is it for?** Network engineers, IT admins, and NOC teams managing IP allocations across multiple sites, VLANs, and subnets.

---

## Screenshots

> ![Dashboard](screenshots/dashboard.png)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS (dark theme) |
| Backend | Python 3.12 + FastAPI (async) |
| Database | PostgreSQL 16 |
| Auth | JWT + bcrypt, role-based (Admin / Editor / Viewer) |
| Proxy | Nginx |
| Container | Docker Compose |
| Scheduler | APScheduler (cron-based) |

---

## Pages & Features

### 📊 Dashboard
At-a-glance view of your entire IP space.
- Subnet utilization bars — see which networks are running out of space
- Color-coded thresholds (green → amber → red) based on usage
- Top 5 most utilized subnets
- Total counts: subnets, IPs, used, free, reserved

### 🌐 Subnets
Manage all your network blocks in one place.
- Add, edit, delete subnets with VLAN, gateway, interface, location
- See IP usage per subnet at a glance
- Click any subnet to drill into its IPs
- Bulk select → trigger discovery on multiple subnets
- Export to CSV with column picker
- Pagination — 50 per page for large environments

### 🖥️ IP Addresses
Full lifecycle management for every IP in your network.
- Track hostname, MAC address, assigned owner, description, tags
- Status badges: `used` / `free` / `reserved` / `deprecated` / `used-dhcp` / `discovered`
- Filter by status, search by hostname/IP
- Export to CSV
- Pagination — 50 per page

### 🔍 Discovery
Automatically find live devices on your network.
- **TCP Probe** — scans common ports (SSH, HTTP, HTTPS, RDP, etc.) to detect alive hosts
- **ARP Sweep** *(Full Version)* — pulls live IP+MAC table directly from your Arista switch via SSH
- Live progress bar with real-time scan updates
- Stop button — cancel running scan anytime
- Discovered devices auto-added with `discovered` status

### 📋 Activity Log
Full history of every discovery and import job.
- See running, completed, and failed jobs
- Live progress for active scans
- Expand any job to see row-level details
- Stop any running discovery job
- `scheduler` badge for automated jobs
- Auto-refresh toggle

### 🔄 Import / Export *(Full Version)*
Bulk manage your IP data with CSV files.
- Import subnets from CSV (supports various formats — `192.168.1.0/24`, VLAN10, etc.)
- Import IPs with auto subnet detection
- Insert-only or upsert (insert + update) mode
- Export with custom column picker
- Every import tracked in Activity Log

### 📝 Audit Log
Complete change history for compliance and troubleshooting.
- Every CREATE, UPDATE, DELETE recorded
- Shows who made the change and when
- Before/after data diff for updates
- Filter by action type and table

### 🖧 Device Inventory *(Full Version)*
Manage your network gateways and switches.
- Add gateways/switches with vendor, IP, credentials
- Test SSH connectivity with one click
- Trigger ARP sweep directly from a gateway
- Bulk import devices from CSV
- Vendor badges: Arista, Cisco, HP, Juniper

### ⏰ Tasks *(Full Version)*
Automate your discovery on a schedule.
- Create named tasks with multiple subnets
- Schedule: Daily, Weekly, or Manual (run on demand)
- Set run time and discovery method per task
- Enable/disable tasks with a toggle
- Running badge shows active scheduled scans
- All scheduled runs appear in Activity Log

### 🛠️ Support *(Full Version)*
Admin tools for maintenance and troubleshooting.
- **Download Logs** — ZIP with activity log, audit log, system info, and HTML report
- **DB Backup** — one-click PostgreSQL dump (`.sql` file with date)
- **DB Restore** — upload a backup file, step-by-step progress shown
- System status: DB connected, pg_dump available, version, timezone

### 👥 Users
User management for your team.
- Create users with roles: Admin, Editor, Viewer
- Reset passwords
- Enable/disable accounts
- First login forces password change

---

## Access Control

| Role | What they can do |
|------|-----------------|
| **Admin** | Everything — including users, tasks, device inventory, support |
| **Editor** | Add/edit/delete subnets & IPs, run discovery, import/export |
| **Viewer** | Read-only access + export |

---

## Demo vs Full Version

This repository contains the **Demo Version** of IPMAX.

| Feature | Demo | Full Version |
|---------|:----:|:------------:|
| Dashboard | ✅ | ✅ |
| Subnets CRUD | ✅ | ✅ |
| IP Address CRUD | ✅ | ✅ |
| TCP Discovery | ✅ | ✅ |
| Activity Log | ✅ | ✅ |
| Audit Log | ✅ | ✅ |
| View Users & Gateways | ✅ | ✅ |
| CSV Import / Export | 🔒 | ✅ |
| ARP Sweep Discovery | 🔒 | ✅ |
| Scheduled Tasks | 🔒 | ✅ |
| DB Backup & Restore | 🔒 | ✅ |
| Logs Download | 🔒 | ✅ |
| Add / Delete Users | 🔒 | ✅ |
| Device Inventory CRUD | 🔒 | ✅ |

> 📧 **Interested in the Full Version?** — [Ashuoffice09@gmail.com](mailto:Ashuoffice09@gmail.com?subject=IPMAX%20Full%20Version%20Enquiry)  
> 💼 **LinkedIn** — [Ashish Singh](https://www.linkedin.com/in/ashish-singh-network)

---

## Installation

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
- Git installed
- Port 80 available on your machine

---

### 🪟 Windows (PowerShell)

```powershell
# 1. Clone the repository
git clone https://github.com/your-username/ipmax.git
cd ipmax

# 2. Start the application
docker compose up -d --build

# 3. Check all containers are running
docker compose ps
```

**Access:** Open `http://localhost` in your browser.

---

### 🐧 Ubuntu / Linux (Terminal)

```bash
# 1. Install Docker (if not already installed)
sudo apt update
sudo apt install -y docker.io docker-compose-plugin

# Enable Docker to start on boot
sudo systemctl enable docker
sudo systemctl start docker

# Add your user to docker group (avoid sudo every time)
sudo usermod -aG docker $USER
newgrp docker

# 2. Clone the repository
git clone https://github.com/your-username/ipmax.git
cd ipmax

# 3. Start the application
docker compose up -d --build

# 4. Check all containers are running
docker compose ps
```

**Access:** Open `http://your-server-ip` in your browser.

---

### 🔑 Default Login

| Field | Value |
|-------|-------|
| URL | `http://localhost` |
| Username | `admin` |
| Password | `Admin@123` |

> ⚠️ Change the default password after first login.

---

## Common Commands

```bash
# Start
docker compose up -d --build

# Stop
docker compose down

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Restart a single service
docker compose restart backend

# Full reset (WARNING: deletes all data)
docker compose down -v
docker compose up -d --build
```

### Database Backup & Restore (manual)

```bash
# Backup
docker exec ipmax_db pg_dump -U ipam_user ipam > backup.sql

# Restore
cat backup.sql | docker exec -i ipmax_db psql -U ipam_user ipam
```

```powershell
# Backup (PowerShell)
docker exec ipmax_db pg_dump -U ipam_user ipam > backup.sql

# Restore (PowerShell)
Get-Content ".\backup.sql" | docker exec -i ipmax_db psql -U ipam_user ipam
```

---

## Project Structure

```
ipmax/
├── docker-compose.yml
├── db/
│   └── init.sql                  ← Database schema (auto-runs on fresh install)
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── routes/               ← API endpoints
│       ├── models/               ← Database models
│       └── schemas/              ← Pydantic schemas
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── App.jsx
        ├── api/client.js
        ├── components/
        └── pages/
```

---

## Troubleshooting

**Port 80 already in use:**
```bash
# Check what's using port 80
sudo lsof -i :80          # Linux
netstat -ano | findstr :80  # Windows PowerShell

# Change port in docker-compose.yml
ports:
  - "8080:80"   # use 8080 instead
```

**Database not connecting:**
```bash
# Check db container is healthy
docker compose ps
docker compose logs db
```

**Frontend not loading:**
```bash
docker compose logs frontend
docker compose restart frontend
```

**Full reset (if something is broken):**
```bash
docker compose down -v    # removes volumes too
docker compose up -d --build
```

---

## Contact & Full Version

> This is a **demo version** — some features are locked.  
> For the Full Version or custom deployment support:

📧 **Email:** [Ashuoffice09@gmail.com](mailto:Ashuoffice09@gmail.com?subject=IPMAX%20Full%20Version%20Enquiry)  
💼 **LinkedIn:** [Ashish Singh](https://www.linkedin.com/in/ashish-singh-network)

---

*Built with ❤️ for network teams tired of managing IPs in spreadsheets.*
