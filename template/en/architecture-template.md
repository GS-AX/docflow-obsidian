---
title: {{title}} Architecture
type: architecture
project: {{project}}
version: 1.0.0
status: draft
author: {{author}}
tags: [architecture, infra]
related: []
---

## Overview

{{architecture description}}

## Diagram

```mermaid
flowchart TD
  Client["🌐 Client"]
  Gateway["API Gateway"]
  ServiceA["Service A"]
  ServiceB["Service B"]
  DB1[("Database A")]
  DB2[("Database B")]
  Cache[("Redis Cache")]

  Client --> Gateway
  Gateway --> ServiceA
  Gateway --> ServiceB
  ServiceA --> DB1
  ServiceA --> Cache
  ServiceB --> DB2
```

## Components

| Component | Role | Tech Stack | Notes |
|-----------|------|------------|-------|
| Client | User Interface | React | |
| API Gateway | Routing, Auth | Kong / Nginx | |
| Service A | {{role}} | {{tech}} | |
| Service B | {{role}} | {{tech}} | |
| Database A | {{role}} | PostgreSQL | |
| Redis Cache | Cache | Redis | |

## Infrastructure

| Item | Dev | Staging | Prod |
|------|-----|---------|------|
| Server | Docker local | AWS ECS | AWS ECS |
| DB | PostgreSQL (local) | RDS | RDS (Multi-AZ) |
| CDN | - | - | CloudFront |

## Change History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | {{date}} | Initial revision | {{author}} |
