---
title: {{title}} WBS
type: wbs
project: {{project}}
version: 1.0.0
status: draft
author: {{author}}
tags: [schedule, wbs]
related: []
---

## Schedule

```mermaid
gantt
  title {{project}} Development Schedule
  dateFormat YYYY-MM-DD
  section Planning
    Requirements     :done,    req,  2026-01-01, 2026-01-14
    Design           :done,    des,  2026-01-15, 2026-01-28
  section Development
    Backend Dev      :active,  be,   2026-02-01, 2026-03-15
    Frontend Dev     :         fe,   2026-03-01, 2026-04-15
  section QA
    Testing          :         qa,   2026-04-16, 2026-04-30
  section Deployment
    Production Deploy:         dep,  2026-05-01, 2026-05-07
```

## Milestones

| Milestone | Target | Status | Notes |
|-----------|--------|--------|-------|
| Planning Done | 2026-01-28 | ✅ Done | |
| Dev Done | 2026-04-15 | 🔄 In Progress | |
| QA Done | 2026-04-30 | ⏳ Pending | |
| Release | 2026-05-07 | ⏳ Pending | |

## Task List

| ID | Task | Assignee | Start | End | Status |
|----|------|----------|-------|-----|--------|
| T-001 | Requirements | {{assignee}} | 2026-01-01 | 2026-01-14 | Done |
| T-002 | Design | {{assignee}} | 2026-01-15 | 2026-01-28 | Done |
| T-003 | Backend Dev | {{assignee}} | 2026-02-01 | 2026-03-15 | In Progress |
| T-004 | Frontend Dev | {{assignee}} | 2026-03-01 | 2026-04-15 | Pending |

## Change History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | {{date}} | Initial revision | {{author}} |
