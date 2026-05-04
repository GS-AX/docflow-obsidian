import type { Translations } from './en';

export const ko: Translations = {
  // ── View titles ────────────────────────────────────────────────────────────
  explorerTitle:      'DocFlow 탐색기',
  metadataTitle:      'DocFlow 메타데이터',

  // ── Artifact type labels ───────────────────────────────────────────────────
  typeERD:            'ERD',
  typeAPI:            'API',
  typeArchitecture:   '아키텍처',
  typeWBS:            'WBS',
  typeRequirements:   '요구사항',
  typeManual:         '매뉴얼',
  typeMeeting:        '회의록',

  // ── Status labels ──────────────────────────────────────────────────────────
  statusDraft:        '초안',
  statusReview:       '검토중',
  statusApproved:     '승인',
  statusDeprecated:   '구버전',

  // ── Explorer filter bar ────────────────────────────────────────────────────
  filterType:         '유형',
  filterStatus:       '상태',
  filterAll:          '전체',
  countItems:         '{0}개',
  refreshLabel:       '새로고침',

  // ── Explorer list ──────────────────────────────────────────────────────────
  noProject:          '(프로젝트 없음)',
  noArtifacts:        '산출물이 없습니다.',
  adjustFilters:      '필터를 변경해 보세요.',
  openItem:           '{0} 열기',

  // ── Metadata panel ─────────────────────────────────────────────────────────
  metaEmptyFile:      '파일을 열면\n메타데이터가 표시됩니다.',
  metaNotArtifact:    'DocFlow 산출물이 아닙니다.\nfrontmatter에 type 을 추가하세요.',
  metaVersion:        '버전',
  metaAuthor:         '작성자',
  metaModified:       '수정일',
  metaTags:           '태그',
  metaRelated:        '연관 문서',
  openLink:           '{0} 열기',
  metaDateLocale:     'ko-KR',

  // ── Template inserter ──────────────────────────────────────────────────────
  insertModalTitle:   '산출물 템플릿 삽입',
  insertModalDesc:    '삽입할 산출물 유형을 선택하세요.',
  insertFormTitle:    '{0} 템플릿 정보 입력',
  insertCancel:       '취소',
  insertConfirm:      '템플릿 삽입',
  insertNoEditor:     '편집 중인 파일이 없습니다. 파일을 먼저 열어주세요.',
  insertSuccess:      '템플릿이 삽입되었습니다.',
  insertDateField:    '날짜',

  // ── Settings ───────────────────────────────────────────────────────────────
  settingDetectionHeading:    '감지 & 렌더링',
  settingAutoDetectName:      '자동 유형 감지',
  settingAutoDetectDesc:
    'frontmatter에 type 필드가 없을 때 파일 내용과 경로를 분석해 산출물 유형을 자동으로 감지합니다. ' +
    '예: erDiagram 키워드가 있는 mermaid 블록 → ERD, /api/ 경로의 YAML 파일 → API 명세. ' +
    '성능 우선 환경이나 오탐이 발생할 때 꺼두세요.',
  settingSwaggerName:         'Swagger try it out',
  settingSwaggerDesc:
    'API 명세 렌더러(Swagger UI)에서 실제 HTTP 요청을 전송하는 "Try it out" 버튼을 활성화합니다. ' +
    '기본값 OFF — CORS 제한이나 인증이 필요한 API에서는 요청이 실패할 수 있습니다.',
  settingDiagramThemeName:    '다이어그램 테마',
  settingDiagramThemeDesc:
    'ERD · WBS · 아키텍처 다이어그램의 색상 테마를 설정합니다. ' +
    '"자동"으로 설정하면 Obsidian의 라이트/다크 테마를 실시간으로 따라갑니다.',
  settingDiagramAuto:         '자동 (Obsidian 테마 따라감)',
  settingDiagramLight:        '라이트',
  settingDiagramDark:         '다크',
  settingPanelHeading:        '패널',
  settingMetaPanelName:       '메타데이터 패널 자동 표시',
  settingMetaPanelDesc:
    'DocFlow 산출물 파일(frontmatter type 있는 파일)을 Reading View로 열 때 ' +
    '우측 사이드바에 메타데이터 패널을 자동으로 엽니다. ' +
    '패널이 이미 열려 있으면 중복으로 열리지 않습니다.',
  settingVaultHeading:        'Vault 설정',
  settingVaultScanName:       '산출물 스캔 경로',
  settingVaultScanDesc:
    '탐색기와 자동 감지가 스캔할 폴더 경로를 쉼표로 구분하여 입력하세요. ' +
    '비워두면 Vault 전체를 스캔합니다. 예: docs, projects/alpha, team/backend',
  settingVaultScanPlaceholder: '예: docs, projects/alpha',
  settingLanguageName:        '언어',
  settingLanguageDesc:
    'DocFlow UI 레이블과 산출물 템플릿에 사용할 언어를 선택합니다. ' +
    '"자동"으로 설정하면 시스템/브라우저 로케일을 따릅니다.',
  settingLanguageAuto:        '자동',
  settingLanguageEn:          'English',
  settingLanguageKo:          '한국어',

  // ── Commands & ribbon ─────────────────────────────────────────────────────
  cmdInsertTemplate:      '산출물 템플릿 삽입',
  cmdOpenExplorer:        'Artifact Explorer 열기',
  cmdOpenMetadata:        '메타데이터 패널 열기',
  ribbonTooltip:          'DocFlow Explorer 열기',
  langChangedNotice:      'DocFlow: 커맨드 이름을 갱신하려면 플러그인을 재활성화하세요.',

  // ── Main notices ───────────────────────────────────────────────────────────
  mainRendererFailed:
    'DocFlow: 렌더러를 초기화하지 못했습니다. ' +
    '플러그인을 다시 활성화하거나 Obsidian을 재시작해 보세요.',
  mainSettingsLoadFailed: 'DocFlow: 설정을 불러오지 못했습니다. 기본값으로 실행합니다.',
  mainSettingsSaveFailed: 'DocFlow: 설정을 저장하지 못했습니다.',
};
