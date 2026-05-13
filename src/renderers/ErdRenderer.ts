import mermaid from 'mermaid';
import { sanitizeHTMLToDom } from 'obsidian';

// ── Internal types ─────────────────────────────────────────────────────────────

interface EntityField {
  typeName: string;
  fieldName: string;
  key: string;   // 'PK' | 'FK' | 'UK' | 'PK,FK' | ''
  comment: string;
}

interface Entity {
  name: string;
  fields: EntityField[];
}

// ── Module-level state (reset in onunload) ─────────────────────────────────────

let currentMermaidTheme: 'dark' | 'default' | null = null;
let renderIdCounter = 0;

// ── Mermaid init ───────────────────────────────────────────────────────────────

export function syncMermaidTheme(): void {
  const isDark = activeDocument.body.classList.contains('theme-dark');
  const theme: 'dark' | 'default' = isDark ? 'dark' : 'default';
  if (currentMermaidTheme === theme) return;

  mermaid.initialize({
    startOnLoad: false,
    theme,
    securityLevel: 'strict',
    fontFamily:
      getComputedStyle(activeDocument.body).getPropertyValue('--font-text').trim() ||
      'sans-serif',
  });
  currentMermaidTheme = theme;
}

// ── ERD source parser ──────────────────────────────────────────────────────────

function parseEntities(source: string): Entity[] {
  const entities: Entity[] = [];
  // ENTITY_NAME { ... }  — erDiagram 엔티티 블록
  const blockRe = /\b(\w+)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(source)) !== null) {
    // 예약어 건너뜀
    if (match[1] === 'erDiagram') continue;

    const fields: EntityField[] = [];
    for (const rawLine of match[2].split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      // type  name  [PK|FK|UK|PK,FK]  ["comment"]
      const m = line.match(
        /^(\S+)\s+(\S+)(?:\s+(PK,FK|PK|FK|UK))?(?:\s+"([^"]*)")?/i,
      );
      if (!m) continue;
      fields.push({
        typeName: m[1],
        fieldName: m[2],
        key: (m[3] ?? '').toUpperCase(),
        comment: m[4] ?? '',
      });
    }
    entities.push({ name: match[1], fields });
  }

  return entities;
}

// ── Table view ─────────────────────────────────────────────────────────────────

function buildTableView(entities: Entity[]): HTMLElement {
  const wrap = activeDocument.createElement('div');
  wrap.className = 'docflow-erd-tables';

  if (entities.length === 0) {
    const p = wrap.createEl('p', { cls: 'docflow-erd-empty' });
    p.textContent = '파싱된 엔티티가 없습니다.';
    return wrap;
  }

  for (const entity of entities) {
    const section = wrap.createEl('div', { cls: 'docflow-entity' });
    section.createEl('h4', { cls: 'docflow-entity-name', text: entity.name });

    if (entity.fields.length === 0) continue;

    const table = section.createEl('table', { cls: 'docflow-entity-table' });
    const hRow = table.createTHead().insertRow();
    for (const label of ['컬럼', '타입', '제약']) {
      const th = activeDocument.createElement('th');
      th.textContent = label;
      hRow.appendChild(th);
    }

    const tbody = table.createTBody();
    for (const field of entity.fields) {
      const row = tbody.insertRow();
      row.insertCell().textContent = field.fieldName;
      row.insertCell().textContent = field.typeName;

      const keyCell = row.insertCell();
      if (field.key) {
        keyCell.createEl('span', {
          cls: `docflow-key-badge docflow-key-badge--${field.key.toLowerCase().replace(',', '-')}`,
          text: field.key,
        });
      }
    }
  }

  return wrap;
}

// ── Zoom & drag (pointer capture — document-level 리스너 불필요) ──────────────

function setupZoomDrag(
  viewport: HTMLElement,
  diagramView: HTMLElement,
): { zoomBy: (factor: number) => void; reset: () => void } {
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const apply = () => {
    viewport.setCssProps({ '--docflow-erd-transform': `translate(${tx}px, ${ty}px) scale(${scale})` });
  };

  // 스크롤 휠 줌 — passive: false 로 preventDefault 가능
  diagramView.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      e.preventDefault();
      scale = Math.min(Math.max(scale * (e.deltaY < 0 ? 1.1 : 0.9), 0.2), 6);
      apply();
    },
    { passive: false },
  );

  // 드래그 — setPointerCapture 로 document 이벤트 등록 없이 처리
  viewport.addEventListener('pointerdown', (e: PointerEvent) => {
    viewport.setPointerCapture(e.pointerId);
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    viewport.addClass('is-dragging');
  });

  viewport.addEventListener('pointermove', (e: PointerEvent) => {
    if (!dragging) return;
    tx += e.clientX - lastX;
    ty += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    apply();
  });

  viewport.addEventListener('pointerup', () => {
    dragging = false;
    viewport.removeClass('is-dragging');
  });

  return {
    zoomBy: (factor: number) => {
      scale = Math.min(Math.max(scale * factor, 0.2), 6);
      apply();
    },
    reset: () => {
      scale = 1;
      tx = 0;
      ty = 0;
      apply();
    },
  };
}

// ── Export helpers ─────────────────────────────────────────────────────────────

function triggerDownload(url: string, fileName: string): void {
  const a = activeDocument.createElement('a');
  a.href = url;
  a.download = fileName;
  activeDocument.body.appendChild(a);
  a.click();
  activeDocument.body.removeChild(a);
}

function downloadSvg(svgEl: SVGSVGElement, fileName: string): void {
  const data = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${fileName}.svg`);
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function downloadPng(svgEl: SVGSVGElement, fileName: string): Promise<void> {
  const data = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('SVG 이미지 로드 실패'));
    img.src = svgUrl;
  });
  URL.revokeObjectURL(svgUrl);

  const pad = 24;
  const vb = svgEl.viewBox.baseVal;
  const w = (vb.width || img.naturalWidth) + pad * 2;
  const h = (vb.height || img.naturalHeight) + pad * 2;

  const canvas = activeDocument.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const bg =
    getComputedStyle(activeDocument.body).getPropertyValue('--background-primary').trim() ||
    '#ffffff';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, pad, pad);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const pngUrl = URL.createObjectURL(blob);
    triggerDownload(pngUrl, `${fileName}.png`);
    window.setTimeout(() => URL.revokeObjectURL(pngUrl), 10_000);
  }, 'image/png');
}

// ── ErdRenderer ───────────────────────────────────────────────────────────────

export class ErdRenderer {
  /** renderers/index.ts 라우터가 어떤 렌더러를 호출할지 결정할 때 사용 */
  static isErd(source: string): boolean {
    return /\berDiagram\b/.test(source);
  }

  /**
   * mermaid 코드블록을 ERD 전용 뷰로 렌더링한다.
   * renderers/index.ts 의 registerMarkdownCodeBlockProcessor 콜백에서 호출된다.
   */
  async render(source: string, el: HTMLElement): Promise<void> {
    el.empty();
    syncMermaidTheme();

    const container = el.createEl('div', { cls: 'docflow-erd-container' });

    // ── 탭 바 ─────────────────────────────────────────────────────────────────
    const tabBar = container.createEl('div', { cls: 'docflow-erd-tab-bar' });
    const tabGroup = tabBar.createEl('div', { cls: 'docflow-erd-tabs' });

    const btnDiagram = tabGroup.createEl('button', {
      cls: 'docflow-erd-tab is-active',
      text: '다이어그램',
      attr: { 'aria-pressed': 'true' },
    });
    const btnTable = tabGroup.createEl('button', {
      cls: 'docflow-erd-tab',
      text: '테이블',
      attr: { 'aria-pressed': 'false' },
    });

    const actions = tabBar.createEl('div', { cls: 'docflow-erd-actions' });
    const mkBtn = (text: string, label: string) =>
      actions.createEl('button', {
        cls: 'docflow-erd-action-btn',
        text,
        attr: { 'aria-label': label },
      });

    const btnZoomIn  = mkBtn('+',  '확대');
    const btnZoomOut = mkBtn('−',  '축소');
    const btnReset   = mkBtn('↺',  '원래 크기');
    const btnPng     = mkBtn('PNG', 'PNG 다운로드');
    const btnSvg     = mkBtn('SVG', 'SVG 다운로드');

    // ── 뷰 영역 ───────────────────────────────────────────────────────────────
    const diagramView = container.createEl('div', { cls: 'docflow-erd-diagram-view' });
    const viewport    = diagramView.createEl('div', { cls: 'docflow-erd-viewport' });

    const tableView = container.createEl('div', { cls: 'docflow-erd-table-view' });
    tableView.hide();

    // ── Mermaid 렌더링 ────────────────────────────────────────────────────────
    let svgEl: SVGSVGElement | null = null;
    try {
      const id = `docflow-erd-${(++renderIdCounter).toString(36)}`;
      const { svg } = await mermaid.render(id, source);
      viewport.appendChild(sanitizeHTMLToDom(svg));
      svgEl = viewport.querySelector<SVGSVGElement>('svg');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      container.createEl('p', { cls: 'docflow-erd-error', text: `ERD 렌더링 실패: ${msg}` });
      return;
    }

    // ── 테이블 뷰 구성 ────────────────────────────────────────────────────────
    tableView.appendChild(buildTableView(parseEntities(source)));

    // ── 줌 & 드래그 ───────────────────────────────────────────────────────────
    const zoom = setupZoomDrag(viewport, diagramView);
    btnZoomIn.addEventListener('click',  () => zoom.zoomBy(1.2));
    btnZoomOut.addEventListener('click', () => zoom.zoomBy(1 / 1.2));
    btnReset.addEventListener('click',   () => zoom.reset());

    // ── 다운로드 ─────────────────────────────────────────────────────────────
    const fileName = (): string => {
      const path = el.closest('[data-path]')?.getAttribute('data-path') ?? 'erd';
      return path.replace(/\.[^.]+$/, '').split('/').pop() ?? 'erd';
    };

    btnPng.addEventListener('click', () => { if (svgEl) void downloadPng(svgEl, fileName()); });
    btnSvg.addEventListener('click', () => { if (svgEl) downloadSvg(svgEl, fileName()); });

    // ── 탭 전환 ───────────────────────────────────────────────────────────────
    const activate = (showDiagram: boolean) => {
      if (showDiagram) {
        diagramView.show(); tableView.hide();
        btnDiagram.classList.add('is-active');
        btnDiagram.setAttribute('aria-pressed', 'true');
        btnTable.classList.remove('is-active');
        btnTable.setAttribute('aria-pressed', 'false');
      } else {
        diagramView.hide(); tableView.show();
        btnTable.classList.add('is-active');
        btnTable.setAttribute('aria-pressed', 'true');
        btnDiagram.classList.remove('is-active');
        btnDiagram.setAttribute('aria-pressed', 'false');
      }
    };

    btnDiagram.addEventListener('click', () => activate(true));
    btnTable.addEventListener('click',   () => activate(false));
  }

  /**
   * 플러그인의 onunload() 에서 반드시 호출해야 한다.
   * 모듈 수준 상태를 초기화해 다음 로드 시 깨끗한 상태를 보장한다.
   */
  onunload(): void {
    currentMermaidTheme = null;
    renderIdCounter = 0;
  }
}
