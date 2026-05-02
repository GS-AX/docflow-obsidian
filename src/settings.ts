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

    new Setting(containerEl).setName('Detection & Rendering').setHeading();

    new Setting(containerEl)
      .setName('Auto Type Detection')
      .setDesc(
        'When a file has no type field in its frontmatter, DocFlow analyzes the content and path to detect the artifact type automatically. ' +
        'Examples: a mermaid block with the erDiagram keyword → ERD; a YAML file under an /api/ path → API spec. ' +
        'Disable if you prefer to set types explicitly or if false positives occur.',
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
        'Enables the "Try it out" button in the API spec renderer (Swagger UI), allowing live HTTP requests. ' +
        'Off by default — requests may fail for APIs that require authentication or have CORS restrictions.',
      )
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.swaggerTryItOut)
        .onChange(async (v) => {
          this.plugin.settings.swaggerTryItOut = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Diagram Theme')
      .setDesc(
        'Color theme for ERD, WBS, and Architecture diagrams. ' +
        '"Auto" follows Obsidian\'s light/dark theme in real time.',
      )
      .addDropdown(dropdown => dropdown
        .addOption('auto',  'Auto (follows Obsidian theme)')
        .addOption('light', 'Light')
        .addOption('dark',  'Dark')
        .setValue(this.plugin.settings.diagramTheme)
        .onChange(async (v) => {
          this.plugin.settings.diagramTheme = v as 'auto' | 'light' | 'dark';
          await this.plugin.saveSettings();
        }),
      );

    // ── 패널 ─────────────────────────────────────────────────────────────────

    new Setting(containerEl).setName('Panel').setHeading();

    new Setting(containerEl)
      .setName('Auto-open Metadata Panel')
      .setDesc(
        'Automatically opens the metadata panel in the right sidebar when you enter Reading View for a DocFlow artifact file (a file with a type field in its frontmatter). ' +
        'The panel will not open a second time if it is already visible.',
      )
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.metadataPanelAutoOpen)
        .onChange(async (v) => {
          this.plugin.settings.metadataPanelAutoOpen = v;
          await this.plugin.saveSettings();
        }),
      );

    // ── Vault 설정 ────────────────────────────────────────────────────────────

    new Setting(containerEl).setName('Vault').setHeading();

    new Setting(containerEl)
      .setName('Scan Paths')
      .setDesc(
        'Comma-separated folder paths for the Explorer and auto-detection to scan. ' +
        'Leave empty to scan the entire vault. Example: docs, projects/alpha, team/backend',
      )
      .addText(text => text
        .setPlaceholder('e.g. docs, projects/alpha')
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
