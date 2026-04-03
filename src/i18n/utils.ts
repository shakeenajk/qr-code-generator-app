// src/i18n/utils.ts
// Source: https://docs.astro.build/en/recipes/i18n/
import { ui, defaultLang, type UiKeys } from './ui';

export function getLangFromUrl(url: URL): keyof typeof ui {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: UiKeys): string {
    return (ui[lang] as Record<string, string>)[key] ?? ui[defaultLang][key];
  };
}

export function getLocalizedHref(path: string, lang: keyof typeof ui): string {
  if (lang === defaultLang) return path;
  return `/${lang}${path}`;
}
