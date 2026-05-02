export type ArtifactType =
  | 'erd'
  | 'api'
  | 'architecture'
  | 'wbs'
  | 'requirements'
  | 'manual'
  | 'meeting';

export const ARTIFACT_TYPES: ArtifactType[] = [
  'erd',
  'api',
  'architecture',
  'wbs',
  'requirements',
  'manual',
  'meeting',
];

export type ArtifactStatus = 'draft' | 'review' | 'approved' | 'deprecated';

export const ARTIFACT_STATUSES: ArtifactStatus[] = [
  'draft',
  'review',
  'approved',
  'deprecated',
];

export interface DocFlowFrontmatter {
  /** 문서 제목. frontmatter에 없으면 파일명(basename)으로 대체. */
  title: string;
  /** raw 문자열 그대로 보존. 유효성 검증은 typeDetector가 담당. */
  type: string | undefined;
  project: string;
  /** semver 형식 권장. frontmatter에 없으면 '1.0.0'. */
  version: string;
  status: ArtifactStatus;
  author: string;
  tags: string[];
  /** wiki 링크 문자열 배열. 예: ["[[auth-api]]", "[[user-erd]]"] */
  related: string[];
}

// ── 플러그인 설정 ─────────────────────────────────────────────────────────────

export interface DocFlowSettings {
  /** frontmatter type 없을 때 본문 분석으로 산출물 유형 자동 감지 (기본 ON) */
  autoTypeDetection: boolean;
  /** Swagger UI의 Try it out 기능 활성 여부 (기본 OFF) */
  swaggerTryItOut: boolean;
  /** Reading View 진입 시 우측 메타데이터 패널 자동 열기 (기본 ON) */
  metadataPanelAutoOpen: boolean;
  /** 다이어그램 테마: 'auto' 이면 Obsidian 테마를 따름 (기본 'auto') */
  diagramTheme: 'auto' | 'light' | 'dark';
  /** 산출물 스캔 대상 경로 (빈 배열 = Vault 전체 스캔) */
  scanPaths: string[];
  /** UI 언어: 'auto' 이면 브라우저/시스템 로케일을 따름 (기본 'auto') */
  language: 'auto' | 'en' | 'ko';
}

export const DEFAULT_SETTINGS: DocFlowSettings = {
  autoTypeDetection: true,
  swaggerTryItOut: false,
  metadataPanelAutoOpen: true,
  diagramTheme: 'auto',
  scanPaths: [],
  language: 'auto',
};
