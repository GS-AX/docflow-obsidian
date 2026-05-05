import { App, TFile } from 'obsidian';
import { ArtifactStatus, ARTIFACT_STATUSES, DocFlowFrontmatter } from '../types';

// ── 내부 헬퍼 ─────────────────────────────────────────────────────────────────

function toStatus(value: unknown): ArtifactStatus {
  if (typeof value === 'string' && ARTIFACT_STATUSES.includes(value as ArtifactStatus)) {
    return value as ArtifactStatus;
  }
  return 'draft';
}

/**
 * YAML 파서가 단일 값을 string | number | boolean 으로 줄 수 있어 배열로 정규화한다.
 * tags: [one, two]  → ["one", "two"]
 * tags: one         → ["one"]
 * tags: (없음)      → []
 */
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (v != null && typeof v !== 'object' ? String(v).trim() : ''))
      .filter(Boolean);
  }
  if (value != null && value !== '' && typeof value !== 'object') {
    return [String(value).trim()];
  }
  return [];
}

/**
 * version 필드는 semver 문자열이 보통이지만,
 * YAML 파서가 "1.0" 같은 값을 number로 해석할 수 있어 String() 변환을 거친다.
 */
function toVersion(value: unknown): string {
  if (typeof value === 'string') return value.trim() || '1.0.0';
  if (typeof value === 'number') return String(value) || '1.0.0';
  return '1.0.0';
}

// ── 공개 API ──────────────────────────────────────────────────────────────────

/**
 * 원시 frontmatter 객체를 DocFlowFrontmatter 로 정규화한다.
 *
 * Obsidian API에 의존하지 않는 순수 함수이므로 단독 테스트가 가능하다.
 *
 * @param raw      - MetadataCache 가 반환한 frontmatter 객체 (없으면 undefined)
 * @param fileName - 파일명 (basename, 확장자 제외). title 폴백에 사용.
 */
export function parseFrontmatter(
  raw: Record<string, unknown> | undefined,
  fileName: string,
): DocFlowFrontmatter {
  if (!raw) {
    return {
      title: fileName,
      type: undefined,
      project: '',
      version: '1.0.0',
      status: 'draft',
      author: '',
      tags: [],
      related: [],
    };
  }

  const title =
    typeof raw.title === 'string' && raw.title.trim()
      ? raw.title.trim()
      : fileName;

  const type =
    typeof raw.type === 'string' && raw.type.trim()
      ? raw.type.trim().toLowerCase()
      : undefined;

  return {
    title,
    type,
    project: typeof raw.project === 'string' ? raw.project.trim() : '',
    version: toVersion(raw.version),
    status: toStatus(raw.status),
    author: typeof raw.author === 'string' ? raw.author.trim() : '',
    tags: toStringArray(raw.tags),
    related: toStringArray(raw.related),
  };
}

/**
 * Obsidian MetadataCache API 를 통해 파일의 frontmatter 를 읽어 반환한다.
 *
 * @param file - 대상 TFile
 * @param app  - Obsidian App 인스턴스
 */
export function getFrontmatter(file: TFile, app: App): DocFlowFrontmatter {
  const cache = app.metadataCache.getFileCache(file);
  return parseFrontmatter(cache?.frontmatter, file.basename);
}
