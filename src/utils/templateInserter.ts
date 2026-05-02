import { App, MarkdownView, Modal, Notice, Setting, setIcon } from 'obsidian';
import { ArtifactType, ARTIFACT_TYPES } from '../types';
import { t, tf, getCurrentLang } from '../i18n';

// ── 영문 템플릿 임포트 ────────────────────────────────────────────────────────

import erdTemplateEn          from '../../template/en/erd-template.md';
import apiTemplateEn          from '../../template/en/api-template.md';
import architectureTemplateEn from '../../template/en/architecture-template.md';
import wbsTemplateEn          from '../../template/en/wbs-template.md';
import requirementsTemplateEn from '../../template/en/requirements-template.md';
import meetingTemplateEn      from '../../template/en/meeting-template.md';
import manualTemplateEn       from '../../template/en/manual-template.md';

// ── 한국어 템플릿 임포트 ──────────────────────────────────────────────────────

import erdTemplateKo          from '../../template/ko/erd-template.md';
import apiTemplateKo          from '../../template/ko/api-template.md';
import architectureTemplateKo from '../../template/ko/architecture-template.md';
import wbsTemplateKo          from '../../template/ko/wbs-template.md';
import requirementsTemplateKo from '../../template/ko/requirements-template.md';
import meetingTemplateKo      from '../../template/ko/meeting-template.md';
import manualTemplateKo       from '../../template/ko/manual-template.md';

// ── 템플릿 맵 ─────────────────────────────────────────────────────────────────

const TEMPLATE_MAP: Record<'en' | 'ko', Record<ArtifactType, string>> = {
  en: {
    erd:          erdTemplateEn,
    api:          apiTemplateEn,
    architecture: architectureTemplateEn,
    wbs:          wbsTemplateEn,
    requirements: requirementsTemplateEn,
    meeting:      meetingTemplateEn,
    manual:       manualTemplateEn,
  },
  ko: {
    erd:          erdTemplateKo,
    api:          apiTemplateKo,
    architecture: architectureTemplateKo,
    wbs:          wbsTemplateKo,
    requirements: requirementsTemplateKo,
    meeting:      meetingTemplateKo,
    manual:       manualTemplateKo,
  },
};

const TYPE_ICON: Record<ArtifactType, string> = {
  erd:          'table-2',
  api:          'zap',
  architecture: 'share-2',
  wbs:          'calendar-range',
  requirements: 'list-checks',
  manual:       'book-open',
  meeting:      'users',
};

const TYPE_LABEL_KEY: Record<ArtifactType, Parameters<typeof t>[0]> = {
  erd:          'typeERD',
  api:          'typeAPI',
  architecture: 'typeArchitecture',
  wbs:          'typeWBS',
  requirements: 'typeRequirements',
  manual:       'typeManual',
  meeting:      'typeMeeting',
};

// ── 유틸리티 함수 ─────────────────────────────────────────────────────────────

export function extractPlaceholders(content: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const re = /\{\{([^}]+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const name = m[1].trim();
    if (!seen.has(name)) { seen.add(name); result.push(name); }
  }
  return result;
}

export function applyPlaceholders(content: string, values: Map<string, string>): string {
  return content.replace(/\{\{([^}]+)\}\}/g, (_match, name: string) => {
    const val = values.get(name.trim());
    return val ? val : `{{${name}}}`;
  });
}

function extractFrontmatterPlaceholders(content: string): string[] {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return extractPlaceholders(fmMatch ? fmMatch[1] : content);
}

// ── 에디터 삽입 ───────────────────────────────────────────────────────────────

function insertIntoActiveEditor(app: App, content: string): void {
  const editor = app.workspace.getActiveViewOfType(MarkdownView)?.editor;
  if (!editor) {
    new Notice(t('insertNoEditor'));
    return;
  }
  if (editor.getValue().trim() === '') {
    editor.setValue(content);
    editor.setCursor({ line: 0, ch: 0 });
  } else {
    editor.replaceSelection(content);
  }
  new Notice(t('insertSuccess'));
}

// ── 유형 선택 모달 ────────────────────────────────────────────────────────────

class TypeSelectModal extends Modal {
  private readonly onChoose: (type: ArtifactType) => void;

  constructor(app: App, onChoose: (type: ArtifactType) => void) {
    super(app);
    this.onChoose = onChoose;
  }

  onOpen(): void {
    this.titleEl.setText(t('insertModalTitle'));
    const { contentEl } = this;

    contentEl.createEl('p', { cls: 'docflow-modal-desc', text: t('insertModalDesc') });

    const grid = contentEl.createEl('div', { cls: 'docflow-type-grid' });

    for (const type of ARTIFACT_TYPES) {
      const btn = grid.createEl('button', { cls: 'docflow-type-btn' });
      const iconEl = btn.createEl('span', { cls: 'docflow-type-btn-icon' });
      setIcon(iconEl, TYPE_ICON[type]);
      btn.createEl('span', { cls: 'docflow-type-btn-label', text: t(TYPE_LABEL_KEY[type]) });

      btn.addEventListener('click', () => { this.close(); this.onChoose(type); });
    }
  }

  onClose(): void { this.contentEl.empty(); }
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

    const today = new Date().toISOString().slice(0, 10);
    this.values = new Map(
      placeholders.map(p => [p, (p === t('insertDateField') || p === 'YYYY-MM-DD') ? today : '']),
    );
  }

  onOpen(): void {
    this.titleEl.setText(tf('insertFormTitle', t(TYPE_LABEL_KEY[this.type])));
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

    btnRow.createEl('button', { text: t('insertCancel') })
      .addEventListener('click', () => this.close());

    btnRow.createEl('button', { cls: 'mod-cta', text: t('insertConfirm') })
      .addEventListener('click', () => this.submit());

    contentEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.submit(); }
    });

    window.setTimeout(() => firstInput?.focus(), 50);
  }

  onClose(): void { this.contentEl.empty(); }

  private submit(): void { this.close(); this.onInsert(this.values); }
}

// ── 진입점 ────────────────────────────────────────────────────────────────────

export function openTemplateInserter(app: App): void {
  new TypeSelectModal(app, (type: ArtifactType) => {
    const lang     = getCurrentLang();
    const template = TEMPLATE_MAP[lang][type];
    const placeholders = extractFrontmatterPlaceholders(template);
    new PlaceholderFormModal(app, type, template, placeholders, (values) => {
      insertIntoActiveEditor(app, applyPlaceholders(template, values));
    }).open();
  }).open();
}
