<script lang="ts">
import { i18n } from '@/i18n';

export interface MLinkProps {
  edit: boolean;
  text?: string;
  url?: string;
  open?: boolean;
}

function trimmedString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@/i18n';

const props = defineProps<MLinkProps & {
  onChange?: (payload: MLinkProps) => void;
  onToolChange?: (payload: MLinkProps) => void;
}>();

const { t } = useI18n();
const linkText = computed(() => trimmedString(props.text, t('link.defaultText')));
const safeHref = computed(() => normalizeHref(props.url ?? ''));
const target = computed(() => (props.open ? '_blank' : undefined));
const rel = computed(() => (props.open ? 'noopener noreferrer' : undefined));
function normalizeHref(url: string) {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return '#';

  if (trimmedUrl.startsWith('//')) {
    return `https:${trimmedUrl}`;
  }

  const protocolMatch = trimmedUrl.match(/^([a-z][a-z\d+.-]*):/i);
  if (!protocolMatch) {
    return trimmedUrl;
  }

  const protocol = protocolMatch[1].toLowerCase();
  return ['http', 'https', 'mailto', 'tel'].includes(protocol) ? trimmedUrl : '#';
}

function emitChange(payload: Partial<MLinkProps>) {
  const nextPayload = {
    edit: props.edit,
    text: props.text ?? '',
    url: props.url ?? '',
    open: props.open ?? false,
    ...payload
  };
  props.onToolChange?.(nextPayload);
  props.onChange?.(nextPayload);
}

function handleClick(event: MouseEvent) {
  if (props.edit || safeHref.value === '#') {
    event.preventDefault();
  }

  emitChange({
    text: linkText.value,
    url: props.url ?? '',
    open: props.open ?? false
  });
}

</script>

<template>
  <span class="mokelay-link" data-testid="editor-link-tool">
    <a
      class="mokelay-link__anchor"
      data-testid="editor-link-value"
      :href="safeHref"
      :target="target"
      :rel="rel"
      @click="handleClick"
    >
      {{ linkText }}
    </a>
  </span>
</template>

<style scoped>
.mokelay-link {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  min-height: 32px;
  vertical-align: middle;
}

.mokelay-link__anchor {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  color: rgb(37 99 235);
  font-size: 14px;
  line-height: 20px;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  overflow-wrap: anywhere;
}

.mokelay-link__anchor:hover {
  color: rgb(29 78 216);
}

.mokelay-link__anchor:focus-visible {
  outline: 2px solid rgb(96 165 250);
  outline-offset: 2px;
  border-radius: 4px;
}

.dark .mokelay-link__anchor {
  color: rgb(96 165 250);
}

.dark .mokelay-link__anchor:hover {
  color: rgb(147 197 253);
}
</style>
