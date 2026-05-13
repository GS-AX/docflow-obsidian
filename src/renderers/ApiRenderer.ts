import { parseYaml, requestUrl } from 'obsidian';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OasInfo { title?: string; version?: string; description?: string; }
interface OasParam {
  name: string; in: string; required?: boolean;
  description?: string; schema?: Record<string, unknown>;
}
interface OasResponse { description?: string; content?: Record<string, unknown>; }
interface OasOperation {
  tags?: string[]; summary?: string; description?: string;
  operationId?: string; parameters?: OasParam[];
  requestBody?: { required?: boolean; content?: Record<string, unknown> };
  responses?: Record<string, OasResponse>; deprecated?: boolean;
}
interface OasSpec {
  openapi?: string; swagger?: string;
  info?: OasInfo;
  paths?: Record<string, Record<string, unknown>>;
  servers?: Array<{ url: string }>;
}

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

// ── Parsing ───────────────────────────────────────────────────────────────────

function parseSpec(source: string): OasSpec {
  const trimmed = source.trim();
  const parsed: unknown = trimmed.startsWith('{')
    ? JSON.parse(trimmed)
    : parseYaml(trimmed);
  if (typeof parsed !== 'object' || parsed === null) throw new Error('Spec is not an object');
  return parsed as OasSpec;
}

function getOasVersion(spec: OasSpec): string {
  return spec.openapi ?? spec.swagger ?? '';
}

// ── Header ────────────────────────────────────────────────────────────────────

function buildHeader(
  container: HTMLElement, spec: OasSpec, version: string, tryItOut: boolean,
): void {
  const header = container.createEl('div', { cls: 'docflow-api-header' });
  if (spec.info?.title) {
    header.createEl('span', { cls: 'docflow-api-title', text: spec.info.title });
    if (spec.info.version) {
      header.createEl('span', { cls: 'docflow-api-spec-version', text: `v${spec.info.version}` });
    }
  }
  header.createEl('span', {
    cls: `docflow-api-badge docflow-api-badge--${version.startsWith('3.') ? 'oas3' : 'oas2'}`,
    text: `OAS ${version}`,
  });
  if (!tryItOut) {
    header.createEl('span', {
      cls: 'docflow-api-badge docflow-api-badge--try-off',
      text: 'Try it out: off',
    });
  }
}

// ── Endpoint list ─────────────────────────────────────────────────────────────

interface EndpointEntry {
  method: string; path: string; op: OasOperation;
}

function collectEndpoints(spec: OasSpec): Map<string, EndpointEntry[]> {
  const groups = new Map<string, EndpointEntry[]>();
  if (!spec.paths) return groups;

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!op || typeof op !== 'object') continue;
      const operation = op as OasOperation;
      const tags =
        Array.isArray(operation.tags) && operation.tags.length > 0
          ? operation.tags
          : ['default'];
      for (const tag of tags) {
        const key = String(tag);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push({ method, path, op: operation });
      }
    }
  }
  return groups;
}

// ── Detail rendering ──────────────────────────────────────────────────────────

function renderParams(el: HTMLElement, params: OasParam[]): void {
  if (params.length === 0) return;
  el.createEl('h5', { cls: 'docflow-api-section-title', text: 'Parameters' });
  const table = el.createEl('table', { cls: 'docflow-api-params-table' });
  const thead = table.createEl('thead');
  const hr = thead.createEl('tr');
  for (const h of ['Name', 'In', 'Required', 'Description']) {
    hr.createEl('th', { text: h });
  }
  const tbody = table.createEl('tbody');
  for (const p of params) {
    const tr = tbody.createEl('tr');
    tr.createEl('td', { cls: 'docflow-api-param-name', text: p.name });
    tr.createEl('td', { cls: 'docflow-api-param-in', text: p.in });
    tr.createEl('td', { text: p.required ? '✓' : '' });
    tr.createEl('td', { text: p.description ?? '' });
  }
}

function schemaToText(schema: unknown, depth = 0): string {
  if (!schema || typeof schema !== 'object') return String(schema ?? '');
  const s = schema as Record<string, unknown>;
  if (typeof s['$ref'] === 'string') return s['$ref'].split('/').pop() ?? '';
  if (s['type'] === 'array' && s['items']) return `${schemaToText(s['items'], depth)}[]`;
  if (s['type']) return String(s['type']);
  if (s['properties'] && depth < 2) {
    const props = Object.entries(s['properties'] as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${schemaToText(v, depth + 1)}`)
      .join(', ');
    return `{ ${props} }`;
  }
  return 'object';
}

function renderRequestBody(el: HTMLElement, body: OasOperation['requestBody']): void {
  if (!body?.content) return;
  el.createEl('h5', { cls: 'docflow-api-section-title', text: 'Request body' });
  for (const [ct, mediaType] of Object.entries(body.content)) {
    const row = el.createEl('div', { cls: 'docflow-api-body-row' });
    row.createEl('code', { text: ct });
    if (typeof mediaType === 'object' && mediaType !== null) {
      const mt = mediaType as Record<string, unknown>;
      if (mt['schema']) {
        row.createEl('span', { cls: 'docflow-api-schema-hint', text: ` ${schemaToText(mt['schema'])}` });
      }
    }
  }
}

function renderResponses(el: HTMLElement, responses: Record<string, OasResponse>): void {
  el.createEl('h5', { cls: 'docflow-api-section-title', text: 'Responses' });
  const table = el.createEl('table', { cls: 'docflow-api-params-table' });
  const tbody = table.createEl('tbody');
  for (const [code, resp] of Object.entries(responses)) {
    const tr = tbody.createEl('tr');
    const statusCls =
      code.startsWith('2') ? 'docflow-api-status--ok' :
      code.startsWith('4') ? 'docflow-api-status--client' :
      code.startsWith('5') ? 'docflow-api-status--server' : '';
    tr.createEl('td').createEl('code', { cls: `docflow-api-status ${statusCls}`, text: code });
    tr.createEl('td', { text: resp.description ?? '' });
  }
}

// ── Try it out ────────────────────────────────────────────────────────────────

function buildTryItOut(
  el: HTMLElement, method: string, path: string,
  op: OasOperation, servers: Array<{ url: string }>,
): void {
  const section = el.createEl('div', { cls: 'docflow-api-try' });
  section.createEl('h5', { cls: 'docflow-api-section-title', text: 'Try it out' });

  const baseUrl = servers?.[0]?.url ?? '';
  const inputs: Record<string, HTMLInputElement> = {};

  const allParams = op.parameters ?? [];
  if (allParams.length > 0) {
    const form = section.createEl('div', { cls: 'docflow-api-try-form' });
    for (const p of allParams) {
      const row = form.createEl('div', { cls: 'docflow-api-try-row' });
      row.createEl('label', {
        text: `${p.name}${p.required ? ' *' : ''}`,
        cls: 'docflow-api-try-label',
      });
      const input = row.createEl('input', {
        cls: 'docflow-api-try-input',
        attr: { placeholder: p.in === 'query' ? `(query) ${p.description ?? ''}` : p.description ?? '' },
      });
      inputs[p.name] = input;
    }
  }

  let bodyInput: HTMLTextAreaElement | null = null;
  if (op.requestBody?.content?.['application/json']) {
    const row = section.createEl('div', { cls: 'docflow-api-try-row' });
    row.createEl('label', { text: 'Request body (JSON)', cls: 'docflow-api-try-label' });
    bodyInput = row.createEl('textarea', { cls: 'docflow-api-try-body' });
  }

  const execBtn = section.createEl('button', {
    cls: 'docflow-api-try-exec mod-cta',
    text: `Execute ${method.toUpperCase()}`,
  });
  const resultEl = section.createEl('div', { cls: 'docflow-api-try-result' });

  execBtn.addEventListener('click', () => {
    void executeTryItOut(method, path, baseUrl, inputs, bodyInput, op, resultEl);
  });
}

async function executeTryItOut(
  method: string, path: string, baseUrl: string,
  inputs: Record<string, HTMLInputElement>,
  bodyInput: HTMLTextAreaElement | null,
  op: OasOperation,
  resultEl: HTMLElement,
): Promise<void> {
  resultEl.empty();
  resultEl.createEl('p', { text: 'Executing…', cls: 'docflow-api-try-pending' });

  let resolvedPath = path;
  const queryParts: string[] = [];

  for (const p of op.parameters ?? []) {
    const val = inputs[p.name]?.value;
    if (!val) continue;
    if (p.in === 'path') {
      resolvedPath = resolvedPath.replace(`{${p.name}}`, encodeURIComponent(val));
    } else if (p.in === 'query') {
      queryParts.push(`${encodeURIComponent(p.name)}=${encodeURIComponent(val)}`);
    }
  }

  const url = `${baseUrl}${resolvedPath}${queryParts.length ? '?' + queryParts.join('&') : ''}`;

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    let body: string | undefined;
    if (bodyInput?.value) {
      body = bodyInput.value;
      headers['Content-Type'] = 'application/json';
    }

    const resp = await requestUrl({ url, method: method.toUpperCase(), headers, body });

    resultEl.empty();
    const statusCls =
      resp.status < 300 ? 'docflow-api-status--ok' :
      resp.status < 500 ? 'docflow-api-status--client' : 'docflow-api-status--server';
    resultEl.createEl('code', { cls: `docflow-api-status ${statusCls}`, text: String(resp.status) });

    const pre = resultEl.createEl('pre', { cls: 'docflow-api-try-response' });
    try {
      pre.textContent = JSON.stringify(resp.json as unknown, null, 2);
    } catch {
      pre.textContent = resp.text;
    }
  } catch (err) {
    resultEl.empty();
    resultEl.createEl('p', {
      cls: 'docflow-api-try-error',
      text: err instanceof Error ? err.message : String(err),
    });
  }
}

// ── Endpoint row ──────────────────────────────────────────────────────────────

function renderEndpoint(
  parent: HTMLElement, entry: EndpointEntry,
  servers: Array<{ url: string }>, tryItOut: boolean,
): void {
  const wrap = parent.createEl('div', { cls: 'docflow-api-endpoint' });

  const row = wrap.createEl('div', {
    cls: 'docflow-api-endpoint-row',
    attr: { role: 'button', tabindex: '0' },
  });

  row.createEl('span', {
    cls: `docflow-api-method docflow-api-method--${entry.method}`,
    text: entry.method.toUpperCase(),
  });
  row.createEl('code', { cls: 'docflow-api-path', text: entry.path });
  if (entry.op.summary) {
    row.createEl('span', { cls: 'docflow-api-op-summary', text: entry.op.summary });
  }
  if (entry.op.deprecated) {
    row.createEl('span', { cls: 'docflow-api-deprecated', text: 'deprecated' });
  }

  const detail = wrap.createEl('div', { cls: 'docflow-api-endpoint-detail' });
  detail.style.display = 'none';

  let expanded = false;
  const toggle = () => {
    expanded = !expanded;
    detail.style.display = expanded ? '' : 'none';
    row.classList.toggle('is-expanded', expanded);
    if (expanded && detail.childElementCount === 0) renderEndpointDetail(detail, entry, servers, tryItOut);
  };

  row.addEventListener('click', toggle);
  row.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });
}

function renderEndpointDetail(
  detail: HTMLElement, entry: EndpointEntry,
  servers: Array<{ url: string }>, tryItOut: boolean,
): void {
  if (entry.op.description) {
    detail.createEl('p', { cls: 'docflow-api-op-desc', text: entry.op.description });
  }

  const params = entry.op.parameters ?? [];
  renderParams(detail, params);

  if (entry.op.requestBody) {
    renderRequestBody(detail, entry.op.requestBody);
  }

  if (entry.op.responses && Object.keys(entry.op.responses).length > 0) {
    renderResponses(detail, entry.op.responses);
  }

  if (tryItOut) {
    buildTryItOut(detail, entry.method, entry.path, entry.op, servers);
  }
}

// ── Tag group ─────────────────────────────────────────────────────────────────

function renderTagGroup(
  el: HTMLElement, tag: string, endpoints: EndpointEntry[],
  servers: Array<{ url: string }>, tryItOut: boolean,
): void {
  const group = el.createEl('div', { cls: 'docflow-api-group' });
  const header = group.createEl('div', {
    cls: 'docflow-api-group-header',
    attr: { role: 'button', tabindex: '0' },
  });
  header.createEl('span', { cls: 'docflow-api-group-chevron', text: '▶' });
  header.createEl('span', { cls: 'docflow-api-group-tag', text: tag });
  header.createEl('span', { cls: 'docflow-api-group-count', text: String(endpoints.length) });

  const body = group.createEl('div', { cls: 'docflow-api-group-body' });
  body.style.display = 'none';

  let open = false;
  const toggle = () => {
    open = !open;
    body.style.display = open ? '' : 'none';
    header.classList.toggle('is-open', open);
    header.querySelector('.docflow-api-group-chevron')!.textContent = open ? '▼' : '▶';
  };

  header.addEventListener('click', toggle);
  header.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });

  for (const entry of endpoints) {
    renderEndpoint(body, entry, servers, tryItOut);
  }
}

// ── ApiRenderer ───────────────────────────────────────────────────────────────

export class ApiRenderer {
  static isApiSpec(source: string): boolean {
    return /^(openapi|swagger)\s*:/m.test(source.trim());
  }

  render(source: string, el: HTMLElement, tryItOut: boolean): void {
    el.empty();
    const container = el.createEl('div', { cls: 'docflow-api-container' });

    let spec: OasSpec;
    try {
      spec = parseSpec(source);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      container.createEl('p', { cls: 'docflow-api-error', text: `OpenAPI 파싱 실패: ${msg}` });
      return;
    }

    const version = getOasVersion(spec);
    if (!version.startsWith('3.') && !version.startsWith('2.')) {
      container.createEl('p', {
        cls: 'docflow-api-error',
        text: `지원하지 않는 OpenAPI 버전: "${version || '(없음)'}". openapi: 3.x 또는 swagger: 2.x 필요.`,
      });
      return;
    }

    buildHeader(container, spec, version, tryItOut);

    const body = container.createEl('div', { cls: 'docflow-api-body' });
    const servers = (spec.servers as Array<{ url: string }> | undefined) ?? [];
    const groups = collectEndpoints(spec);

    if (groups.size === 0) {
      body.createEl('p', { cls: 'docflow-api-empty', text: 'No endpoints defined.' });
      return;
    }

    for (const [tag, endpoints] of groups) {
      renderTagGroup(body, tag, endpoints, servers, tryItOut);
    }
  }

  onunload(): void {}
}
