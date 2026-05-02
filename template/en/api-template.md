---
title: {{title}} API Spec
type: api
project: {{project}}
version: 1.0.0
status: draft
author: {{author}}
tags: [api, rest]
related: []
---

## Overview

{{API description}}

## Specification

```yaml
openapi: 3.0.0
info:
  title: {{API name}}
  version: 1.0.0
  description: {{API description}}

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://api-dev.example.com/v1
    description: Development

paths:
  /resources:
    get:
      summary: List
      tags: [Resource]
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Resource'
                  total:
                    type: integer
        '401':
          description: Unauthorized

    post:
      summary: Create
      tags: [Resource]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ResourceCreateRequest'
      responses:
        '201':
          description: Created
        '400':
          description: Bad Request

  /resources/{id}:
    get:
      summary: Get by ID
      tags: [Resource]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Resource'
        '404':
          description: Not Found

components:
  schemas:
    Resource:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        createdAt:
          type: string
          format: date-time

    ResourceCreateRequest:
      type: object
      required: [name]
      properties:
        name:
          type: string
          maxLength: 100

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - bearerAuth: []
```

## Change History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | {{date}} | Initial revision | {{author}} |
