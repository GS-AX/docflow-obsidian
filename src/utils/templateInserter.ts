import { App, MarkdownView, Modal, Notice, Setting, setIcon } from 'obsidian';
import { ArtifactType, ARTIFACT_TYPES } from '../types';

// ── 템플릿 임포트 (esbuild loader: { '.md': 'text' }) ─────────────────────────

import erdTemplate          from '../../template/erd-template.md';
import apiTemplate          from '../../template/api-template.md';
import architectureTemplate from '../../template/architecture-template.md';
import wbsTemplate          from '../../template/wbs-template.md';
import requirementsTemplate from '../../template/requirements-template.md';
import meetingTemplate      from '../../template/meeting-template.md';
import manualTemplate       from '../../template/manual-template.md';

// ── 유형 표시 정보 ────────────────────────────────────────────────────────────

const TYPE_META: Record<ArtifactType, { label: string; icon: string }> = {
  erd:          { label: 'ERD',    icon: 'table-2' },
  api:          { label: 'API',    icon: 'zap' },
  architecture: { label: '아키텍처', icon: 'share-2' },
  wbs:          { label: 'WBS',    icon: 'calendar-range' },
  requirements: { label: '요구사항', icon: 'list-checks' },
  manual:       { label: '매뉴얼',  icon: 'book-open' },
  meeting:      { label: '회의록',  icon: 'users' },
};

// ── 템플릿 맵 ─────────────────────────────────────────────────────────────────

const TEMPLATE_MAP: Record<ArtifactType, string> = {
  erd:          erdTemplate,
  api:          apiTemplate,
  architecture: architectureTemplate,
  wbs:          wbsTemplate,
  requirements: requirementsTemplate,
  meeting:      meetingTemplate,
  manual:       manualTemplate,
};

// ── 유틸리티 함수 ─────────────────────────────────────────────────────────────

/** 콘텐츠에서 고유한 {{플레이스홀더}} 이름을 출현 순서대로 반환한다. */
export function extractPlaceholders(content: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const re = /\{\{([^}]+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const name = m[1].trim();
    if (!seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}

/**
 * values 에 있는 항목만 치환한다.
 * 값이 빈 문자열이면 원래 {{...}} 를 그대로 유지해 사용자가 나중에 채울 수 있게 한다.
 */
export function applyPlaceholders(
  content: string,
  values: Map<string, string>,
): string {
  return content.replace(/\{\{([^}]+)\}\}/g, (_match, name: string) => {
    const val = values.get(name.trim());
    return val ? val : `{{${name}}}`;
  });
}

/** frontmatter 블록(--- ... ---) 안의 플레이스홀더만 추출한다. */
function extractFrontmatterPlaceholders(content: string): string[] {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return extractPlaceholders(fmMatch ? fmMatch[1] : content);
}

// ── 에디터 삽입 ───────────────────────────────────────────────────────────────

function insertIntoActiveEditor(app: App, content: string): void {
  const editor = app.workspace.getActiveViewOfType(MarkdownView)?.editor;
  if (!editor) {
    new Notice('편집 중인 파일이 없습니다. 파일을 먼저 열어주세요.');
    return;
  }
  if (editor.getValue().trim() === '') {
    editor.setValue(content);
    editor.setCursor({ line: 0, ch: 0 });
  } else {
    editor.replaceSelection(content);
  }
  new Notice('템플릿이 삽입되었습니다.');
}

// ── 유형 선택 모달 ────────────────────────────────────────────────────────────

class TypeSelectModal extends Modal {
  private readonly onChoose: (type: ArtifactType) => void;

  constructor(app: App, onChoose: (type: ArtifactType) => void) {
    super(app);
    this.onChoose = onChoose;
  }

  onOpen(): void {
    this.titleEl.setText('산출물 템플릿 삽입');
    const { contentEl } = this;

    contentEl.createEl('p', {
      cls: 'docflow-modal-desc',
      text: '삽입할 산출물 유형을 선택하세요.',
    });

    const grid = contentEl.createEl('div', { cls: 'docflow-type-grid' });

    for (const type of ARTIFACT_TYPES) {
      const btn = grid.createEl('button', { cls: 'docflow-type-btn' });
      const iconEl = btn.createEl('span', { cls: 'docflow-type-btn-icon' });
      setIcon(iconEl, TYPE_META[type].icon);
      btn.createEl('span', { cls: 'docflow-type-btn-label', text: TYPE_META[type].label });

      btn.addEventListener('click', () => {
        this.close();
        this.onChoose(type);
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

// ── 플레이스홀더 입력 폼 모달 ──────────────────────────────────────────────────

class PlaceholderFormModal extends Modal {
  private readonly type: ArtifactType;
  private readonly placeholders: string[];
  private readonly values: Map<string, string>;
  private readonly onInsert: (values: Map<string, string>) => void;

  constructor(
    app: App,
    type: ArtifactType,
    _template: string,
    placeholders: string[],
    onInsert: (values: Map<string, string>) => void,
  ) {
    super(app);
    this.type         = type;
    this.placeholders = placeholders;
    this.onInsert     = onInsert;

    // 날짜 필드 자동 채우기
    const today = new Date().toISOString().slice(0, 10);
    this.values = new Map(
      placeholders.map(p => [p, (p === '날짜' || p === 'YYYY-MM-DD') ? today : '']),
    );
  }

  onOpen(): void {
    this.titleEl.setText(`${TYPE_META[this.type].label} 템플릿 정보 입력`);
    const { contentEl } = this;

    let firstInput: HTMLInputElement | null = null;

    for (const name of this.placeholders) {
      new Setting(contentEl).setName(name).addText(text => {
        text
          .setValue(this.values.get(name) ?? '')
          .onChange(v => this.values.set(name, v));
        if (firstInput === null) firstInput = text.inputEl;
      });
    }

    const btnRow = contentEl.createEl('div', { cls: 'docflow-modal-btns' });

    btnRow.createEl('button', { text: '취소' })
      .addEventListener('click', () => this.close());

    btnRow.createEl('button', { cls: 'mod-cta', text: '템플릿 삽입' })
      .addEventListener('click', () => this.submit());

    // Enter 키로 제출
    contentEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.submit(); }
    });

    // 첫 번째 필드에 포커스 (setTimeout: 모달 DOM 마운트 완료 후)
    window.setTimeout(() => firstInput?.focus(), 50);
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private submit(): void {
    this.close();
    this.onInsert(this.values);
  }
}

// ── 진입점 ────────────────────────────────────────────────────────────────────

/**
 * main.ts 커맨드 콜백에서 호출한다.
 * 유형 선택 → 플레이스홀더 입력 → 에디터 삽입 순으로 진행한다.
 */
export function openTemplateInserter(app: App): void {
  new TypeSelectModal(app, (type: ArtifactType) => {
    const template     = TEMPLATE_MAP[type];
    const placeholders = extractFrontmatterPlaceholders(template);
    new PlaceholderFormModal(app, type, template, placeholders, (values) => {
      insertIntoActiveEditor(app, applyPlaceholders(template, values));
    }).open();
  }).open();
}
