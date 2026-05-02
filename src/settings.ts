import { App, PluginSettingTab, Setting } from 'obsidian';
import DocFlowPlugin from './main';

export class DocFlowSettingTab extends PluginSettingTab {
  private readonly plugin: DocFlowPlugin;

  constructor(app: App, plugin: DocFlowPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ── 감지 & 렌더링 ─────────────────────────────────────────────────────────

    new Setting(containerEl).setName('감지 & 렌더링').setHeading();

    new Setting(containerEl)
      .setName('자동 유형 감지')
      .setDesc(
        'frontmatter에 type 필드가 없을 때 파일 내용과 경로를 분석해 산출물 유형을 자동으로 감지합니다. ' +
        '예: erDiagram 키워드가 있는 mermaid 블록 → ERD, /api/ 경로의 YAML 파일 → API 명세. ' +
        '성능 우선 환경이나 오탐이 발생할 때 꺼두세요.',
      )
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoTypeDetection)
        .onChange(async (v) => {
          this.plugin.settings.autoTypeDetection = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Swagger Try it out')
      .setDesc(
        'API 명세 렌더러(Swagger UI)에서 실제 HTTP 요청을 전송하는 "Try it out" 버튼을 활성화합니다. ' +
        '기본값 OFF — CORS 제한이나 인증이 필요한 API에서는 요청이 실패할 수 있습니다.',
      )
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.swaggerTryItOut)
        .onChange(async (v) => {
          this.plugin.settings.swaggerTryItOut = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('다이어그램 테마')
      .setDesc(
        'ERD · WBS · 아키텍처 다이어그램의 색상 테마를 설정합니다. ' +
        '"자동"으로 설정하면 Obsidian의 라이트/다크 테마를 실시간으로 따라갑니다.',
      )
      .addDropdown(dropdown => dropdown
        .addOption('auto',  '자동 (Obsidian 테마 따라감)')
        .addOption('light', '라이트')
        .addOption('dark',  '다크')
        .setValue(this.plugin.settings.diagramTheme)
        .onChange(async (v) => {
          this.plugin.settings.diagramTheme = v as 'auto' | 'light' | 'dark';
          await this.plugin.saveSettings();
        }),
      );

    // ── 패널 ─────────────────────────────────────────────────────────────────

    new Setting(containerEl).setName('패널').setHeading();

    new Setting(containerEl)
      .setName('메타데이터 패널 자동 표시')
      .setDesc(
        'DocFlow 산출물 파일(frontmatter type 있는 파일)을 Reading View로 열 때 ' +
        '우측 사이드바에 메타데이터 패널을 자동으로 엽니다. ' +
        '패널이 이미 열려 있으면 중복으로 열리지 않습니다.',
      )
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.metadataPanelAutoOpen)
        .onChange(async (v) => {
          this.plugin.settings.metadataPanelAutoOpen = v;
          await this.plugin.saveSettings();
        }),
      );

    // ── Vault 설정 ────────────────────────────────────────────────────────────

    new Setting(containerEl).setName('Vault 설정').setHeading();

    new Setting(containerEl)
      .setName('산출물 스캔 경로')
      .setDesc(
        '탐색기와 자동 감지가 스캔할 폴더 경로를 쉼표로 구분하여 입력하세요. ' +
        '비워두면 Vault 전체를 스캔합니다. 예: docs, projects/alpha, team/backend',
      )
      .addText(text => text
        .setPlaceholder('예: docs, projects/alpha')
        .setValue(this.plugin.settings.scanPaths.join(', '))
        .onChange(async (v) => {
          this.plugin.settings.scanPaths = v
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);
          await this.plugin.saveSettings();
        }),
      );
  }
}
