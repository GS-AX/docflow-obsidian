import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import DocFlowPlugin from './main';
import { t, initI18n } from './i18n';

export class DocFlowSettingTab extends PluginSettingTab {
  private readonly plugin: DocFlowPlugin;

  constructor(app: App, plugin: DocFlowPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    // 설정 탭이 열릴 때마다 현재 언어 설정으로 i18n 을 재초기화한다.
    initI18n(() => this.plugin.settings.language);

    const { containerEl } = this;
    containerEl.empty();

    // ── Language ──────────────────────────────────────────────────────────────

    new Setting(containerEl)
      .setName(t('settingLanguageName'))
      .setDesc(t('settingLanguageDesc'))
      .addDropdown(dropdown => dropdown
        .addOption('auto', t('settingLanguageAuto'))
        .addOption('en',   t('settingLanguageEn'))
        .addOption('ko',   t('settingLanguageKo'))
        .setValue(this.plugin.settings.language)
        .onChange(async (v) => {
          this.plugin.settings.language = v as 'auto' | 'en' | 'ko';
          await this.plugin.saveSettings();
          initI18n(() => this.plugin.settings.language);
          this.plugin.refreshAllViews();
          new Notice(t('langChangedNotice'));
          // 설정 탭 자체도 현재 언어로 다시 그린다.
          this.display();
        }),
      );

    // ── Detection & Rendering ─────────────────────────────────────────────────

    new Setting(containerEl).setName(t('settingDetectionHeading')).setHeading();

    new Setting(containerEl)
      .setName(t('settingAutoDetectName'))
      .setDesc(t('settingAutoDetectDesc'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoTypeDetection)
        .onChange(async (v) => {
          this.plugin.settings.autoTypeDetection = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('settingSwaggerName'))
      .setDesc(t('settingSwaggerDesc'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.swaggerTryItOut)
        .onChange(async (v) => {
          this.plugin.settings.swaggerTryItOut = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('settingDiagramThemeName'))
      .setDesc(t('settingDiagramThemeDesc'))
      .addDropdown(dropdown => dropdown
        .addOption('auto',  t('settingDiagramAuto'))
        .addOption('light', t('settingDiagramLight'))
        .addOption('dark',  t('settingDiagramDark'))
        .setValue(this.plugin.settings.diagramTheme)
        .onChange(async (v) => {
          this.plugin.settings.diagramTheme = v as 'auto' | 'light' | 'dark';
          await this.plugin.saveSettings();
        }),
      );

    // ── Panel ─────────────────────────────────────────────────────────────────

    new Setting(containerEl).setName(t('settingPanelHeading')).setHeading();

    new Setting(containerEl)
      .setName(t('settingMetaPanelName'))
      .setDesc(t('settingMetaPanelDesc'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.metadataPanelAutoOpen)
        .onChange(async (v) => {
          this.plugin.settings.metadataPanelAutoOpen = v;
          await this.plugin.saveSettings();
        }),
      );

    // ── Vault ─────────────────────────────────────────────────────────────────

    new Setting(containerEl).setName(t('settingVaultHeading')).setHeading();

    new Setting(containerEl)
      .setName(t('settingVaultScanName'))
      .setDesc(t('settingVaultScanDesc'))
      .addText(text => text
        .setPlaceholder(t('settingVaultScanPlaceholder'))
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
