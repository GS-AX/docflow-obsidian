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

export default class DocFlowPlugin extends Plugin {
  settings!: DocFlowSettings;

  // ── 로드 ──────────────────────────────────────────────────────────────────────

  async onload(): Promise<void> {
    // 1. 설정 로드 — 실패 시 기본값으로 계속 진행
    await this.loadSettings();

    // 2. 커스텀 뷰 등록
    this.registerView(
      ARTIFACT_EXPLORER_VIEW_TYPE,
      (leaf) => new ArtifactExplorerView(leaf),
    );
    this.registerView(
      METADATA_PANEL_VIEW_TYPE,
      (leaf) => new MetadataPanelView(leaf),
    );

    // 3. 코드블록 렌더러 등록 — 실패해도 나머지 기능은 사용 가능
    try {
      registerRenderers(this, () => this.settings);
    } catch (err) {
      console.error('DocFlow: 렌더러 등록 실패', err);
      new Notice(
        'DocFlow: 렌더러를 초기화하지 못했습니다. ' +
        '플러그인을 다시 활성화하거나 Obsidian을 재시작해 보세요.',
      );
    }

    // 4. 리본 아이콘
    this.addRibbonIcon('layers', 'Open DocFlow Explorer', () => {
      void this.activateView(ARTIFACT_EXPLORER_VIEW_TYPE, 'left');
    });

    // 5. 커맨드 팔레트
    this.addCommand({
      id:       'insert-template',
      name:     'Insert Artifact Template',
      callback: () => openTemplateInserter(this.app),
    });

    this.addCommand({
      id:       'open-explorer',
      name:     'Open Artifact Explorer',
      callback: () => void this.activateView(ARTIFACT_EXPLORER_VIEW_TYPE, 'left'),
    });

    this.addCommand({
      id:       'open-metadata-panel',
      name:     'Open Metadata Panel',
      callback: () => void this.activateView(METADATA_PANEL_VIEW_TYPE, 'right'),
    });

    // 6. 설정 탭
    this.addSettingTab(new DocFlowSettingTab(this.app, this));

    // 7. 메타데이터 패널 자동 열기 (Reading View 진입 감지)
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', (leaf) => {
        if (this.settings.metadataPanelAutoOpen) {
          this.maybeAutoOpenMetadataPanel(leaf);
        }
      }),
    );

    // 8. 레이아웃 준비 완료 후 탐색기 초기화
    this.app.workspace.onLayoutReady(() => {
      void this.initViews();
    });

  }

  // ── 언로드 (스토어 등록 필수 요건: 모든 리소스 정리) ────────────────────────────

  async onunload(): Promise<void> {
    // 1. 렌더러 cleanup — document.head 에 주입한 <style> 태그 제거
    unloadRenderers();

    // 2. 커스텀 뷰 리프 detach — 플러그인 비활성화 후 빈 패널이 남지 않도록
    for (const leaf of this.app.workspace.getLeavesOfType(ARTIFACT_EXPLORER_VIEW_TYPE)) {
      leaf.detach();
    }
    for (const leaf of this.app.workspace.getLeavesOfType(METADATA_PANEL_VIEW_TYPE)) {
      leaf.detach();
    }

    // registerView / registerEvent / addCommand 로 등록한 항목은 Obsidian 이 자동 해제

  }

  // ── 설정 ─────────────────────────────────────────────────────────────────────

  async loadSettings(): Promise<void> {
    try {
      const saved = await this.loadData();
      this.settings = Object.assign({}, DEFAULT_SETTINGS, saved) as DocFlowSettings;
    } catch (err) {
      console.error('DocFlow: 설정 로드 실패, 기본값 사용', err);
      new Notice('DocFlow: 설정을 불러오지 못했습니다. 기본값으로 실행합니다.');
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  async saveSettings(): Promise<void> {
    try {
      await this.saveData(this.settings);
    } catch (err) {
      console.error('DocFlow: 설정 저장 실패', err);
      new Notice('DocFlow: 설정을 저장하지 못했습니다.');
    }
  }

  // ── 뷰 활성화 ────────────────────────────────────────────────────────────────

  private async activateView(
    viewType: string,
    side: 'left' | 'right',
  ): Promise<void> {
    try {
      const existing = this.app.workspace.getLeavesOfType(viewType);
      if (existing.length > 0) {
        this.app.workspace.revealLeaf(existing[0]);
        return;
      }
      const leaf = side === 'left'
        ? this.app.workspace.getLeftLeaf(false)
        : this.app.workspace.getRightLeaf(false);
      if (!leaf) return;
      await leaf.setViewState({ type: viewType, active: true });
      this.app.workspace.revealLeaf(leaf);
    } catch (err) {
      console.error(`DocFlow: 뷰 활성화 실패 (${viewType})`, err);
    }
  }

  private async initViews(): Promise<void> {
    try {
      if (this.app.workspace.getLeavesOfType(ARTIFACT_EXPLORER_VIEW_TYPE).length === 0) {
        await this.activateView(ARTIFACT_EXPLORER_VIEW_TYPE, 'left');
      }
    } catch (err) {
      console.error('DocFlow: 초기 뷰 복원 실패', err);
    }
  }

  // ── 메타데이터 패널 자동 열기 ─────────────────────────────────────────────────

  private maybeAutoOpenMetadataPanel(leaf: WorkspaceLeaf | null): void {
    try {
      if (!leaf) return;

      // Reading View(preview) 진입 시에만 자동 열기
      const view = leaf.view;
      if (!(view instanceof MarkdownView) || view.getMode() !== 'preview') return;

      const file = this.app.workspace.getActiveFile();
      if (!file) return;

      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter?.type) return;

      // 이미 패널이 열려 있으면 스킵
      if (this.app.workspace.getLeavesOfType(METADATA_PANEL_VIEW_TYPE).length > 0) return;

      void this.activateView(METADATA_PANEL_VIEW_TYPE, 'right');
    } catch (err) {
      // 자동 열기 실패는 조용히 처리 (비핵심 기능)
      console.error('DocFlow: 메타데이터 패널 자동 열기 실패', err);
    }
  }
}
