import { parseFrontmatter } from './frontmatter';
import { DocFlowFrontmatter } from '../types';

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

const DEFAULTS: DocFlowFrontmatter = {
  title: 'my-file',
  type: undefined,
  project: '',
  version: '1.0.0',
  status: 'draft',
  author: '',
  tags: [],
  related: [],
};

// ── frontmatter 없는 경우 ─────────────────────────────────────────────────────

describe('frontmatter가 없는 경우', () => {
  it('모든 필드를 기본값으로 반환하고 title은 fileName을 사용한다', () => {
    expect(parseFrontmatter(undefined, 'my-file')).toEqual(DEFAULTS);
  });

  it('빈 객체도 기본값을 반환한다', () => {
    expect(parseFrontmatter({}, 'my-file')).toEqual(DEFAULTS);
  });
});

// ── title ─────────────────────────────────────────────────────────────────────

describe('title', () => {
  it('frontmatter title 사용', () => {
    const result = parseFrontmatter({ title: '회원 관리 ERD' }, 'my-file');
    expect(result.title).toBe('회원 관리 ERD');
  });

  it('앞뒤 공백 제거', () => {
    expect(parseFrontmatter({ title: '  ERD  ' }, 'my-file').title).toBe('ERD');
  });

  it('빈 문자열이면 fileName으로 폴백', () => {
    expect(parseFrontmatter({ title: '' }, 'my-file').title).toBe('my-file');
  });

  it('공백만 있으면 fileName으로 폴백', () => {
    expect(parseFrontmatter({ title: '   ' }, 'my-file').title).toBe('my-file');
  });

  it('title 필드 없으면 fileName으로 폴백', () => {
    expect(parseFrontmatter({ type: 'erd' }, 'my-file').title).toBe('my-file');
  });
});

// ── type ──────────────────────────────────────────────────────────────────────

describe('type', () => {
  it('소문자 정규화', () => {
    expect(parseFrontmatter({ type: 'ERD' }, 'f').type).toBe('erd');
    expect(parseFrontmatter({ type: 'API' }, 'f').type).toBe('api');
  });

  it('유효한 type 그대로 반환 (검증은 typeDetector 담당)', () => {
    expect(parseFrontmatter({ type: 'erd' }, 'f').type).toBe('erd');
    expect(parseFrontmatter({ type: 'unknown-type' }, 'f').type).toBe('unknown-type');
  });

  it('빈 문자열이면 undefined', () => {
    expect(parseFrontmatter({ type: '' }, 'f').type).toBeUndefined();
  });

  it('필드 없으면 undefined', () => {
    expect(parseFrontmatter({}, 'f').type).toBeUndefined();
  });
});

// ── status ────────────────────────────────────────────────────────────────────

describe('status', () => {
  it.each(['draft', 'review', 'approved', 'deprecated'] as const)(
    '유효한 status "%s" 그대로 반환',
    (s) => {
      expect(parseFrontmatter({ status: s }, 'f').status).toBe(s);
    },
  );

  it('알 수 없는 status → "draft"', () => {
    expect(parseFrontmatter({ status: 'wip' }, 'f').status).toBe('draft');
  });

  it('필드 없으면 "draft"', () => {
    expect(parseFrontmatter({}, 'f').status).toBe('draft');
  });
});

// ── version ───────────────────────────────────────────────────────────────────

describe('version', () => {
  it('일반 semver 문자열 반환', () => {
    expect(parseFrontmatter({ version: '2.3.1' }, 'f').version).toBe('2.3.1');
  });

  it('YAML이 숫자로 파싱한 경우 문자열로 변환 (예: 1.0 → "1.0")', () => {
    expect(parseFrontmatter({ version: 1.0 }, 'f').version).toBe('1');
    expect(parseFrontmatter({ version: 2.5 }, 'f').version).toBe('2.5');
  });

  it('필드 없으면 "1.0.0"', () => {
    expect(parseFrontmatter({}, 'f').version).toBe('1.0.0');
  });

  it('빈 문자열이면 "1.0.0"', () => {
    expect(parseFrontmatter({ version: '' }, 'f').version).toBe('1.0.0');
  });
});

// ── author / project ──────────────────────────────────────────────────────────

describe('author / project', () => {
  it('author 파싱', () => {
    expect(parseFrontmatter({ author: '홍길동' }, 'f').author).toBe('홍길동');
  });

  it('author 앞뒤 공백 제거', () => {
    expect(parseFrontmatter({ author: '  홍길동  ' }, 'f').author).toBe('홍길동');
  });

  it('author 없으면 빈 문자열', () => {
    expect(parseFrontmatter({}, 'f').author).toBe('');
  });

  it('project 파싱', () => {
    expect(parseFrontmatter({ project: 'user-management' }, 'f').project).toBe('user-management');
  });

  it('project 없으면 빈 문자열', () => {
    expect(parseFrontmatter({}, 'f').project).toBe('');
  });
});

// ── tags ──────────────────────────────────────────────────────────────────────

describe('tags', () => {
  it('배열 그대로 반환', () => {
    expect(parseFrontmatter({ tags: ['database', 'user', 'auth'] }, 'f').tags).toEqual([
      'database',
      'user',
      'auth',
    ]);
  });

  it('단일 문자열 → 배열로 정규화', () => {
    expect(parseFrontmatter({ tags: 'database' }, 'f').tags).toEqual(['database']);
  });

  it('배열 항목 앞뒤 공백 제거', () => {
    expect(parseFrontmatter({ tags: ['  api  ', ' auth'] }, 'f').tags).toEqual(['api', 'auth']);
  });

  it('빈 항목 제거', () => {
    expect(parseFrontmatter({ tags: ['api', '', '  '] }, 'f').tags).toEqual(['api']);
  });

  it('없으면 빈 배열', () => {
    expect(parseFrontmatter({}, 'f').tags).toEqual([]);
  });
});

// ── related ───────────────────────────────────────────────────────────────────

describe('related (wiki 링크)', () => {
  it('배열 그대로 반환', () => {
    expect(
      parseFrontmatter({ related: ['[[auth-api]]', '[[user-erd]]'] }, 'f').related,
    ).toEqual(['[[auth-api]]', '[[user-erd]]']);
  });

  it('단일 문자열 → 배열로 정규화', () => {
    expect(parseFrontmatter({ related: '[[auth-api]]' }, 'f').related).toEqual(['[[auth-api]]']);
  });

  it('없으면 빈 배열', () => {
    expect(parseFrontmatter({}, 'f').related).toEqual([]);
  });
});

// ── 전체 필드 통합 ────────────────────────────────────────────────────────────

describe('전체 필드 통합 파싱', () => {
  it('PRD 예시 ERD frontmatter를 올바르게 파싱한다', () => {
    const raw = {
      title: '회원 관리 시스템 ERD',
      type: 'erd',
      project: 'user-management',
      version: '1.2.0',
      status: 'approved',
      author: '홍길동',
      tags: ['database', 'user', 'auth'],
      related: ['[[auth-api]]', '[[user-requirements]]'],
    };

    expect(parseFrontmatter(raw, 'user-erd')).toEqual<DocFlowFrontmatter>({
      title: '회원 관리 시스템 ERD',
      type: 'erd',
      project: 'user-management',
      version: '1.2.0',
      status: 'approved',
      author: '홍길동',
      tags: ['database', 'user', 'auth'],
      related: ['[[auth-api]]', '[[user-requirements]]'],
    });
  });
});
