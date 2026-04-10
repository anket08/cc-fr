# CYMOPS — DevOps Centralised Command Center

> Unifying real-time incident collaboration, monitoring, and project management into one platform.

![CYMOPS Banner](https://img.shields.io/badge/CYMOPS-DevOps%20Platform-purple?style=for-the-badge&logo=spring&logoColor=white)
![Java](https://img.shields.io/badge/Java-17-orange?style=flat-square&logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.3-green?style=flat-square&logo=spring)
![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=flat-square&logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-red?style=flat-square&logo=redis)
![Docker](https://img.shields.io/badge/Docker-Compose-blue?style=flat-square&logo=docker)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Manual Setup](#-manual-setup)
- [API Reference](#-api-reference)
- [WebSocket Design](#-websocket-design)
- [User Roles](#-user-roles)
- [Environment Variables](#-environment-variables)
- [Architecture](#-architecture)

---

## 🧠 Overview

**CYMOPS** is a backend-first DevOps SaaS platform designed to replace the fragmented toolchain of Jira + Slack + Datadog + Grafana with a single, unified command center for high-velocity engineering teams.

| Problem | CYMOPS Solution |
|---|---|
| Context switching during incidents | Real-time incident rooms with WebSocket chat |
| No unified system | Single dashboard: projects, rooms, metrics |
| Poor team coordination | Project-based collaboration with role access |
| Missing audit trail | AOP-powered automatic audit logging |
| Unbounded API abuse | Enterprise Bucket4j rate limiting |

---

## ✨ Features

- 🔐 **JWT Authentication** — Stateless access tokens (15 min) + revocable refresh tokens (7 days)
- 👥 **Role-Based Access Control** — `ADMIN` and `MEMBER` roles with `@PreAuthorize` enforcement  
- 🏢 **Project Management** — Create isolated projects; only invited members can access them
- 💬 **Live Incident Rooms** — Real-time WebSocket chat powered by Redis Pub/Sub for horizontal scaling
- 📊 **Metrics Dashboard** — Live system stats (users, rooms, messages) via Spring Actuator
- 📜 **Audit Logging** — AOP-intercepted automatic logging of all critical actions
- 🚦 **Rate Limiting** — Bucket4j Redis-backed rate limiting on auth and API endpoints
- 🔄 **Message Persistence** — All messages saved to PostgreSQL before broadcast (zero data loss)
- 🌐 **Modern UI** — React + Vite SPA with Vercel-style dark mode, Axios interceptors, and React Context

---

## ⚙️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Java 17 | Core language |
| Spring Boot 3.4.3 | Application framework |
| Spring Security | JWT stateless auth + role enforcement |
| Spring WebSocket (STOMP) | Real-time messaging |
| Spring AOP | Cross-cutting audit logging |
| Spring Actuator | Metrics & health endpoints |
| Flyway | Database schema migrations |
| jOOQ | Type-safe SQL query generation |
| JJWT | JWT generation & validation |
| Bucket4j | Redis-backed rate limiting |
| Lombok | Boilerplate reduction |

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + Vite | SPA framework |
| TypeScript | Type safety |
| React Router v6 | Client-side routing |
| Axios | HTTP client with JWT interceptors |
| React Context | Global auth state management |
| @stomp/stompjs | WebSocket STOMP client |
| sockjs-client | WebSocket transport fallback |
| lucide-react | Icon library |

### Infrastructure
| Technology | Purpose |
|---|---|
| PostgreSQL 15 | Primary relational database |
| Redis 7 | Pub/Sub messaging + rate limit state |
| Docker & Docker Compose | Service orchestration |

---

## 📁 Project Structure

```
CyMOPS/
├── backend/                          # Spring Boot API Server
│   ├── src/main/java/com/cymops/
│   │   ├── audit/                    # AOP Audit Logging
│   │   ├── controller/               # REST API Controllers
│   │   ├── dto/                      # Request/Response DTOs
│   │   ├── model/entity/             # JPA Entities
│   │   ├── model/enums/              # Role, RoomStatus enums
│   │   ├── ratelimit/                # Bucket4j Rate Limiting
│   │   ├── redis/                    # Redis Publisher & Subscriber
│   │   ├── repository/               # Spring Data JPA Repositories
│   │   ├── security/                 # JWT Filter, SecurityConfig, UserDetails
│   │   ├── service/                  # Business Logic Services
│   │   └── websocket/                # WebSocket Config & Interceptors
│   ├── src/main/resources/
│   │   ├── application.yml           # App Configuration
│   │   └── db/migration/             # Flyway SQL migrations (V1__init_schema.sql)
│   └── pom.xml
│
├── frontend/                         # React + Vite SPA
│   ├── src/
│   │   ├── api/axios.ts              # Axios instance with JWT interceptors
│   │   ├── context/AuthContext.tsx   # Global auth state (React Context)
│   │   ├── components/PrivateRoute.tsx
│   │   └── pages/
│   │       ├── LandingPage.tsx       # Public marketing homepage
│   │       ├── AuthPage.tsx          # Login + Registration
│   │       ├── DashboardPage.tsx     # Projects, Rooms, Admin Panel
│   │       └── IncidentRoomPage.tsx  # Live WebSocket chat room
│   └── index.html
│
├── docker-compose.yml                # PostgreSQL + Redis services
├── start.ps1                         # Windows: one-command launcher (PowerShell)
└── start.bat                         # Windows: one-command launcher (CMD)
```

---

## 🛠️ Prerequisites

Before running CYMOPS, ensure you have the following installed:

| Tool | Version | Download |
|---|---|---|
| **Docker Desktop** | Latest | [docker.com](https://www.docker.com/products/docker-desktop) |
| **JDK 17** | 17+ | [Adoptium Temurin 17](https://adoptium.net/) or `winget install EclipseAdoptium.Temurin.17.JDK` |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **Git** | Latest | [git-scm.com](https://git-scm.com) |

> ⚠️ **Important:** Docker Desktop must be **running** before you start the application.

---

## 🚀 Quick Start

### Clone the repository

```bash
git clone https://github.com/Roamingorilla/CyMOPS.git
cd CyMOPS
```

### One-command launch (Windows)

```powershell
.\start.ps1
```

Or using CMD:

```cmd
start.bat
```

This script automatically:
1. Starts PostgreSQL and Redis via Docker Compose
2. Waits for the database to be ready
3. Launches the Spring Boot backend in a new window
4. Launches the Vite frontend in a new window

### Access the application

| Service | URL |
|---|---|
| **Frontend (React)** | http://localhost:5173 |
| **Backend API** | http://localhost:8080 |
| **Health Check** | http://localhost:8080/actuator/health |
| **Metrics** | http://localhost:8080/api/metrics |

---

## 🔧 Manual Setup

If you prefer to run each service individually:

### Step 1 — Start infrastructure

```bash
docker compose up -d
```

### Step 2 — Start the backend

```bash
cd backend
./mvnw spring-boot:run       # Linux / macOS
mvnw.cmd spring-boot:run     # Windows
```

> Make sure `JAVA_HOME` points to JDK 17. On Windows: `$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17..."`

### Step 3 — Start the frontend

```bash
cd frontend
npm install          # First time only
npm run dev
```

---

## 📡 API Reference

### 🔐 Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | None | Register a new user |
| `POST` | `/auth/login` | None | Login and receive JWT tokens |
| `POST` | `/auth/refresh` | None | Exchange refresh token for new access token |
| `POST` | `/auth/logout` | Bearer | Revoke the refresh token |

**Register request body:**
```json
{
  "email": "admin@cymops.dev",
  "password": "securepass123",
  "role": "ADMIN"
}
```

**Login response:**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

---

### 🏢 Projects

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/projects` | Bearer | `ADMIN` | Create a new project |
| `GET` | `/projects` | Bearer | Any | Get your accessible projects |
| `GET` | `/projects/{id}/members` | Bearer | Any | List project members |
| `POST` | `/projects/{id}/members` | Bearer | `ADMIN` | Invite a user by email |
| `DELETE` | `/projects/{id}/members` | Bearer | `ADMIN` | Remove a member by email |

---

### 💬 Incident Rooms

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/rooms` | Bearer | Create a room inside a project |
| `GET` | `/rooms/{projectId}` | Bearer | List rooms for a project |
| `PATCH` | `/rooms/{roomId}/resolve` | Bearer | Toggle room status → RESOLVED |
| `GET` | `/rooms/{roomId}/messages` | Bearer | Fetch message history |

---

### 📊 Metrics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/metrics` | Bearer | System stats (users, rooms, messages) |
| `GET` | `/actuator/health` | None | Server health check |

---

## 🔌 WebSocket Design

**Endpoint:** `ws://localhost:8080/ws`

Connect using STOMP with your JWT in the connect headers:

```javascript
const client = new Client({
  webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
  connectHeaders: { token: '<your_access_token>' },
  onConnect: () => {
    // Subscribe to a room channel
    client.subscribe('/topic/rooms/123', (msg) => {
      console.log(JSON.parse(msg.body));
    });
  }
});
client.activate();
```

**Send a message:**
```json
{
  "type": "SEND_MESSAGE",
  "roomId": "123",
  "content": "DB is down, investigating..."
}
```

**Receive broadcast:**
```json
{
  "type": "NEW_MESSAGE",
  "roomId": "123",
  "content": "DB is down, investigating...",
  "sender": "admin@cymops.dev"
}
```

---

## 👥 User Roles

| Role | Create Projects | Invite Members | Remove Members | Create Rooms | Chat |
|---|---|---|---|---|---|
| `ADMIN` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `MEMBER` | ❌ | ❌ | ❌ | ✅ | ✅ |

> Register your first user as `ADMIN` to unlock the full management interface.

---

## 🔑 Environment Variables

The backend reads configuration from `backend/src/main/resources/application.yml`.

| Key | Default | Description |
|---|---|---|
| `spring.datasource.url` | `jdbc:postgresql://localhost:5432/cymops` | PostgreSQL connection |
| `spring.datasource.username` | `cymops` | DB username |
| `spring.datasource.password` | `cymops` | DB password |
| `spring.data.redis.host` | `localhost` | Redis host |
| `spring.data.redis.port` | `6379` | Redis port |
| `jwt.secret` | (set in yml) | HS256 signing secret (min 32 chars) |
| `jwt.access-token-expiration` | `900000` | Access token TTL (15 min in ms) |
| `jwt.refresh-token-expiration` | `604800000` | Refresh token TTL (7 days in ms) |

---

## 🏗️ Architecture

```
Browser (React SPA)
        │  REST (Axios + JWT Bearer)
        │  WebSocket (STOMP over SockJS)
        ▼
Spring Boot Backend (Port 8080)
        │
        ├── Spring Security (JWT Filter → @PreAuthorize)
        ├── REST Controllers → Services → JPA Repositories
        ├── WebSocket Controller → Redis Publisher
        └── Bucket4j Rate Limiter (Redis-backed)
        │
        ├────────────────────────────────┐
        ▼                                ▼
PostgreSQL : 5432                   Redis : 6379
(Persistent Storage)          (Pub/Sub + Rate Limits)
        │                                │
        └────────────────────────────────┘
                    Docker Compose
```

---

## 📜 License

This project is developed companies purposes.

---

<div align="center">
  Built with ❤️ using Spring Boot 3 + React + Redis
</div>
"# cc-fr"  git init git add. git commit -m "first commit" git branch -M main git remote add origin https://github.com/anket08/cc-fr.git git push -u origin main
"# cc-fr" 
