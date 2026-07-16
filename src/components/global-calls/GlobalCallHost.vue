<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { useI18n } from '@/i18n';
import GlobalCallContentRenderer from '@/components/global-calls/GlobalCallContentRenderer.vue';
import type {
  AlertOptions,
  ConfirmOptions,
  GlobalCallContent,
  MessageOptions,
  MessageType
} from '@/components/global-calls/globalCalls';

type AlertDialogRequest = {
  id: number;
  kind: 'alert';
  title: string;
  content: GlobalCallContent;
  resolve: () => void;
};

type ConfirmDialogRequest = {
  id: number;
  kind: 'confirm';
  title: string;
  content: GlobalCallContent;
  resolve: (confirmed: boolean) => void;
};

type DialogRequest = AlertDialogRequest | ConfirmDialogRequest;

type MessageRequest = {
  id: number;
  type: MessageType;
  content: GlobalCallContent;
  resolve: () => void;
};

const DEFAULT_MESSAGE_DURATION = 3000;

const { t } = useI18n();
const dialogPanelRef = ref<HTMLElement | null>(null);
const dialogQueue = ref<DialogRequest[]>([]);
const activeDialog = ref<DialogRequest | null>(null);
const messages = ref<MessageRequest[]>([]);
const messageTimers = new Map<number, number>();
let nextRequestId = 0;

const activeDialogTitleId = computed(() => (
  activeDialog.value ? `global-call-dialog-title-${activeDialog.value.id}` : undefined
));

function showAlert(options: AlertOptions) {
  return new Promise<void>((resolve) => {
    dialogQueue.value.push({
      id: createRequestId(),
      kind: 'alert',
      title: options.title,
      content: options.content,
      resolve
    });
    openNextDialog();
  });
}

function showConfirm(options: ConfirmOptions) {
  return new Promise<boolean>((resolve) => {
    dialogQueue.value.push({
      id: createRequestId(),
      kind: 'confirm',
      title: options.title,
      content: options.content,
      resolve
    });
    openNextDialog();
  });
}

function showMessage(options: MessageOptions) {
  return new Promise<void>((resolve) => {
    const id = createRequestId();
    const message = {
      id,
      type: options.type,
      content: options.content,
      resolve
    };

    messages.value = [...messages.value, message];
    messageTimers.set(id, window.setTimeout(() => {
      closeMessage(id);
    }, DEFAULT_MESSAGE_DURATION));
  });
}

function createRequestId() {
  nextRequestId += 1;
  return nextRequestId;
}

function openNextDialog() {
  if (activeDialog.value || !dialogQueue.value.length) {
    return;
  }

  activeDialog.value = dialogQueue.value.shift() ?? null;
  nextTick(() => {
    dialogPanelRef.value?.focus();
  });
}

function closeDialog(confirmed: boolean) {
  const dialog = activeDialog.value;
  if (!dialog) {
    return;
  }

  activeDialog.value = null;

  if (dialog.kind === 'confirm') {
    dialog.resolve(confirmed);
  } else {
    dialog.resolve();
  }

  nextTick(() => {
    openNextDialog();
  });
}

function closeMessage(id: number) {
  const message = messages.value.find((item) => item.id === id);
  if (!message) {
    return;
  }

  const timer = messageTimers.get(id);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    messageTimers.delete(id);
  }

  messages.value = messages.value.filter((item) => item.id !== id);
  message.resolve();
}

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') {
    return;
  }

  event.preventDefault();
  closeDialog(false);
}

function getDialogAriaLabel() {
  return activeDialog.value?.kind === 'confirm'
    ? t('globalCalls.confirmRoleLabel')
    : t('globalCalls.alertRoleLabel');
}

function getMessageClass(type: MessageType) {
  return `global-call-message--${type}`;
}

onBeforeUnmount(() => {
  messageTimers.forEach((timer) => {
    window.clearTimeout(timer);
  });
  messageTimers.clear();
});

defineExpose({
  showAlert,
  showConfirm,
  showMessage
});
</script>

<template>
  <div class="global-call-host" data-testid="global-call-host">
    <div
      v-if="activeDialog"
      class="global-call-dialog-overlay"
      data-testid="global-call-dialog-overlay"
    >
      <section
        ref="dialogPanelRef"
        class="global-call-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="getDialogAriaLabel()"
        :aria-labelledby="activeDialogTitleId"
        tabindex="-1"
        :data-testid="`global-call-${activeDialog.kind}`"
        @keydown="handleDialogKeydown"
      >
        <h2 :id="activeDialogTitleId" class="global-call-dialog__title" data-testid="global-call-dialog-title">
          {{ activeDialog.title }}
        </h2>

        <div class="global-call-dialog__body" data-testid="global-call-dialog-content">
          <GlobalCallContentRenderer :content="activeDialog.content" />
        </div>

        <div class="global-call-dialog__actions">
          <button
            v-if="activeDialog.kind === 'confirm'"
            type="button"
            class="global-call-dialog__button global-call-dialog__button--secondary"
            data-testid="global-call-cancel"
            @click="closeDialog(false)"
          >
            {{ t('globalCalls.cancel') }}
          </button>
          <button
            type="button"
            class="global-call-dialog__button global-call-dialog__button--primary"
            data-testid="global-call-ok"
            @click="closeDialog(true)"
          >
            {{ t('globalCalls.ok') }}
          </button>
        </div>
      </section>
    </div>

    <div
      v-if="messages.length"
      class="global-call-message-stack"
      data-testid="global-call-message-stack"
      :aria-label="t('globalCalls.messageRoleLabel')"
    >
      <div
        v-for="message in messages"
        :key="message.id"
        class="global-call-message"
        :class="getMessageClass(message.type)"
        role="status"
        :data-type="message.type"
        data-testid="global-call-message"
      >
        <GlobalCallContentRenderer :content="message.content" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.global-call-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgb(15 23 42 / 0.52);
}

.global-call-dialog {
  width: min(100%, 420px);
  max-height: min(80vh, 640px);
  overflow: auto;
  border: 1px solid rgb(226 232 240);
  border-radius: 12px;
  background: rgb(255 255 255);
  box-shadow: 0 24px 80px rgb(15 23 42 / 0.28);
  color: rgb(15 23 42);
  outline: none;
}

.global-call-dialog__title {
  margin: 0;
  padding: 20px 20px 0;
  color: rgb(15 23 42);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
}

.global-call-dialog__body {
  padding: 14px 20px 20px;
  color: rgb(51 65 85);
  font-size: 14px;
  line-height: 1.6;
}

.global-call-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid rgb(226 232 240);
  padding: 14px 20px;
}

.global-call-dialog__button {
  min-width: 72px;
  border: 0;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  cursor: pointer;
}

.global-call-dialog__button:focus-visible {
  outline: 2px solid rgb(129 140 248);
  outline-offset: 2px;
}

.global-call-dialog__button--primary {
  background: rgb(79 70 229);
  color: rgb(255 255 255);
}

.global-call-dialog__button--primary:hover {
  background: rgb(67 56 202);
}

.global-call-dialog__button--secondary {
  background: rgb(226 232 240);
  color: rgb(51 65 85);
}

.global-call-dialog__button--secondary:hover {
  background: rgb(203 213 225);
}

.global-call-message-stack {
  position: fixed;
  top: 18px;
  left: 50%;
  z-index: 1400;
  display: flex;
  width: min(92vw, 520px);
  transform: translateX(-50%);
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.global-call-message {
  max-width: 100%;
  border: 1px solid rgb(226 232 240);
  border-radius: 10px;
  background: rgb(255 255 255);
  box-shadow: 0 16px 48px rgb(15 23 42 / 0.16);
  padding: 10px 14px;
  color: rgb(15 23 42);
  font-size: 14px;
  line-height: 1.6;
  pointer-events: auto;
}

.global-call-message--success {
  border-color: rgb(187 247 208);
  background: rgb(240 253 244);
  color: rgb(22 101 52);
}

.global-call-message--warning {
  border-color: rgb(254 240 138);
  background: rgb(254 252 232);
  color: rgb(133 77 14);
}

.global-call-message--info {
  border-color: rgb(191 219 254);
  background: rgb(239 246 255);
  color: rgb(30 64 175);
}

.global-call-message--error {
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(153 27 27);
}

.dark .global-call-dialog {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .global-call-dialog__title {
  color: rgb(241 245 249);
}

.dark .global-call-dialog__body {
  color: rgb(203 213 225);
}

.dark .global-call-dialog__actions {
  border-top-color: rgb(51 65 85);
}

.dark .global-call-dialog__button--secondary {
  background: rgb(51 65 85);
  color: rgb(241 245 249);
}

.dark .global-call-dialog__button--secondary:hover {
  background: rgb(71 85 105);
}

.dark .global-call-message {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

@media (max-width: 640px) {
  .global-call-dialog-overlay {
    align-items: flex-end;
    padding: 16px;
  }

  .global-call-dialog {
    width: 100%;
    max-height: 86vh;
  }
}
</style>
