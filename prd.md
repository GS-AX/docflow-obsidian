# PRD: DocFlow — Obsidian IT 산출물 관리 플러그인

**버전:** 2.1.0  
**최초 작성일:** 2026-05-02  
**최종 수정일:** 2026-05-03  
**상태:** Phase 1 완료 · 스토어 제출 준비 중

---

## 1. 개요 (Overview)

### 1.1 전략적 배경

DocFlow는 IT 프로젝트 산출물(ERD, API 명세, 요구사항정의서, WBS, 업무 매뉴얼 등)을 마크다운으로 통합 관리하고, Git으로 버전을 추적하며, 산출물 유형별 최적화된 뷰로 열람하는 플랫폼이다.

**Phase 1 (완료):** Obsidian 커뮤니티 플러그인으로 빠르게 출시  
→ 100만+ Obsidian 사용자 기반으로 초기 트랙션 확보, 핵심 기능 검증

**Phase 2 (예정):** 웹 뷰어 + 공유 링크 기능 추가  
→ 플러그인에서 "웹으로 퍼블리시" → DocFlow 서버로 전송

**Phase 3 (예정):** 독립 웹앱 병행  
→ Obsidian 없이도 쓸 수 있는 전사 플랫폼

이 문서는 **Phase 1 — Obsidian 플러그인**의 PRD다.

### 1.2 목표

- Obsidian Vault를 IT 산출물 저장소로 활용
- 마크다운 frontmatter의 `type` 필드로 산출물 유형 자동 감지
- ERD, API 명세, WBS 등 IT 산출물을 Obsidian 내에서 최적화된 뷰로 렌더링
- 영어/한국어 이중 언어 UI 및 템플릿 기본 지원
- Obsidian 커뮤니티 플러그인 스토어 등록 및 승인

### 1.3 타겟 사용자

| 사용자 | 사용 패턴 |
|--------|---------|
| 개발자 / 엔지니어 | ERD, API 명세, 아키텍처 다이어그램을 Obsidian에서 바로 확인 |
| PM / 기획자 | WBS, 요구사항정의서, 회의록을 Obsidian 볼트로 관리 |
| 개인 IT 지식 관리 | 기술 문서, 학습 노트를 구조화된 뷰로 열람 |

---

## 2. 기술 기반

### 2.1 플러그인 아키텍처

```
Obsidian App
├── Vault (마크다운 파일 저장소)
│     └── .obsidian/plugins/docflow/   ← 플러그인 설치 위치
│
├── Plugin API
│     ├── registerMarkdownCodeBlockProcessor  ← mermaid / yaml / json 코드블록 처리
│     ├── ItemView                            ← 커스텀 사이드패널 뷰
│     ├── Modal                               ← 팝업 다이얼로그
│     └── MetadataCache                       ← frontmatter 파싱 캐시
│
└── DocFlow Plugin
      ├── src/main.ts                ← 플러그인 진입점
      ├── src/renderers/             ← 산출물 유형별 렌더러
      ├── src/views/                 ← 커스텀 사이드패널 뷰
      ├── src/utils/                 ← 유틸리티 (frontmatter, typeDetector, templateInserter)
      ├── src/i18n/                  ← 다국어 번역 맵 (en, ko)
      └── template/                  ← 산출물 템플릿 (en/, ko/)
```

### 2.2 기술 스택

| 항목 | 기술 | 비고 |
|------|------|------|
| 언어 | TypeScript | Obsidian 플러그인 표준 |
| 빌드 | esbuild | CSS/MD 파일 text loader 포함 |
| 다이어그램 | Mermaid.js v10 | ERD, Flowchart, Gantt · `securityLevel: 'strict'` |
| API 렌더링 | swagger-ui-dist v5 | OpenAPI 3.0 / Swagger 2.0 |
| 스타일 | CSS Variables | Obsidian 테마 자동 연동 |
| 다국어 | 자체 구현 i18n | EN / KO · `t()` / `tf()` 함수 |
| 테스트 | Jest | 유닛 테스트 (typeDetector, frontmatter) |

### 2.3 스토어 등록 요건 (달성 현황)

| 요건 | 상태 |
|------|------|
| `manifest.json` 필수 필드 완비 | ✅ |
| `eval()` 미사용 | ✅ |
| `innerHTML` XSS 처리 (`// nosec` + mermaid strict) | ✅ |
| `console.log` 제거 | ✅ |
| `onunload()` cleanup 완비 | ✅ |
| 외부 네트워크 요청 없음 (Swagger Try it out 제외, 설정 OFF 기본) | ✅ |
| 설정 항목별 설명 텍스트 | ✅ |
| GitHub Release에 main.js + manifest.json + styles.css 첨부 | ✅ |
| README.md 영문 작성 | ✅ |
| 스크린샷 | ⏳ 추가 예정 |

---

## 3. 산출물 유형 및 렌더링 전략

### 3.1 frontmatter 기반 유형 감지

```yaml
---
title: User Management ERD
type: erd
project: user-management
version: 1.3.0
status: approved      # draft | review | approved | deprecated
author: John Doe
tags: [database, user, auth]
related:
  - "[[auth-api]]"
  - "[[user-requirements]]"
---
```

### 3.2 지원 산출물 유형

| type | 산출물 | 렌더링 방식 | Phase |
|------|--------|-----------|-------|
| `erd` | ERD | Mermaid erDiagram → 인터랙티브 다이어그램 + 테이블 뷰 | **P1 완료** |
| `api` | API 명세 | OpenAPI 3.0 / Swagger 2.0 → Swagger UI | **P1 완료** |
| `architecture` | 시스템 아키텍처 | Mermaid flowchart passthrough | **P1 완료** |
| `wbs` | WBS / 일정 | Mermaid gantt passthrough | **P1 완료** |
| `requirements` | 요구사항정의서 | Structured markdown | **P1 완료** |
| `manual` | 업무 매뉴얼 | Structured markdown | **P1 완료** |
| `meeting` | 회의록 | Structured markdown | **P1 완료** |

### 3.3 type 자동 감지 규칙

frontmatter에 `type`이 없고 `autoTypeDetection` 설정이 ON인 경우 본문 내용으로 감지한다.

1. 본문에 mermaid 블록 + `erDiagram` 포함 → `erd`
2. 본문에 mermaid 블록 + `gantt` 포함 → `wbs`
3. 본문에 mermaid 블록 + `flowchart` / `graph` 포함 → `architecture`
4. 파일 경로에 `/api/` 포함 + `.yaml` / `.json` → `api`
5. 파일 경로에 `/meeting` 포함 → `meeting`
6. 그 외 → 기본 Obsidian 렌더링 (플러그인 미개입)

---

## 4. 핵심 기능 명세 (Phase 1 구현 완료)

### 4.1 ERD 렌더러

- Reading View에서 mermaid 블록 내 `erDiagram` 감지 시 자동 활성화
- Mermaid.js로 인터랙티브 다이어그램 렌더링 (`securityLevel: 'strict'`)
- **다이어그램 뷰 / 테이블 뷰** 탭 전환
- PNG / SVG 다운로드 버튼
- 줌 인/아웃, 드래그 이동 (`setPointerCapture` 방식)
- Obsidian 다크/라이트 테마 자동 동기화 (`syncMermaidTheme()`)

### 4.2 API 명세 렌더러

- frontmatter `type: api` 또는 yaml/json 코드블록의 OpenAPI 구조 감지 시 활성화
- swagger-ui-dist v5로 Swagger UI 렌더링
- OpenAPI 3.0 / Swagger 2.0 모두 지원
- Try it out 기능 설정으로 on/off (기본 OFF)
- Obsidian 테마 자동 대응

### 4.3 아키텍처 / WBS 렌더러

- `flowchart`, `graph`, `gantt` Mermaid 블록 → mermaid.js로 직접 렌더링
- Obsidian 기본 mermaid 렌더러를 대체하며 동일한 출력 보장

### 4.4 문서 메타데이터 패널 (우측 사이드바)

**표시 정보:**
- 문서 상태 뱃지
- 버전, 작성자, 최종 수정일
- 태그 목록
- 연관 문서 링크 (클릭 시 해당 파일 열기)

**상태 뱃지 색상:**

| 상태 | 색상 |
|------|------|
| draft | 회색 |
| review | 주황 |
| approved | 초록 |
| deprecated | 빨강 |

**동작:**
- `active-leaf-change` 이벤트로 파일 전환 시 자동 갱신
- `metadataCache.changed` 이벤트로 frontmatter 수정 시 자동 갱신
- `metadataPanelAutoOpen` 설정 ON 시 Reading View 진입 시 자동 열기

### 4.5 산출물 탐색기 (좌측 사이드바)

- Vault 내 IT 산출물 목록 (frontmatter `type` 있는 파일만)
- 유형별 / 상태별 필터링 (버튼 토글)
- `project` 필드 기준 그룹핑 (접기/펼치기)
- 파일 클릭 시 열기
- 파일 생성/삭제/변경 시 debounce 300ms 자동 재스캔

### 4.6 산출물 템플릿 삽입

**커맨드:** `DocFlow: Insert Artifact Template` (언어 설정에 따라 한국어로도 표시)

**흐름:**
1. TypeSelectModal — 7개 유형 중 선택 (3열 그리드, 아이콘 + 레이블)
2. PlaceholderFormModal — frontmatter 플레이스홀더 입력 (`{{title}}`, `{{project}}`, `{{author}}` 등)
3. 현재 에디터에 삽입 (빈 파일: `setValue`, 커서 위치: `replaceSelection`)

**날짜 자동 채우기:** 오늘 날짜가 `date` / `YYYY-MM-DD` 플레이스홀더에 자동 입력됨 (언어별 필드명 대응)

### 4.7 다국어 지원 (i18n)

**지원 언어:** English / 한국어

**언어 선택 방식:**
- `Auto` — `navigator.language` 기반 자동 감지
- `English` — 영문 UI 고정
- `한국어` — 한국어 UI 고정

**적용 범위:**

| 항목 | EN | KO |
|------|----|----|
| 탐색기 / 메타데이터 패널 레이블 | ✅ | ✅ |
| 상태 / 유형 뱃지 | ✅ | ✅ |
| 필터 바 (Type / Status / All) | ✅ | ✅ |
| 템플릿 삽입 모달 | ✅ | ✅ |
| 산출물 템플릿 내용 | ✅ (`template/en/`) | ✅ (`template/ko/`) |
| 커맨드 팔레트 이름 | ✅ | ✅ (재활성화 후 적용) |
| 설정 탭 레이블 및 설명 | ✅ | ✅ |
| Notice 메시지 | ✅ | ✅ |

**언어 변경 시 동작:**
- 탐색기 / 메타데이터 패널: 즉시 갱신 (`refreshAllViews()`)
- 설정 탭: 즉시 재렌더링
- 커맨드 팔레트 이름: 플러그인 재활성화 후 적용 (Obsidian API 제약)

---

## 5. 설정 항목

| 설정 항목 | 기본값 | 설명 |
|---------|-------|------|
| Language | auto | UI 언어 및 템플릿 언어 (`auto` / `en` / `ko`) |
| Auto Type Detection | ON | frontmatter `type` 없을 때 본문 분석으로 감지 |
| Swagger Try it out | OFF | API 렌더러 직접 HTTP 요청 기능 |
| Diagram Theme | auto | `auto` (Obsidian 테마 따라감) / `light` / `dark` |
| Auto-open Metadata Panel | ON | Reading View 진입 시 우측 패널 자동 열기 |
| Scan Paths | (전체) | 특정 폴더만 스캔하도록 제한 (쉼표 구분) |

---

## 6. 폴더 구조 (현재)

```
docflow-obsidian/
├── src/
│   ├── main.ts                     # 플러그인 진입점, refreshAllViews()
│   ├── settings.ts                 # 설정 탭 (i18n 적용)
│   ├── types.ts                    # 공통 타입 + DocFlowSettings
│   ├── i18n.ts                     # t(), tf(), initI18n(), getCurrentLang()
│   │
│   ├── i18n/
│   │   ├── en.ts                   # 영문 번역 맵 (Translations 타입 정의)
│   │   └── ko.ts                   # 한국어 번역 맵
│   │
│   ├── renderers/
│   │   ├── index.ts                # 렌더러 라우터 (mermaid / yaml / json)
│   │   ├── ErdRenderer.ts          # ERD 렌더러 + syncMermaidTheme() 공유 export
│   │   ├── ApiRenderer.ts          # Swagger UI 렌더러
│   │   ├── ArchitectureRenderer.ts
│   │   ├── WbsRenderer.ts
│   │   ├── RequirementsRenderer.ts
│   │   ├── ManualRenderer.ts
│   │   └── MeetingRenderer.ts
│   │
│   ├── views/
│   │   ├── ArtifactExplorerView.ts # 좌측 사이드바, forceRefresh() 공개 메서드
│   │   └── MetadataPanelView.ts    # 우측 메타데이터 패널, forceRefresh() 공개 메서드
│   │
│   └── utils/
│       ├── frontmatter.ts          # frontmatter 파싱 (parseFrontmatter, getFrontmatter)
│       ├── typeDetector.ts         # 유형 자동 감지
│       ├── typeDetector.test.ts
│       ├── frontmatter.test.ts
│       ├── templateInserter.ts     # 템플릿 삽입 (TypeSelectModal, PlaceholderFormModal)
│       └── global.d.ts             # *.css, *.md 텍스트 임포트 타입 선언
│
├── template/
│   ├── en/                         # 영문 템플릿 (7종)
│   │   ├── erd-template.md
│   │   ├── api-template.md
│   │   ├── architecture-template.md
│   │   ├── wbs-template.md
│   │   ├── requirements-template.md
│   │   ├── meeting-template.md
│   │   └── manual-template.md
│   └── ko/                         # 한국어 템플릿 (7종)
│       ├── erd-template.md
│       ├── api-template.md
│       ├── architecture-template.md
│       ├── wbs-template.md
│       ├── requirements-template.md
│       ├── meeting-template.md
│       └── manual-template.md
│
├── styles.css
├── manifest.json
├── package.json
├── esbuild.config.mjs
├── tsconfig.json
├── README.md
└── prd.md
```

---

## 7. manifest.json (현재)

```json
{
  "id": "docflow",
  "name": "DocFlow",
  "version": "1.0.0",
  "minAppVersion": "1.4.0",
  "description": "Render IT project artifacts (ERD, API specs, WBS, architecture diagrams) with type-aware views inside Obsidian.",
  "author": "HJ",
  "authorUrl": "https://github.com/GS-AX/docflow-obsidian",
  "fundingUrl": "",
  "isDesktopOnly": false
}
```

---

## 8. 구현 로드맵

### Phase 1 — MVP (완료)

- [x] frontmatter 파싱 및 type 자동 감지
- [x] ERD 렌더러 (Mermaid erDiagram + 다이어그램/테이블 뷰 + PNG/SVG 내보내기)
- [x] API 명세 렌더러 (Swagger UI, OpenAPI 3.0 / 2.0)
- [x] 아키텍처 / WBS 다이어그램 렌더러 (Mermaid passthrough)
- [x] 문서 메타데이터 패널 (상태 뱃지, 연관 문서, 자동 갱신)
- [x] 산출물 탐색기 (사이드바, 필터, 그룹핑)
- [x] 산출물 템플릿 삽입 커맨드 (7종, 플레이스홀더 입력 폼)
- [x] 플러그인 설정 탭
- [x] 다크/라이트 테마 대응
- [x] 영어/한국어 이중 언어 UI 및 템플릿 (i18n)
- [x] 커맨드 팔레트 이름 언어화
- [x] manifest.json + GitHub Release v1.0.0
- [ ] obsidian-releases PR 제출 ← **다음 단계**
- [ ] README 스크린샷 추가 ← **다음 단계**

---

### Phase 2 — 기능 확장 (예정)

- [ ] WBS Gantt 차트 테이블 뷰 전환
- [ ] 요구사항정의서 인터랙티브 필터/정렬 테이블
- [ ] 회의록 타임라인 + 액션 아이템 자동 추출
- [ ] 업무 매뉴얼 H2/H3 기반 자동 목차(TOC)
- [ ] 연관관계 그래프 강화 (`related` 필드 → 그래프 노드)
- [ ] `type:erd`, `status:approved` 등 전문 검색 연산자
- [ ] obsidian-git 연동 (커밋 이력 사이드패널)

---

### Phase 3 — 웹 연동 (예정)

- [ ] "웹으로 퍼블리시" 기능 (선택 문서 → DocFlow 웹 서버 전송)
- [ ] 공유 링크 생성 (외부 Guest 접근)
- [ ] 독립 웹앱 연동

---

## 9. Obsidian 플러그인 스토어 배포 가이드

### 9.1 배포 전체 흐름

```
개발 완료
    ↓
GitHub Release 생성 (main.js + manifest.json + styles.css 첨부)  ← 완료 (v1.0.0)
    ↓
obsidian-releases PR 제출  ← 다음 단계
    ↓
Obsidian 팀 코드 리뷰 (보통 2~8주)
    ↓
PR 머지 → 커뮤니티 플러그인 스토어 자동 노출
```

> 심사 중에도 GitHub에서 직접 설치해 베타 테스트 가능

### 9.2 obsidian-releases PR 제출 방법

```
# 1. https://github.com/obsidianmd/obsidian-releases Fork

# 2. community-plugins.json 배열에 아래 항목 추가
{
  "id": "docflow",
  "name": "DocFlow",
  "author": "HJ",
  "description": "Render IT project artifacts (ERD, API specs, WBS, architecture diagrams) with type-aware views inside Obsidian.",
  "repo": "GS-AX/docflow-obsidian"
}

# 3. PR 제출 (제목 예시: "Add DocFlow plugin")
```

### 9.3 코드 리뷰 통과 기준

**보안**

| 항목 | 기준 | 현황 |
|------|------|------|
| `eval()` | 절대 사용 금지 | ✅ 미사용 |
| `innerHTML` | XSS 방지 처리 필수 | ✅ mermaid strict + `// nosec` |
| 외부 네트워크 요청 | 사용자 고지 필요 | ✅ Try it out 설정 OFF 기본 |
| 민감 정보 하드코딩 | 절대 금지 | ✅ 없음 |

**코드 품질**

| 항목 | 기준 | 현황 |
|------|------|------|
| `console.log` | 프로덕션 코드에서 제거 | ✅ 제거 완료 |
| `onunload()` | 모든 리소스 완전 정리 | ✅ 렌더러 + 뷰 리프 detach |
| 에러 처리 | 사용자 친화적 Notice | ✅ 전 구간 적용 |

**UX**

| 항목 | 기준 | 현황 |
|------|------|------|
| 테마 대응 | 다크/라이트 모두 정상 | ✅ CSS Variables 사용 |
| 설정 텍스트 | 각 항목 설명 문구 필수 | ✅ 전 항목 EN/KO |
| 플러그인 비활성화 | 완전히 원복 | ✅ |

**README**

| 항목 | 기준 | 현황 |
|------|------|------|
| 기능 설명 | 명확히 | ✅ |
| 사용 방법 | 단계별 | ✅ |
| 스크린샷 | 1장 이상 권장 | ⏳ 추가 예정 |
| 모바일 지원 여부 | 명시 | ✅ `isDesktopOnly: false` |

### 9.4 최종 체크리스트

**파일 구성**
- [x] `manifest.json` 필수 필드 완비, id 중복 없음 확인
- [x] `main.js` (esbuild 빌드 결과물)
- [x] `styles.css`
- [x] `README.md` (영문)
- [x] GitHub Release v1.0.0에 3개 파일 Asset 첨부
- [ ] README 스크린샷 추가

**코드 품질**
- [x] `eval()` 미사용 전수 확인
- [x] `innerHTML` XSS 처리 확인
- [x] `console.log` 전부 제거
- [x] `onunload()` cleanup 로직 완비
- [x] 외부 네트워크 요청 없음 (Try it out 제외, 기본 OFF)

**PR 제출**
- [ ] `obsidian-releases` 저장소 Fork
- [ ] `community-plugins.json`에 항목 추가
- [ ] PR 설명에 기능 설명 + 스크린샷 첨부

### 9.5 공식 참고 문서

- 플러그인 개발 가이드: `https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin`
- 샘플 플러그인 템플릿: `https://github.com/obsidianmd/obsidian-sample-plugin`
- 스토어 등록 저장소: `https://github.com/obsidianmd/obsidian-releases`
- community-plugins.json (id 중복 확인): `https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json`

---

## 10. 용어 정의

| 용어 | 정의 |
|------|------|
| Vault | Obsidian의 마크다운 파일 저장소 (폴더 단위) |
| frontmatter | 마크다운 파일 최상단 YAML 메타데이터 (`---`로 구분) |
| Reading View | Obsidian의 렌더링된 미리보기 뷰 |
| registerMarkdownCodeBlockProcessor | 코드블록 렌더링을 커스터마이징하는 Obsidian API |
| ItemView | Obsidian 사이드패널에 커스텀 뷰를 추가하는 API |
| i18n | Internationalization — 다국어 지원 |
| obsidian-releases | 커뮤니티 플러그인 등록을 관리하는 공식 GitHub 저장소 |

---

*Phase 3 웹 연동 구현 시 별도 웹앱 PRD를 작성하여 참조한다.*
