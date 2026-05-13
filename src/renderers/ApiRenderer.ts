import SwaggerUIBundle from 'swagger-ui-dist';
import { parseYaml } from 'obsidian';

// swagger-ui.css is appended to styles.css at build time via esbuild.config.mjs

// ── OpenAPI 스펙 파싱 ─────────────────────────────────────────────────────────

function parseSpec(source: string): Record<string, unknown> {
  const trimmed = source.trim();
  if (trimmed.startsWith('{')) {
    // JSON 코드블록
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('JSON 파싱 결과가 객체가 아닙니다.');
    }
    return parsed as Record<string, unknown>;
  }
  // YAML 코드블록 (YAML은 JSON의 상위 집합이므로 JSON도 처리됨)
  const parsed: unknown = parseYaml(trimmed);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('YAML 파싱 결과가 올바르지 않습니다.');
  }
  return parsed as Record<string, unknown>;
}

function getOasVersion(spec: Record<string, unknown>): string {
  return (
    (spec['openapi'] as string | undefined) ??
    (spec['swagger'] as string | undefined) ??
    ''
  );
}

// ── UI 빌드 헬퍼 ──────────────────────────────────────────────────────────────

function buildHeader(
  container: HTMLElement,
  spec: Record<string, unknown>,
  version: string,
  tryItOut: boolean,
): void {
  const header = container.createEl('div', { cls: 'docflow-api-header' });

  const info = spec['info'] as Record<string, string> | undefined;
  if (info?.['title']) {
    header.createEl('span', { cls: 'docflow-api-title', text: info['title'] });
    if (info['version']) {
      header.createEl('span', {
        cls: 'docflow-api-spec-version',
        text: `v${info['version']}`,
      });
    }
  }

  const isV3 = version.startsWith('3.');
  header.createEl('span', {
    cls: `docflow-api-badge docflow-api-badge--${isV3 ? 'oas3' : 'oas2'}`,
    text: `OAS ${version}`,
  });

  if (!tryItOut) {
    header.createEl('span', {
      cls: 'docflow-api-badge docflow-api-badge--try-off',
      text: 'Try it out: off',
    });
  }
}

// ── ApiRenderer ───────────────────────────────────────────────────────────────

export class ApiRenderer {
  /**
   * YAML/JSON 소스가 OpenAPI(3.x) 또는 Swagger(2.x) 명세인지 확인한다.
   * renderers/index.ts 라우터가 yaml·json 코드블록을 위임할 때 사용한다.
   */
  static isApiSpec(source: string): boolean {
    return /^(openapi|swagger)\s*:/m.test(source.trim());
  }

  /**
   * YAML/JSON 코드블록을 Swagger UI 뷰로 렌더링한다.
   * renderers/index.ts 의 registerMarkdownCodeBlockProcessor 콜백에서 호출된다.
   *
   * @param source   - 코드블록 원문 (YAML 또는 JSON 문자열)
   * @param el       - Obsidian 이 제공하는 렌더링 컨테이너
   * @param tryItOut - 플러그인 설정에서 가져온 Try it out 활성 여부
   */
  render(source: string, el: HTMLElement, tryItOut: boolean): void {
    el.empty();

    const container = el.createEl('div', { cls: 'docflow-api-container' });

    // ── 파싱 ─────────────────────────────────────────────────────────────────
    let spec: Record<string, unknown>;
    try {
      spec = parseSpec(source);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      container.createEl('p', {
        cls: 'docflow-api-error',
        text: `OpenAPI 파싱 실패: ${msg}`,
      });
      return;
    }

    // ── 버전 검증 ─────────────────────────────────────────────────────────────
    const version = getOasVersion(spec);
    const isSupported = version.startsWith('3.') || version.startsWith('2.');
    if (!isSupported) {
      container.createEl('p', {
        cls: 'docflow-api-error',
        text: `지원하지 않는 OpenAPI 버전입니다: "${version || '(없음)'}". openapi: 3.x 또는 swagger: 2.x 가 필요합니다.`,
      });
      return;
    }

    // ── 헤더 바 ───────────────────────────────────────────────────────────────
    buildHeader(container, spec, version, tryItOut);

    // ── Swagger UI 마운트 ─────────────────────────────────────────────────────
    const swaggerMount = container.createEl('div', { cls: 'docflow-api-swagger' });

    try {
      type SwaggerBundle = ((opts: Record<string, unknown>) => unknown) & { presets: { apis: unknown } };
      const Bundle = SwaggerUIBundle as unknown as SwaggerBundle;
      Bundle({
        spec,
        domNode: swaggerMount,
        presets: [Bundle.presets.apis],
        layout: 'BaseLayout',
        tryItOutEnabled: tryItOut,
        // tryItOut 이 OFF 이면 실제 HTTP 요청 버튼 자체를 비활성화
        supportedSubmitMethods: tryItOut
          ? ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']
          : [],
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        displayRequestDuration: true,
        filter: false,
        deepLinking: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      swaggerMount.createEl('p', {
        cls: 'docflow-api-error',
        text: `Swagger UI 렌더링 실패: ${msg}`,
      });
    }
  }

  /**
   * 플러그인의 onunload() 에서 반드시 호출해야 한다.
   * document.head 에 주입한 <style> 태그를 제거해 완전히 원복한다.
   */
  onunload(): void {
    // swagger CSS is in styles.css — no runtime cleanup needed
  }
}
