import type { LayoutBlock, MokelayLayout } from '@/layouts/domain';
import { languageValue } from '@/runtime/globalSettingsRuntime';
import {
  isLocalizedValue,
  normalizePageLocaleConfig,
  resolveLocalizedTree,
  resolveLocalizedValue,
  type LocalizedTextValue,
  type MissingTranslation
} from '@/runtime/localization';

export function getLayoutRuntimeLocale() {
  return languageValue.value === 'en' ? 'en-US' : 'zh-CN';
}

export function resolveLayoutText(value: LocalizedTextValue | unknown, layout?: Pick<MokelayLayout, 'localeConfig'>) {
  return resolveLocalizedValue(value, getLayoutRuntimeLocale(), normalizePageLocaleConfig(layout?.localeConfig));
}

export function resolveLayoutLocalizedTree(value: unknown, layout: Pick<MokelayLayout, 'localeConfig'>) {
  return resolveLocalizedTree(value, {
    locale: getLayoutRuntimeLocale(),
    localeConfig: normalizePageLocaleConfig(layout.localeConfig)
  });
}

export function collectMissingLayoutTranslations(layout: Pick<MokelayLayout, 'localeConfig' | 'blocks' | 'resources'>) {
  const config = normalizePageLocaleConfig(layout.localeConfig);
  const issues: MissingTranslation[] = [];

  collectLocalizedNodes(layout.resources, 'resources', 'layout-resources', undefined, config.supportedLocales, issues);
  for (const block of layout.blocks ?? []) {
    collectBlockTranslations(block, config.supportedLocales, issues);
  }
  return issues;
}

function collectBlockTranslations(block: LayoutBlock, locales: string[], issues: MissingTranslation[], prefix = '') {
  collectLocalizedNodes(block.data, `${prefix}data`, block.type, block.id, locales, issues);
  for (const [slotName, blocks] of Object.entries(block.slots ?? {})) {
    blocks.forEach((child, index) => {
      collectBlockTranslations(child, locales, issues, `${prefix}slots.${slotName}[${index}].`);
    });
  }
}

function collectLocalizedNodes(
  value: unknown,
  path: string,
  blockType: string,
  blockId: string | undefined,
  locales: string[],
  issues: MissingTranslation[]
) {
  if (isLocalizedValue(value)) {
    for (const locale of locales) {
      if (!value.$i18n[locale]?.trim()) issues.push({ blockId, blockType, path, locale });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectLocalizedNodes(item, `${path}[${index}]`, blockType, blockId, locales, issues));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, item] of Object.entries(value)) {
    collectLocalizedNodes(item, path ? `${path}.${key}` : key, blockType, blockId, locales, issues);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
