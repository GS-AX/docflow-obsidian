import { en, type Translations } from './i18n/en';
import { ko } from './i18n/ko';

export type Language = 'auto' | 'en' | 'ko';

// ── 언어 getter (main.ts 에서 settings 참조 주입) ─────────────────────────────

let _getLanguage: () => Language = () => 'auto';

export function initI18n(getLanguage: () => Language): void {
  _getLanguage = getLanguage;
}

/** 현재 적용 중인 언어를 'en' | 'ko' 로 반환한다. */
export function getCurrentLang(): 'en' | 'ko' {
  const lang = _getLanguage();
  if (lang !== 'auto') return lang;
  return navigator.language.startsWith('ko') ? 'ko' : 'en';
}

function getTranslations(): Translations {
  return getCurrentLang() === 'ko' ? ko : en;
}

// ── 번역 함수 ─────────────────────────────────────────────────────────────────

/** 키에 해당하는 번역 문자열을 반환한다. */
export function t(key: keyof Translations): string {
  return getTranslations()[key] as string;
}

/**
 * `{0}`, `{1}` … 플레이스홀더를 args 로 치환한다.
 *
 * @example
 * tf('openItem', entry.title)   // 'Open Foo' | 'Foo 열기'
 * tf('countItems', '42')        // '42 items' | '42개'
 */
export function tf(key: keyof Translations, ...args: string[]): string {
  let s = t(key);
  args.forEach((arg, i) => {
    s = s.replace(`{${i}}`, arg);
  });
  return s;
}
