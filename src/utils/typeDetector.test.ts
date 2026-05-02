import { detectType } from './typeDetector';

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

function mermaid(body: string): string {
  return '```mermaid\n' + body + '\n```';
}

// ── frontmatter type 우선 사용 ────────────────────────────────────────────────

describe('frontmatter type이 있는 경우', () => {
  it.each([
    'erd', 'api', 'architecture', 'wbs', 'requirements', 'manual', 'meeting',
  ] as const)('"%s" → 그대로 반환', (type) => {
    expect(detectType(type, '', '')).toBe(type);
  });

  it('앞뒤 공백 제거 후 반환', () => {
    expect(detectType('  erd  ', '', '')).toBe('erd');
  });

  it('알 수 없는 type이면 null 반환', () => {
    expect(detectType('unknown-type', '', '')).toBeNull();
  });

  it('본문·경로와 관계없이 frontmatter를 최우선 적용', () => {
    const content = mermaid('gantt\n  title 일정');
    expect(detectType('erd', content, '/api/foo.yaml')).toBe('erd');
  });
});

// ── mermaid 블록 기반 자동 감지 ───────────────────────────────────────────────

describe('mermaid 블록 자동 감지', () => {
  describe('erDiagram → erd (규칙 1)', () => {
    it('기본 감지', () => {
      expect(detectType(undefined, mermaid('erDiagram\n  USER { int id }'), '')).toBe('erd');
    });

    it('다른 텍스트가 앞뒤에 있어도 감지', () => {
      const content = '## 개요\n설명\n\n' + mermaid('erDiagram\n  A ||--o{ B : ""') + '\n\n## 끝';
      expect(detectType(undefined, content, '')).toBe('erd');
    });

    it('mermaid 블록 밖의 erDiagram 문자열은 무시', () => {
      const content = '본문에 erDiagram 이라고 써도 감지 안 됨\n```\nerDiagram\n```';
      expect(detectType(undefined, content, '')).toBeNull();
    });
  });

  describe('gantt → wbs (규칙 2)', () => {
    it('기본 감지', () => {
      expect(detectType(undefined, mermaid('gantt\n  title 일정'), '')).toBe('wbs');
    });

    it('erDiagram이 있으면 gantt보다 우선 (규칙 1 > 규칙 2)', () => {
      const content = mermaid('erDiagram\n  A { int id }') + '\n\n' + mermaid('gantt\n  title 일정');
      expect(detectType(undefined, content, '')).toBe('erd');
    });
  });

  describe('flowchart / graph → architecture (규칙 3)', () => {
    it('flowchart 감지', () => {
      expect(detectType(undefined, mermaid('flowchart TD\n  A --> B'), '')).toBe('architecture');
    });

    it('graph 감지', () => {
      expect(detectType(undefined, mermaid('graph LR\n  A --> B'), '')).toBe('architecture');
    });

    it('gantt이 있으면 flowchart보다 우선 (규칙 2 > 규칙 3)', () => {
      const content = mermaid('gantt\n  title 일정') + '\n\n' + mermaid('flowchart TD\n  A --> B');
      expect(detectType(undefined, content, '')).toBe('wbs');
    });

    it('mermaid 블록 밖의 flowchart는 무시', () => {
      const content = 'flowchart라는 단어가 본문에 있음';
      expect(detectType(undefined, content, '')).toBeNull();
    });
  });
});

// ── 파일 경로 기반 자동 감지 ──────────────────────────────────────────────────

describe('파일 경로 기반 자동 감지', () => {
  describe('/api/ + .yaml/.json → api (규칙 4)', () => {
    it('.yaml 확장자', () => {
      expect(detectType(undefined, '', '/project/api/auth.yaml')).toBe('api');
    });

    it('.json 확장자', () => {
      expect(detectType(undefined, '', '/project/api/users.json')).toBe('api');
    });

    it('확장자 대소문자 무관 (.YAML)', () => {
      expect(detectType(undefined, '', '/project/api/auth.YAML')).toBe('api');
    });

    it('/api/ 없이 .yaml만으로는 감지 안 됨', () => {
      expect(detectType(undefined, '', '/project/docs/schema.yaml')).toBeNull();
    });

    it('/api/ 있어도 .md 확장자면 감지 안 됨', () => {
      expect(detectType(undefined, '', '/project/api/notes.md')).toBeNull();
    });

    it('mermaid 블록이 있으면 경로보다 우선 (규칙 1~3 > 규칙 4)', () => {
      const content = mermaid('erDiagram\n  A { int id }');
      expect(detectType(undefined, content, '/project/api/schema.yaml')).toBe('erd');
    });
  });

  describe('/meeting → meeting (규칙 5)', () => {
    it('경로에 /meeting 포함', () => {
      expect(detectType(undefined, '', '/project/meeting/2026-01-01.md')).toBe('meeting');
    });

    it('/meetings(복수)도 감지', () => {
      expect(detectType(undefined, '', '/docs/meetings/kickoff.md')).toBe('meeting');
    });

    it('/api/ + .yaml이 있으면 /meeting보다 우선 (규칙 4 > 규칙 5)', () => {
      expect(detectType(undefined, '', '/api/meeting/endpoints.yaml')).toBe('api');
    });
  });
});

// ── 감지 불가 케이스 ──────────────────────────────────────────────────────────

describe('감지 불가 케이스', () => {
  it('빈 content + 빈 경로 → null', () => {
    expect(detectType(undefined, '', '')).toBeNull();
  });

  it('일반 마크다운 본문 → null', () => {
    expect(detectType(undefined, '## 제목\n\n일반 내용입니다.', '/docs/notes.md')).toBeNull();
  });

  it('mermaid 블록 없이 관계 없는 경로 → null', () => {
    expect(detectType(undefined, '', '/project/src/utils.ts')).toBeNull();
  });

  it('frontmatter type이 빈 문자열이면 자동 감지로 폴백', () => {
    const content = mermaid('erDiagram\n  A { int id }');
    expect(detectType('', content, '')).toBe('erd');
  });
});
