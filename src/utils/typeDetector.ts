import { ArtifactType, ARTIFACT_TYPES } from '../types';

// ```mermaid ... ``` 블록 전체를 캡처. 중첩 없이 단순 쌍 매칭.
const MERMAID_BLOCK_RE = /```mermaid([\s\S]*?)```/g;

function hasMermaidKeyword(content: string, pattern: RegExp): boolean {
  MERMAID_BLOCK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MERMAID_BLOCK_RE.exec(content)) !== null) {
    if (pattern.test(match[1])) return true;
  }
  return false;
}

/**
 * PRD 섹션 3.3 규칙에 따라 산출물 유형을 감지한다.
 *
 * @param frontmatterType - frontmatter의 type 필드 값 (없으면 undefined)
 * @param content         - 마크다운 본문 전체
 * @param filePath        - Vault 내 파일 경로
 * @returns 감지된 ArtifactType, 감지 불가 시 null
 */
export function detectType(
  frontmatterType: string | undefined,
  content: string,
  filePath: string,
): ArtifactType | null {
  // 규칙 0: frontmatter type이 있으면 그대로 사용
  if (frontmatterType !== undefined && frontmatterType !== '') {
    const normalized = frontmatterType.trim().toLowerCase() as ArtifactType;
    return ARTIFACT_TYPES.includes(normalized) ? normalized : null;
  }

  // 규칙 1: mermaid 블록 내 erDiagram → erd
  if (hasMermaidKeyword(content, /\berDiagram\b/)) return 'erd';

  // 규칙 2: mermaid 블록 내 gantt → wbs
  if (hasMermaidKeyword(content, /\bgantt\b/)) return 'wbs';

  // 규칙 3: mermaid 블록 내 flowchart 또는 graph → architecture
  if (hasMermaidKeyword(content, /\b(?:flowchart|graph)\b/)) return 'architecture';

  // 규칙 4: 파일 경로에 /api/ 포함 + .yaml/.json 확장자 → api
  if (/\/api\//.test(filePath) && /\.(yaml|json)$/i.test(filePath)) return 'api';

  // 규칙 5: 파일 경로에 /meeting 포함 → meeting
  if (/\/meeting/.test(filePath)) return 'meeting';

  // 규칙 6: 감지 불가 → null (기본 옵시디언 렌더링)
  return null;
}
