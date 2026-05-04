import { MarkdownView, Notice, Plugin, WorkspaceLeaf } from 'obsidian';
import { DocFlowSettings, DEFAULT_SETTINGS } from './types';
import { registerRenderers, unloadRenderers } from './renderers';
import {
  ARTIFACT_EXPLORER_VIEW_TYPE,
  ArtifactExplorerView,
} from './views/ArtifactExplorerView';
import {
  METADATA_PANEL_VIEW_TYPE,
  MetadataPanelView,
} from './views/MetadataPanelView';
import { openTemplateInserter } from './utils/templateInserter';
import { DocFlowSettingTab } from './settings';
import { initI18n, t } from './i18n';

export default class DocFlowPlugin extends Plugin {
  settings!: DocFlowSettings;

  // ── 로드 ──────────────────────────────────────────────────────────────────────

  async onload(): Promise<void> {
    // 1. 설정 로드
    await this.loadSettings();

    // 2. i18n 초기화 — 설정의 language 값을 항상 최신 상태로 읽도록 getter 전달
    initI18n(() => this.settings.language);

    // 3. 커스텀 뷰 등록
    this.registerView(
      ARTIFACT_EXPLORER_VIEW_TYPE,
      (leaf) => new ArtifactExplorerView(leaf),
    );
    this.registerView(
      METADATA_PANEL_VIEW_TYPE,
      (leaf) => new MetadataPanelView(leaf),
    );

    // 4. 코드블록 렌더러 등록
    try {
      registerRenderers(this, () => this.settings);
    } catch (err) {
      console.error('DocFlow: renderer registration failed', err);
      new Notice(t('mainRendererFailed'));
    }

    // 5. 리본 아이콘
    this.addRibbonIcon('layers', t('ribbonTooltip'), () => {
      void this.activateView(ARTIFACT_EXPLORER_VIEW_TYPE, 'left');
    });

    // 6. 커맨드 팔레트 — 이름은 로드 시점의 언어 설정을 반영한다.
    //    언어를 변경한 후 커맨드 이름을 갱신하려면 플러그인 재활성화가 필요하다.
    this.addCommand({
      id:       'insert-template',
      name:     t('cmdInsertTemplate'),
      callback: () => openTemplateInserter(this.app),
    });

    this.addCommand({
      id:       'open-explorer',
      name:     t('cmdOpenExplorer'),
      callback: () => void this.activateView(ARTIFACT_EXPLORER_VIEW_TYPE, 'left'),
    });

    this.addCommand({
      id:       'open-metadata-panel',
      name:     t('cmdOpenMetadata'),
      callback: () => void this.activateView(METADATA_PANEL_VIEW_TYPE, 'right'),
    });

    // 7. 설정 탭
    this.addSettingTab(new DocFlowSettingTab(this.app, this));

    // 8. 메타데이터 패널 자동 열기
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', (leaf) => {
        if (this.settings.metadataPanelAutoOpen) {
          this.maybeAutoOpenMetadataPanel(leaf);
        }
      }),
    );

    // 9. 레이아웃 준비 완료 후 탐색기 초기화
    this.app.workspace.onLayoutReady(() => {
      void this.initViews();
    });
  }

  // ── 언로드 ────────────────────────────────────────────────────────────────────

  onunload(): void {
    unloadRenderers();

    for (const leaf of this.app.workspace.getLeavesOfType(ARTIFACT_EXPLORER_VIEW_TYPE)) {
      leaf.detach();
    }
    for (const leaf of this.app.workspace.getLeavesOfType(METADATA_PANEL_VIEW_TYPE)) {
      leaf.detach();
    }
  }

  // ── 설정 ─────────────────────────────────────────────────────────────────────

  async loadSettings(): Promise<void> {
    try {
      const saved = await this.loadData();
      this.settings = Object.assign({}, DEFAULT_SETTINGS, saved) as DocFlowSettings;
    } catch (err) {
      console.error('DocFlow: failed to load settings', err);
      new Notice(t('mainSettingsLoadFailed'));
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  async saveSettings(): Promise<void> {
    try {
      await this.saveData(this.settings);
    } catch (err) {
      console.error('DocFlow: failed to save settings', err);
      new Notice(t('mainSettingsSaveFailed'));
    }
  }

  // ── 뷰 갱신 ──────────────────────────────────────────────────────────────────

  /** 언어 변경 시 열려 있는 모든 DocFlow 뷰를 다시 그린다. */
  refreshAllViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(ARTIFACT_EXPLORER_VIEW_TYPE)) {
      (leaf.view as ArtifactExplorerView).forceRefresh();
    }
    for (const leaf of this.app.workspace.getLeavesOfType(METADATA_PANEL_VIEW_TYPE)) {
      (leaf.view as MetadataPanelView).forceRefresh();
    }
  }

  // ── 뷰 활성화 ────────────────────────────────────────────────────────────────

  private async activateView(viewType: string, side: 'left' | 'right'): Promise<void> {
    try {
      const existing = this.app.workspace.getLeavesOfType(viewType);
      if (existing.length > 0) {
        void this.app.workspace.revealLeaf(existing[0]);
        return;
      }
      const leaf = side === 'left'
        ? this.app.workspace.getLeftLeaf(false)
        : this.app.workspace.getRightLeaf(false);
      if (!leaf) return;
      await leaf.setViewState({ type: viewType, active: true });
      void this.app.workspace.revealLeaf(leaf);
    } catch (err) {
      console.error(`DocFlow: failed to activate view (${viewType})`, err);
    }
  }

  private async initViews(): Promise<void> {
    try {
      if (this.app.workspace.getLeavesOfType(ARTIFACT_EXPLORER_VIEW_TYPE).length === 0) {
        await this.activateView(ARTIFACT_EXPLORER_VIEW_TYPE, 'left');
      }
    } catch (err) {
      console.error('DocFlow: failed to restore initial view', err);
    }
  }

  // ── 메타데이터 패널 자동 열기 ─────────────────────────────────────────────────

  private maybeAutoOpenMetadataPanel(leaf: WorkspaceLeaf | null): void {
    try {
      if (!leaf) return;

      const view = leaf.view;
      if (!(view instanceof MarkdownView) || view.getMode() !== 'preview') return;

      const file = this.app.workspace.getActiveFile();
      if (!file) return;

      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter?.type) return;

      if (this.app.workspace.getLeavesOfType(METADATA_PANEL_VIEW_TYPE).length > 0) return;

      void this.activateView(METADATA_PANEL_VIEW_TYPE, 'right');
    } catch (err) {
      console.error('DocFlow: failed to auto-open metadata panel', err);
    }
  }
}
