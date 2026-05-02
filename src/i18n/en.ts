export const en = {
  // ── View titles ────────────────────────────────────────────────────────────
  explorerTitle:      'DocFlow Explorer',
  metadataTitle:      'DocFlow Metadata',

  // ── Artifact type labels ───────────────────────────────────────────────────
  typeERD:            'ERD',
  typeAPI:            'API',
  typeArchitecture:   'Architecture',
  typeWBS:            'WBS',
  typeRequirements:   'Requirements',
  typeManual:         'Manual',
  typeMeeting:        'Meeting',

  // ── Status labels ──────────────────────────────────────────────────────────
  statusDraft:        'Draft',
  statusReview:       'In Review',
  statusApproved:     'Approved',
  statusDeprecated:   'Deprecated',

  // ── Explorer filter bar ────────────────────────────────────────────────────
  filterType:         'Type',
  filterStatus:       'Status',
  filterAll:          'All',
  countItems:         '{0} items',
  refreshLabel:       'Refresh',

  // ── Explorer list ──────────────────────────────────────────────────────────
  noProject:          '(No Project)',
  noArtifacts:        'No artifacts found.',
  adjustFilters:      'Try adjusting the filters.',
  openItem:           'Open {0}',

  // ── Metadata panel ─────────────────────────────────────────────────────────
  metaEmptyFile:      'Open a file to\nview its metadata.',
  metaNotArtifact:    'Not a DocFlow artifact.\nAdd a type field to the frontmatter.',
  metaVersion:        'Version',
  metaAuthor:         'Author',
  metaModified:       'Modified',
  metaTags:           'Tags',
  metaRelated:        'Related',
  openLink:           'Open {0}',
  metaDateLocale:     'en-US',

  // ── Template inserter ──────────────────────────────────────────────────────
  insertModalTitle:   'Insert Artifact Template',
  insertModalDesc:    'Select the artifact type to insert.',
  insertFormTitle:    '{0} — Fill in Details',
  insertCancel:       'Cancel',
  insertConfirm:      'Insert Template',
  insertNoEditor:     'No active editor. Open a file first.',
  insertSuccess:      'Template inserted.',
  insertDateField:    'date',

  // ── Settings ───────────────────────────────────────────────────────────────
  settingDetectionHeading:    'Detection & Rendering',
  settingAutoDetectName:      'Auto Type Detection',
  settingAutoDetectDesc:
    'When a file has no type field in its frontmatter, DocFlow analyzes the content and path to detect the artifact type automatically. ' +
    'Examples: a mermaid block with the erDiagram keyword → ERD; a YAML file under an /api/ path → API spec. ' +
    'Disable if you prefer to set types explicitly or if false positives occur.',
  settingSwaggerDesc:
    'Enables the "Try it out" button in the API spec renderer (Swagger UI), allowing live HTTP requests. ' +
    'Off by default — requests may fail for APIs that require authentication or have CORS restrictions.',
  settingDiagramThemeName:    'Diagram Theme',
  settingDiagramThemeDesc:
    'Color theme for ERD, WBS, and Architecture diagrams. ' +
    '"Auto" follows Obsidian\'s light/dark theme in real time.',
  settingDiagramAuto:         'Auto (follows Obsidian theme)',
  settingDiagramLight:        'Light',
  settingDiagramDark:         'Dark',
  settingPanelHeading:        'Panel',
  settingMetaPanelName:       'Auto-open Metadata Panel',
  settingMetaPanelDesc:
    'Automatically opens the metadata panel in the right sidebar when you enter Reading View for a DocFlow artifact file (a file with a type field in its frontmatter). ' +
    'The panel will not open a second time if it is already visible.',
  settingVaultHeading:        'Vault',
  settingVaultScanName:       'Scan Paths',
  settingVaultScanDesc:
    'Comma-separated folder paths for the Explorer and auto-detection to scan. ' +
    'Leave empty to scan the entire vault. Example: docs, projects/alpha, team/backend',
  settingVaultScanPlaceholder: 'e.g. docs, projects/alpha',
  settingLanguageName:        'Language',
  settingLanguageDesc:
    'Language used for DocFlow\'s UI labels and artifact templates. ' +
    '"Auto" follows your system/browser locale.',
  settingLanguageAuto:        'Auto',
  settingLanguageEn:          'English',
  settingLanguageKo:          '한국어',

  // ── Main notices ───────────────────────────────────────────────────────────
  mainRendererFailed:
    'DocFlow: Failed to initialize renderers. ' +
    'Try re-enabling the plugin or restarting Obsidian.',
  mainSettingsLoadFailed: 'DocFlow: Failed to load settings. Using defaults.',
  mainSettingsSaveFailed: 'DocFlow: Failed to save settings.',
};

// Translations 타입: 키 구조는 en 과 동일하되, 값 타입은 string 으로 풀어둔다.
// ko.ts 가 다른 문자열로 구현할 수 있도록 리터럴 타입을 쓰지 않는다.
type _En = typeof en;
export type Translations = { [K in keyof _En]: string };
