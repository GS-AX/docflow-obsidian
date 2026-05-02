import { ItemView, TFile, WorkspaceLeaf, setIcon } from 'obsidian';
import { ArtifactType, ArtifactStatus, ARTIFACT_TYPES } from '../types';
import { getFrontmatter } from '../utils/frontmatter';

// ── 상수 ───────────────────────────────────────────────────────────────────────

export const METADATA_PANEL_VIEW_TYPE = 'docflow-metadata-panel';

// ── 표시 메타 ──────────────────────────────────────────────────────────────────

const TYPE_META: Record<ArtifactType, { label: string; icon: string }> = {
  erd:          { label: 'ERD',   icon: 'table-2' },
  api:          { label: 'API',   icon: 'zap' },
  architecture: { label: '아키텍처', icon: 'share-2' },
  wbs:          { label: 'WBS',   icon: 'calendar-range' },
  requirements: { label: '요구사항', icon: 'list-checks' },
  manual:       { label: '매뉴얼', icon: 'book-open' },
  meeting:      { label: '회의록', icon: 'users' },
};

const STATUS_META: Record<ArtifactStatus, { label: string; mod: string }> = {
  draft:      { label: '초안',   mod: 'draft' },
  review:     { label: '검토중', mod: 'review' },
  approved:   { label: '승인',   mod: 'approved' },
  deprecated: { label: '구버전', mod: 'deprecated' },
};

// ── 위키링크 파싱 ──────────────────────────────────────────────────────────────

/** "[[파일명|표시명]]" 또는 "[[파일명]]" → { path, display } */
function parseWikiLink(raw: string): { path: string; display: string } | null {
  const m = raw.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
  if (!m) return null;
  return { path: m[1].trim(), display: (m[2] ?? m[1]).trim() };
}

// ── MetadataPanelView ──────────────────────────────────────────────────────────

export class MetadataPanelView extends ItemView {
  private currentFile: TFile | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string  { return METADATA_PANEL_VIEW_TYPE; }
  getDisplayText(): string { return 'DocFlow 메타데이터'; }
  getIcon(): string { return 'info'; }

  // ── 생명주기 ──────────────────────────────────────────────────────────────────

  async onOpen(): Promise<void> {
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => this.handleFileChange()),
    );
    this.registerEvent(
      this.app.metadataCache.on('changed', (file) => {
        if (file === this.currentFile) this.render();
      }),
    );
    this.handleFileChange();
  }

  async onClose(): Promise<void> { /* registerEvent 로 등록한 이벤트는 Obsidian 이 자동 해제 */ }

  // ── 파일 변경 감지 ─────────────────────────────────────────────────────────────

  private handleFileChange(): void {
    const file = this.app.workspace.getActiveFile();
    if (file === this.currentFile) return;
    this.currentFile = file;
    this.render();
  }

  // ── 렌더링 ─────────────────────────────────────────────────────────────────────

  private render(): void {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass('docflow-metadata-panel');

    if (!this.currentFile) {
      this.renderEmpty(root, '파일을 열면\n메타데이터가 표시됩니다.');
      return;
    }

    const fm = getFrontmatter(this.currentFile, this.app);
    if (!fm.type || !ARTIFACT_TYPES.includes(fm.type as ArtifactType)) {
      this.renderEmpty(root, 'DocFlow 산출물이 아닙니다.\nfrontmatter에 type 을 추가하세요.');
      return;
    }

    const type = fm.type as ArtifactType;
    this.renderHeader(root, fm.title, type);
    this.renderStatus(root, fm.status);
    this.renderInfoRows(root, fm.version, fm.author, this.currentFile.stat.mtime);
    if (fm.tags.length > 0)    this.renderTags(root, fm.tags);
    if (fm.related.length > 0) this.renderRelated(root, fm.related);
  }

  // ── 섹션: 헤더 ────────────────────────────────────────────────────────────────

  private renderHeader(root: HTMLElement, title: string, type: ArtifactType): void {
    const header = root.createEl('div', { cls: 'docflow-mp-header' });

    const iconEl = header.createEl('span', { cls: 'docflow-mp-type-icon' });
    setIcon(iconEl, TYPE_META[type].icon);

    const textWrap = header.createEl('div', { cls: 'docflow-mp-header-text' });
    textWrap.createEl('p', { cls: 'docflow-mp-title', text: title });
    textWrap.createEl('span', {
      cls: `docflow-mp-type-badge docflow-type--${type}`,
      text: TYPE_META[type].label,
    });
  }

  // ── 섹션: 상태 뱃지 ──────────────────────────────────────────────────────────

  private renderStatus(root: HTMLElement, status: ArtifactStatus): void {
    const section = root.createEl('div', { cls: 'docflow-mp-section docflow-mp-status-section' });
    const meta = STATUS_META[status] ?? { label: status, mod: 'draft' };
    section.createEl('span', {
      cls: `docflow-mp-status-badge docflow-mp-status--${meta.mod}`,
      text: meta.label,
    });
  }

  // ── 섹션: 정보 행 (버전 / 작성자 / 수정일) ──────────────────────────────────

  private renderInfoRows(
    root: HTMLElement,
    version: string,
    author: string,
    mtime: number,
  ): void {
    const section = root.createEl('div', { cls: 'docflow-mp-section' });
    const table = section.createEl('table', { cls: 'docflow-mp-info-table' });

    const addRow = (label: string, icon: string, value: string) => {
      const tr = table.createEl('tr');
      const tdIcon = tr.createEl('td', { cls: 'docflow-mp-info-icon' });
      setIcon(tdIcon, icon);
      tr.createEl('td', { cls: 'docflow-mp-info-label', text: label });
      tr.createEl('td', { cls: 'docflow-mp-info-value', text: value });
    };

    addRow('버전', 'tag', version);
    if (author) addRow('작성자', 'user', author);
    addRow(
      '수정일',
      'clock',
      new Date(mtime).toLocaleDateString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      }),
    );
  }

  // ── 섹션: 태그 ────────────────────────────────────────────────────────────────

  private renderTags(root: HTMLElement, tags: string[]): void {
    const section = root.createEl('div', { cls: 'docflow-mp-section' });
    this.renderSectionTitle(section, 'tag', '태그');
    const tagList = section.createEl('div', { cls: 'docflow-mp-tag-list' });
    for (const tag of tags) {
      tagList.createEl('span', { cls: 'docflow-mp-tag', text: tag.startsWith('#') ? tag : `#${tag}` });
    }
  }

  // ── 섹션: 연관 문서 ──────────────────────────────────────────────────────────

  private renderRelated(root: HTMLElement, related: string[]): void {
    const section = root.createEl('div', { cls: 'docflow-mp-section' });
    this.renderSectionTitle(section, 'link', '연관 문서');

    for (const raw of related) {
      const parsed = parseWikiLink(raw);
      const displayText = parsed?.display ?? raw;
      const filePath    = parsed?.path    ?? raw;

      const link = section.createEl('div', {
        cls: 'docflow-mp-related-link',
        attr: { role: 'button', tabindex: '0', 'aria-label': `${displayText} 열기` },
      });

      const linkIcon = link.createEl('span', { cls: 'docflow-mp-related-icon' });
      setIcon(linkIcon, 'file-text');
      link.createEl('span', { cls: 'docflow-mp-related-text', text: displayText });

      const openRelated = () => {
        const target = this.app.metadataCache.getFirstLinkpathDest(filePath, '');
        if (target) {
          void this.app.workspace.getLeaf(false).openFile(target);
        }
      };
      link.addEventListener('click', openRelated);
      link.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRelated(); }
      });
    }
  }

  // ── 공통 헬퍼 ────────────────────────────────────────────────────────────────

  private renderSectionTitle(parent: HTMLElement, icon: string, text: string): void {
    const title = parent.createEl('div', { cls: 'docflow-mp-section-title' });
    const iconEl = title.createEl('span', { cls: 'docflow-mp-section-icon' });
    setIcon(iconEl, icon);
    title.createEl('span', { text });
  }

  private renderEmpty(root: HTMLElement, message: string): void {
    const empty = root.createEl('div', { cls: 'docflow-mp-empty' });
    const iconEl = empty.createEl('div', { cls: 'docflow-mp-empty-icon' });
    setIcon(iconEl, 'info');
    for (const line of message.split('\n')) {
      empty.createEl('p', { text: line });
    }
  }
}
