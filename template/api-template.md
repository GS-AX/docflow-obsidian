---
title: {{제목}} API 명세
type: api
project: {{프로젝트명}}
version: 1.0.0
status: draft
author: {{작성자}}
tags: [api, rest]
related: []
---

## 개요

{{API 설명}}

## 명세

```yaml
openapi: 3.0.0
info:
  title: {{API 이름}}
  version: 1.0.0
  description: {{API 설명}}

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://api-dev.example.com/v1
    description: Development

paths:
  /resources:
    get:
      summary: 목록 조회
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
          description: 성공
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
          description: 인증 실패

    post:
      summary: 생성
      tags: [Resource]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ResourceCreateRequest'
      responses:
        '201':
          description: 생성 성공
        '400':
          description: 잘못된 요청

  /resources/{id}:
    get:
      summary: 단건 조회
      tags: [Resource]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: 성공
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Resource'
        '404':
          description: 리소스 없음

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

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|---------|-------|
| 1.0.0 | {{날짜}} | 최초 작성 | {{작성자}} |
