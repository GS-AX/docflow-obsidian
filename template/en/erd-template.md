---
title: {{title}}
type: erd
project: {{project}}
version: 1.0.0
status: draft
author: {{author}}
tags: [database]
related: []
---

## Overview

{{ERD description}}

## Diagram

```mermaid
erDiagram
  ENTITY_A {
    int id PK
    string name
    datetime created_at
  }
  ENTITY_B {
    int id PK
    int entity_a_id FK
    string value
  }
  ENTITY_A ||--o{ ENTITY_B : "has"
```

## Table Descriptions

### ENTITY_A

| Column | Type | Description |
|--------|------|-------------|
| id | INT | PK, Auto Increment |
| name | VARCHAR(100) | Name |
| created_at | DATETIME | Created at |

### ENTITY_B

| Column | Type | Description |
|--------|------|-------------|
| id | INT | PK, Auto Increment |
| entity_a_id | INT | FK → ENTITY_A.id |
| value | VARCHAR(255) | Value |

## Change History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | {{date}} | Initial revision | {{author}} |
