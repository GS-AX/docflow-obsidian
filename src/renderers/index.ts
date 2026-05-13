import { Plugin, sanitizeHTMLToDom } from 'obsidian';
import mermaid from 'mermaid';
import { ErdRenderer, syncMermaidTheme } from './ErdRenderer';
import { ApiRenderer } from './ApiRenderer';
import { detectType } from '../utils/typeDetector';
import { DocFlowSettings } from '../types';

// ── Renderer 인스턴스 (플러그인 생명주기 동안 재사용) ─────────────────────────

const erdRenderer = new ErdRenderer();
const apiRenderer = new ApiRenderer();

let fallbackIdCounter = 0;

// ── 폴백 렌더러 ────────────────────────────────────────────────────────────────
//
// DocFlow 가 코드블록 프로세서를 등록하면 Obsidian 기본 렌더러를 완전히 대체한다.
// DocFlow 전용 렌더러가 없는 블록은 아래 폴백이 처리해 기존 동작을 최대한 유지한다.

/**
 * ERD/WBS/Architecture 가 아닌 일반 mermaid 블록을 mermaid.js 로 직접 렌더링한다.
 * Obsidian 기본 mermaid 렌더링과 동일한 결과를 만든다.
 */
async function renderMermaidFallback(source: string, el: HTMLElement): Promise<void> {
  // securityLevel:'strict' 보장 — ERD 렌더러를 거치지 않은 경로에서도 XSS 방지
  syncMermaidTheme();
  const id = `docflow-mermaid-fb-${(++fallbackIdCounter).toString(36)}`;
  try {
    const { svg } = await mermaid.render(id, source);
    // mermaid strict 모드가 SVG를 자체 sanitize하므로 innerHTML 삽입이 안전하다.
    el.createEl('div', { cls: 'docflow-mermaid-passthrough' }).appendChild(sanitizeHTMLToDom(svg));
  } catch {
    // mermaid 파싱 오류 시 원문 코드 블록으로 표시
    renderCodeFallback(source, 'mermaid', el);
  }
}

/**
 * DocFlow 가 처리하지 않는 yaml/json 블록을 일반 코드 블록으로 렌더링한다.
 * Obsidian 의 `.language-*` CSS 클래스를 그대로 사용해 기본 스타일을 유지한다.
 */
function renderCodeFallback(source: string, lang: string, el: HTMLElement): void {
  el.createEl('pre', { cls: `language-${lang}` })
    .createEl('code', { cls: `language-${lang}`, text: source });
}

// ── 라우터 등록 ────────────────────────────────────────────────────────────────

/**
 * 플러그인의 onload() 에서 호출한다.
 *
 * 등록된 코드블록 프로세서:
 *  - `mermaid` → erDiagram: ErdRenderer  /  기타: mermaid.js 폴백
 *  - `yaml`    → OpenAPI 명세: ApiRenderer  /  기타: 코드 블록 폴백
 *  - `json`    → OpenAPI JSON: ApiRenderer  /  기타: 코드 블록 폴백
 *
 * @param plugin      - Plugin 인스턴스 (registerMarkdownCodeBlockProcessor 에 사용)
 * @param getSettings - 최신 설정을 반환하는 getter (렌더 시점에 호출되어 항상 최신 값을 반영)
 */
export function registerRenderers(
  plugin: Plugin,
  getSettings: () => DocFlowSettings,
): void {

  // ── mermaid 코드블록 ─────────────────────────────────────────────────────────
  //
  // 이 프로세서가 Obsidian 내장 mermaid 렌더러를 대체한다.
  // DocFlow 전용 렌더러가 없는 블록은 renderMermaidFallback 이 처리한다.
  plugin.registerMarkdownCodeBlockProcessor(
    'mermaid',
    async (source, el, ctx) => {
      const settings = getSettings();

      // typeDetector 는 ```mermaid ... ``` 펜스 블록을 기대하므로 래핑해서 전달한다.
      // autoTypeDetection 이 OFF 이면 본문 분석을 건너뛰고 frontmatter 만 사용한다.
      const contentForDetection = settings.autoTypeDetection
        ? '```mermaid\n' + source + '\n```'
        : '';
      const pathForDetection = settings.autoTypeDetection ? ctx.sourcePath : '';

      const fm = ctx.frontmatter as Record<string, unknown> | undefined;
      const type = detectType(
        typeof fm?.['type'] === 'string' ? fm['type'] : undefined,
        contentForDetection,
        pathForDetection,
      );

      switch (type) {
        case 'erd':
          await erdRenderer.render(source, el);
          break;

        // Phase 2 렌더러 — 구현 완료 후 case 추가
        // case 'wbs':          await wbsRenderer.render(source, el); break;
        // case 'architecture': await archRenderer.render(source, el); break;

        default:
          // DocFlow 미처리 mermaid 블록 → mermaid.js 직접 렌더링으로 원복
          await renderMermaidFallback(source, el);
      }
    },
  );

  // ── yaml 코드블록 ────────────────────────────────────────────────────────────
  plugin.registerMarkdownCodeBlockProcessor(
    'yaml',
    (source, el, ctx) => {
      const settings = getSettings();

      // frontmatter type 우선, 없으면 내용 기반 감지 (파일 경로의 /api/ 패턴 포함)
      const fm = ctx.frontmatter as Record<string, unknown> | undefined;
      const type = detectType(
        typeof fm?.['type'] === 'string' ? fm['type'] : undefined,
        settings.autoTypeDetection ? source : '',
        settings.autoTypeDetection ? ctx.sourcePath : '',
      );

      // type === 'api' (frontmatter 또는 경로 기반) OR 내용이 OpenAPI 명세인 경우 처리
      if (type === 'api' || ApiRenderer.isApiSpec(source)) {
        apiRenderer.render(source, el, settings.swaggerTryItOut);
      } else {
        renderCodeFallback(source, 'yaml', el);
      }
    },
  );

  // ── json 코드블록 ────────────────────────────────────────────────────────────
  plugin.registerMarkdownCodeBlockProcessor(
    'json',
    (source, el, _ctx) => {
      // JSON 블록은 frontmatter type 이나 경로로 감지할 패턴이 없으므로
      // ApiSpec 내용 기반 감지만 사용한다.
      if (ApiRenderer.isApiSpec(source)) {
        apiRenderer.render(source, el, getSettings().swaggerTryItOut);
      } else {
        renderCodeFallback(source, 'json', el);
      }
    },
  );
}

// ── 정리 ────────────────────────────────────────────────────────────────────────

/**
 * 플러그인의 onunload() 에서 호출한다.
 * 각 렌더러가 document.head 에 주입한 <style> 태그 등을 제거한다.
 * registerMarkdownCodeBlockProcessor 로 등록된 프로세서는 Obsidian 이 자동으로 해제한다.
 */
export function unloadRenderers(): void {
  erdRenderer.onunload();
  apiRenderer.onunload();
}
