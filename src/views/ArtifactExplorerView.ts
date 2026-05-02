import { ItemView, TFile, WorkspaceLeaf, setIcon } from 'obsidian';
import { ArtifactType, ArtifactStatus, ARTIFACT_TYPES } from '../types';
import { parseFrontmatter } from '../utils/frontmatter';

// ── 상수 ───────────────────────────────────────────────────────────────────────

export const ARTIFACT_EXPLORER_VIEW_TYPE = 'docflow-artifact-explorer';

// ── 유형별 표시 정보 ───────────────────────────────────────────────────────────

const TYPE_META: Record<ArtifactType, { label: string; icon: string }> = {
  erd:          { label: 'ERD',          icon: 'table-2' },
  api:          { label: 'API',          icon: 'zap' },
  architecture: { label: 'Architecture', icon: 'share-2' },
  wbs:          { label: 'WBS',          icon: 'calendar-range' },
  requirements: { label: 'Requirements', icon: 'list-checks' },
  manual:       { label: 'Manual',       icon: 'book-open' },
  meeting:      { label: 'Meeting',      icon: 'users' },
};

const STATUS_LABEL: Record<ArtifactStatus, string> = {
  draft:      'Draft',
  review:     'In Review',
  approved:   'Approved',
  deprecated: 'Deprecated',
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
  getDisplayText(): string { return 'DocFlow Explorer'; }
  getIcon(): string { return 'layers'; }

  // ── 생명주기 ──────────────────────────────────────────────────────────────────

  async onOpen(): Promise<void> {
    await this.refresh();

    // 파일/메타데이터 변경 → 자동 재스캔 (debounce 300ms)
    this.registerEvent(this.app.metadataCache.on('changed', () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on('create',         () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on('delete',         () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on('rename',         () => this.scheduleRefresh()));
  }

  async onClose(): Promise<void> {
    // registerEvent 로 등록한 이벤트는 Obsidian 이 자동 해제
    // debounce 타이머만 수동 정리
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
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

  /** Vault 전체를 순회해 frontmatter type 이 있는 파일만 수집한다. */
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

    // project 기준 오름차순, 같은 project 내에서는 title 기준
    // project 없는 항목(￿)은 맨 아래로
    return result.sort((a, b) => {
      const pa = a.project || '￿';
      const pb = b.project || '￿';
      if (pa !== pb) return pa.localeCompare(pb, 'ko');
      return a.title.localeCompare(b.title, 'ko');
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

    // ── 유형 필터 ─────────────────────────────────────────────────────────────
    const typeRow = bar.createEl('div', { cls: 'docflow-explorer-filter-row' });
    typeRow.createEl('span', { cls: 'docflow-explorer-filter-label', text: 'Type' });
    const typeGroup = typeRow.createEl('div', { cls: 'docflow-explorer-filter-group' });

    const mkTypeBtn = (value: ArtifactType | 'all', label: string) => {
      const btn = typeGroup.createEl('button', {
        cls: 'docflow-explorer-filter-btn' + (this.typeFilter === value ? ' is-active' : ''),
        text: label,
        attr: { 'aria-pressed': String(this.typeFilter === value) },
      });
      btn.addEventListener('click', () => {
        this.typeFilter = value;
        this.render();
      });
    };

    mkTypeBtn('all', 'All');
    for (const t of ARTIFACT_TYPES) mkTypeBtn(t, TYPE_META[t].label);

    // ── 상태 필터 ─────────────────────────────────────────────────────────────
    const statusRow = bar.createEl('div', { cls: 'docflow-explorer-filter-row' });
    statusRow.createEl('span', { cls: 'docflow-explorer-filter-label', text: 'Status' });
    const statusGroup = statusRow.createEl('div', { cls: 'docflow-explorer-filter-group' });

    const mkStatusBtn = (value: ArtifactStatus | 'all', label: string) => {
      const btn = statusGroup.createEl('button', {
        cls: 'docflow-explorer-filter-btn' + (this.statusFilter === value ? ' is-active' : ''),
        text: label,
        attr: { 'aria-pressed': String(this.statusFilter === value) },
      });
      btn.addEventListener('click', () => {
        this.statusFilter = value;
        this.render();
      });
    };

    mkStatusBtn('all', 'All');
    mkStatusBtn('approved',   STATUS_LABEL.approved);
    mkStatusBtn('review',     STATUS_LABEL.review);
    mkStatusBtn('draft',      STATUS_LABEL.draft);
    mkStatusBtn('deprecated', STATUS_LABEL.deprecated);

    // ── 개수 + 새로고침 ────────────────────────────────────────────────────────
    const meta = bar.createEl('div', { cls: 'docflow-explorer-meta' });
    meta.createEl('span', { cls: 'docflow-explorer-count', text: `${totalCount} items` });

    const refreshBtn = meta.createEl('button', {
      cls: 'docflow-explorer-refresh-btn',
      attr: { 'aria-label': 'Refresh' },
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

    // project 기준 그룹핑 (Map 순서 = 삽입 순서 = 이미 정렬된 entries 순서)
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
    empty.createEl('p', { text: 'No artifacts found.' });
    if (this.typeFilter !== 'all' || this.statusFilter !== 'all') {
      empty.createEl('p', {
        cls: 'docflow-explorer-empty-hint',
        text: 'Try adjusting the filters.',
      });
    }
  }

  // ── 그룹 ───────────────────────────────────────────────────────────────────────

  private renderGroup(
    listEl: HTMLElement,
    project: string,
    entries: ArtifactEntry[],
  ): void {
    const group = listEl.createEl('div', { cls: 'docflow-explorer-group' });

    // 헤더 (클릭으로 접기/펼치기)
    const header = group.createEl('div', {
      cls: 'docflow-explorer-group-header',
      attr: { role: 'button', tabindex: '0', 'aria-expanded': 'true' },
    });

    const chevron = header.createEl('span', { cls: 'docflow-explorer-group-chevron' });
    setIcon(chevron, 'chevron-down');

    const folderIcon = header.createEl('span', { cls: 'docflow-explorer-group-folder' });
    setIcon(folderIcon, 'folder');

    header.createEl('span', {
      cls: 'docflow-explorer-group-name',
      text: project || '(No Project)',
    });
    header.createEl('span', {
      cls: 'docflow-explorer-group-count',
      text: String(entries.length),
    });

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

    // 항목
    for (const entry of entries) this.renderEntry(body, entry);
  }

  // ── 항목 ──────────────────────────────────────────────────────────────────────

  private renderEntry(parent: HTMLElement, entry: ArtifactEntry): void {
    const item = parent.createEl('div', {
      cls: 'docflow-explorer-item',
      attr: { role: 'button', tabindex: '0', 'aria-label': `Open ${entry.title}` },
    });

    const iconEl = item.createEl('span', { cls: 'docflow-explorer-item-icon' });
    setIcon(iconEl, TYPE_META[entry.type]?.icon ?? 'file-text');

    const textEl = item.createEl('div', { cls: 'docflow-explorer-item-text' });
    textEl.createEl('span', { cls: 'docflow-explorer-item-title', text: entry.title });

    const badges = textEl.createEl('div', { cls: 'docflow-explorer-item-badges' });
    badges.createEl('span', {
      cls: `docflow-explorer-type-badge docflow-type--${entry.type}`,
      text: TYPE_META[entry.type]?.label ?? entry.type,
    });
    badges.createEl('span', {
      cls: `docflow-explorer-status-badge docflow-status--${entry.status}`,
      text: STATUS_LABEL[entry.status] ?? entry.status,
    });

    const openFile = () => void this.app.workspace.getLeaf(false).openFile(entry.file);
    item.addEventListener('click', openFile);
    item.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFile(); }
    });
  }
}
