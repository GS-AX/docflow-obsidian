import { ItemView, TFile, WorkspaceLeaf, setIcon } from 'obsidian';
import { ArtifactType, ArtifactStatus, ARTIFACT_TYPES } from '../types';
import { parseFrontmatter } from '../utils/frontmatter';
import { t, tf } from '../i18n';

// ── 상수 ───────────────────────────────────────────────────────────────────────

export const ARTIFACT_EXPLORER_VIEW_TYPE = 'docflow-artifact-explorer';

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

const STATUS_LABEL_KEY: Record<ArtifactStatus, Parameters<typeof t>[0]> = {
  draft:      'statusDraft',
  review:     'statusReview',
  approved:   'statusApproved',
  deprecated: 'statusDeprecated',
};

// ── 내부 타입 ──────────────────────────────────────────────────────────────────

interface ArtifactEntry {
  file: TFile;
  type: ArtifactType;
  status: ArtifactStatus;
  title: string;
  project: string;
}

// ── ArtifactExplorerView ───────────────────────────────────────────────────────

export class ArtifactExplorerView extends ItemView {
  private typeFilter: ArtifactType | 'all' = 'all';
  private statusFilter: ArtifactStatus | 'all' = 'all';
  private entries: ArtifactEntry[] = [];
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string { return ARTIFACT_EXPLORER_VIEW_TYPE; }
  getDisplayText(): string { return t('explorerTitle'); }
  getIcon(): string { return 'layers'; }

  // ── 생명주기 ──────────────────────────────────────────────────────────────────

  async onOpen(): Promise<void> {
    await this.refresh();

    this.registerEvent(this.app.metadataCache.on('changed', () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on('create',         () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on('delete',         () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on('rename',         () => this.scheduleRefresh()));
  }

  async onClose(): Promise<void> {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // ── 공개 메서드 ───────────────────────────────────────────────────────────────

  /** 언어 변경 등 외부 이벤트에 의해 강제 재렌더링할 때 사용한다. */
  forceRefresh(): void {
    void this.refresh();
  }

  // ── 데이터 ────────────────────────────────────────────────────────────────────

  private scheduleRefresh(): void {
    if (this.refreshTimer !== null) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh();
    }, 300);
  }

  private async refresh(): Promise<void> {
    this.entries = this.scanVault();
    this.render();
  }

  private scanVault(): ArtifactEntry[] {
    const result: ArtifactEntry[] = [];

    for (const file of this.app.vault.getMarkdownFiles()) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter?.type) continue;

      const fm = parseFrontmatter(
        cache.frontmatter as Record<string, unknown>,
        file.basename,
      );
      if (!fm.type || !ARTIFACT_TYPES.includes(fm.type as ArtifactType)) continue;

      result.push({
        file,
        type:    fm.type as ArtifactType,
        status:  fm.status,
        title:   fm.title,
        project: fm.project,
      });
    }

    return result.sort((a, b) => {
      const pa = a.project || '￿';
      const pb = b.project || '￿';
      if (pa !== pb) return pa.localeCompare(pb);
      return a.title.localeCompare(b.title);
    });
  }

  private getFiltered(): ArtifactEntry[] {
    return this.entries.filter(e => {
      if (this.typeFilter   !== 'all' && e.type   !== this.typeFilter)   return false;
      if (this.statusFilter !== 'all' && e.status !== this.statusFilter) return false;
      return true;
    });
  }

  // ── 렌더링 ─────────────────────────────────────────────────────────────────────

  private render(): void {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass('docflow-explorer');

    const filtered = this.getFiltered();
    this.renderFilterBar(root, filtered.length);
    this.renderList(root, filtered);
  }

  // ── 필터 바 ────────────────────────────────────────────────────────────────────

  private renderFilterBar(root: HTMLElement, totalCount: number): void {
    const bar = root.createEl('div', { cls: 'docflow-explorer-filters' });

    // 유형 필터
    const typeRow = bar.createEl('div', { cls: 'docflow-explorer-filter-row' });
    typeRow.createEl('span', { cls: 'docflow-explorer-filter-label', text: t('filterType') });
    const typeGroup = typeRow.createEl('div', { cls: 'docflow-explorer-filter-group' });

    const mkTypeBtn = (value: ArtifactType | 'all', label: string) => {
      const btn = typeGroup.createEl('button', {
        cls: 'docflow-explorer-filter-btn' + (this.typeFilter === value ? ' is-active' : ''),
        text: label,
        attr: { 'aria-pressed': String(this.typeFilter === value) },
      });
      btn.addEventListener('click', () => { this.typeFilter = value; this.render(); });
    };

    mkTypeBtn('all', t('filterAll'));
    for (const type of ARTIFACT_TYPES) mkTypeBtn(type, t(TYPE_LABEL_KEY[type]));

    // 상태 필터
    const statusRow = bar.createEl('div', { cls: 'docflow-explorer-filter-row' });
    statusRow.createEl('span', { cls: 'docflow-explorer-filter-label', text: t('filterStatus') });
    const statusGroup = statusRow.createEl('div', { cls: 'docflow-explorer-filter-group' });

    const mkStatusBtn = (value: ArtifactStatus | 'all', label: string) => {
      const btn = statusGroup.createEl('button', {
        cls: 'docflow-explorer-filter-btn' + (this.statusFilter === value ? ' is-active' : ''),
        text: label,
        attr: { 'aria-pressed': String(this.statusFilter === value) },
      });
      btn.addEventListener('click', () => { this.statusFilter = value; this.render(); });
    };

    mkStatusBtn('all',         t('filterAll'));
    mkStatusBtn('approved',    t('statusApproved'));
    mkStatusBtn('review',      t('statusReview'));
    mkStatusBtn('draft',       t('statusDraft'));
    mkStatusBtn('deprecated',  t('statusDeprecated'));

    // 개수 + 새로고침
    const meta = bar.createEl('div', { cls: 'docflow-explorer-meta' });
    meta.createEl('span', { cls: 'docflow-explorer-count', text: tf('countItems', String(totalCount)) });

    const refreshBtn = meta.createEl('button', {
      cls: 'docflow-explorer-refresh-btn',
      attr: { 'aria-label': t('refreshLabel') },
    });
    setIcon(refreshBtn, 'refresh-cw');
    refreshBtn.addEventListener('click', () => void this.refresh());
  }

  // ── 파일 목록 ──────────────────────────────────────────────────────────────────

  private renderList(root: HTMLElement, filtered: ArtifactEntry[]): void {
    const listEl = root.createEl('div', { cls: 'docflow-explorer-list' });

    if (filtered.length === 0) {
      this.renderEmpty(listEl);
      return;
    }

    const groups = new Map<string, ArtifactEntry[]>();
    for (const entry of filtered) {
      const key = entry.project || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(entry);
    }

    for (const [project, groupEntries] of groups) {
      this.renderGroup(listEl, project, groupEntries);
    }
  }

  private renderEmpty(listEl: HTMLElement): void {
    const empty = listEl.createEl('div', { cls: 'docflow-explorer-empty' });
    const iconWrap = empty.createEl('div', { cls: 'docflow-explorer-empty-icon' });
    setIcon(iconWrap, 'inbox');
    empty.createEl('p', { text: t('noArtifacts') });
    if (this.typeFilter !== 'all' || this.statusFilter !== 'all') {
      empty.createEl('p', { cls: 'docflow-explorer-empty-hint', text: t('adjustFilters') });
    }
  }

  // ── 그룹 ───────────────────────────────────────────────────────────────────────

  private renderGroup(listEl: HTMLElement, project: string, entries: ArtifactEntry[]): void {
    const group = listEl.createEl('div', { cls: 'docflow-explorer-group' });

    const header = group.createEl('div', {
      cls: 'docflow-explorer-group-header',
      attr: { role: 'button', tabindex: '0', 'aria-expanded': 'true' },
    });

    const chevron = header.createEl('span', { cls: 'docflow-explorer-group-chevron' });
    setIcon(chevron, 'chevron-down');

    const folderIcon = header.createEl('span', { cls: 'docflow-explorer-group-folder' });
    setIcon(folderIcon, 'folder');

    header.createEl('span', { cls: 'docflow-explorer-group-name', text: project || t('noProject') });
    header.createEl('span', { cls: 'docflow-explorer-group-count', text: String(entries.length) });

    const body = group.createEl('div', { cls: 'docflow-explorer-group-body' });

    let collapsed = false;
    const toggle = () => {
      collapsed = !collapsed;
      body.style.display = collapsed ? 'none' : '';
      header.setAttribute('aria-expanded', String(!collapsed));
      header.classList.toggle('is-collapsed', collapsed);
      setIcon(chevron, collapsed ? 'chevron-right' : 'chevron-down');
    };

    header.addEventListener('click', toggle);
    header.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });

    for (const entry of entries) this.renderEntry(body, entry);
  }

  // ── 항목 ──────────────────────────────────────────────────────────────────────

  private renderEntry(parent: HTMLElement, entry: ArtifactEntry): void {
    const item = parent.createEl('div', {
      cls: 'docflow-explorer-item',
      attr: { role: 'button', tabindex: '0', 'aria-label': tf('openItem', entry.title) },
    });

    const iconEl = item.createEl('span', { cls: 'docflow-explorer-item-icon' });
    setIcon(iconEl, TYPE_ICON[entry.type] ?? 'file-text');

    const textEl = item.createEl('div', { cls: 'docflow-explorer-item-text' });
    textEl.createEl('span', { cls: 'docflow-explorer-item-title', text: entry.title });

    const badges = textEl.createEl('div', { cls: 'docflow-explorer-item-badges' });
    badges.createEl('span', {
      cls: `docflow-explorer-type-badge docflow-type--${entry.type}`,
      text: t(TYPE_LABEL_KEY[entry.type]),
    });
    badges.createEl('span', {
      cls: `docflow-explorer-status-badge docflow-status--${entry.status}`,
      text: t(STATUS_LABEL_KEY[entry.status]),
    });

    const openFile = () => void this.app.workspace.getLeaf(false).openFile(entry.file);
    item.addEventListener('click', openFile);
    item.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFile(); }
    });
  }
}
