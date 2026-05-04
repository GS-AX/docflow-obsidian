import { ItemView, TFile, WorkspaceLeaf, setIcon } from 'obsidian';
import { ArtifactType, ArtifactStatus, ARTIFACT_TYPES } from '../types';
import { getFrontmatter } from '../utils/frontmatter';
import { t, tf } from '../i18n';

// ── 상수 ───────────────────────────────────────────────────────────────────────

export const METADATA_PANEL_VIEW_TYPE = 'docflow-metadata-panel';

// ── 유형별 아이콘 ──────────────────────────────────────────────────────────────

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

const STATUS_BADGE_KEY: Record<ArtifactStatus, Parameters<typeof t>[0]> = {
  draft:      'statusDraft',
  review:     'statusReview',
  approved:   'statusApproved',
  deprecated: 'statusDeprecated',
};

// ── 위키링크 파싱 ──────────────────────────────────────────────────────────────

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
  getDisplayText(): string { return t('metadataTitle'); }
  getIcon(): string { return 'info'; }

  // ── 생명주기 ──────────────────────────────────────────────────────────────────

  onOpen(): Promise<void> {
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => this.handleFileChange()),
    );
    this.registerEvent(
      this.app.metadataCache.on('changed', (file) => {
        if (file === this.currentFile) this.render();
      }),
    );
    this.handleFileChange();
    return Promise.resolve();
  }

  onClose(): Promise<void> { return Promise.resolve(); }

  // ── 공개 메서드 ───────────────────────────────────────────────────────────────

  /** 언어 변경 등 외부 이벤트에 의해 강제 재렌더링할 때 사용한다. */
  forceRefresh(): void {
    this.render();
  }

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
      this.renderEmpty(root, t('metaEmptyFile'));
      return;
    }

    const fm = getFrontmatter(this.currentFile, this.app);
    if (!fm.type || !ARTIFACT_TYPES.includes(fm.type as ArtifactType)) {
      this.renderEmpty(root, t('metaNotArtifact'));
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
    setIcon(iconEl, TYPE_ICON[type]);

    const textWrap = header.createEl('div', { cls: 'docflow-mp-header-text' });
    textWrap.createEl('p', { cls: 'docflow-mp-title', text: title });
    textWrap.createEl('span', {
      cls: `docflow-mp-type-badge docflow-type--${type}`,
      text: t(TYPE_LABEL_KEY[type]),
    });
  }

  // ── 섹션: 상태 뱃지 ──────────────────────────────────────────────────────────

  private renderStatus(root: HTMLElement, status: ArtifactStatus): void {
    const section = root.createEl('div', { cls: 'docflow-mp-section docflow-mp-status-section' });
    section.createEl('span', {
      cls: `docflow-mp-status-badge docflow-mp-status--${status}`,
      text: t(STATUS_BADGE_KEY[status] ?? 'statusDraft'),
    });
  }

  // ── 섹션: 정보 행 (버전 / 작성자 / 수정일) ──────────────────────────────────

  private renderInfoRows(root: HTMLElement, version: string, author: string, mtime: number): void {
    const section = root.createEl('div', { cls: 'docflow-mp-section' });
    const table = section.createEl('table', { cls: 'docflow-mp-info-table' });

    const addRow = (label: string, icon: string, value: string) => {
      const tr = table.createEl('tr');
      const tdIcon = tr.createEl('td', { cls: 'docflow-mp-info-icon' });
      setIcon(tdIcon, icon);
      tr.createEl('td', { cls: 'docflow-mp-info-label', text: label });
      tr.createEl('td', { cls: 'docflow-mp-info-value', text: value });
    };

    addRow(t('metaVersion'), 'tag', version);
    if (author) addRow(t('metaAuthor'), 'user', author);
    addRow(
      t('metaModified'),
      'clock',
      new Date(mtime).toLocaleDateString(t('metaDateLocale'), {
        year: 'numeric', month: '2-digit', day: '2-digit',
      }),
    );
  }

  // ── 섹션: 태그 ────────────────────────────────────────────────────────────────

  private renderTags(root: HTMLElement, tags: string[]): void {
    const section = root.createEl('div', { cls: 'docflow-mp-section' });
    this.renderSectionTitle(section, 'tag', t('metaTags'));
    const tagList = section.createEl('div', { cls: 'docflow-mp-tag-list' });
    for (const tag of tags) {
      tagList.createEl('span', { cls: 'docflow-mp-tag', text: tag.startsWith('#') ? tag : `#${tag}` });
    }
  }

  // ── 섹션: 연관 문서 ──────────────────────────────────────────────────────────

  private renderRelated(root: HTMLElement, related: string[]): void {
    const section = root.createEl('div', { cls: 'docflow-mp-section' });
    this.renderSectionTitle(section, 'link', t('metaRelated'));

    for (const raw of related) {
      const parsed = parseWikiLink(raw);
      const displayText = parsed?.display ?? raw;
      const filePath    = parsed?.path    ?? raw;

      const link = section.createEl('div', {
        cls: 'docflow-mp-related-link',
        attr: { role: 'button', tabindex: '0', 'aria-label': tf('openLink', displayText) },
      });

      const linkIcon = link.createEl('span', { cls: 'docflow-mp-related-icon' });
      setIcon(linkIcon, 'file-text');
      link.createEl('span', { cls: 'docflow-mp-related-text', text: displayText });

      const openRelated = () => {
        const target = this.app.metadataCache.getFirstLinkpathDest(filePath, '');
        if (target) void this.app.workspace.getLeaf(false).openFile(target);
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
