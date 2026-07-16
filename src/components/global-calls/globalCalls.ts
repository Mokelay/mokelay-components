import { createApp, type App as VueApp } from 'vue';
import GlobalCallHost from '@/components/global-calls/GlobalCallHost.vue';
import {
  $remote,
  $schema,
  type RemoteFunction,
  type SchemaFunction
} from '@/datasource/datasource';
import type { StoredBlock } from '@/blocks/storedBlocks';

export type { StoredBlock } from '@/blocks/storedBlocks';
export { $remote, $schema } from '@/datasource/datasource';

export type GlobalCallContent = string | StoredBlock[];
export type MessageType = 'success' | 'warning' | 'info' | 'error';

export type AlertOptions = {
  title: string;
  content: GlobalCallContent;
};

export type ConfirmOptions = {
  title: string;
  content: GlobalCallContent;
};

export type MessageOptions = {
  type: MessageType;
  content: GlobalCallContent;
};

export type AlertFunction = {
  (title: string, content: GlobalCallContent): Promise<void>;
  (options: AlertOptions): Promise<void>;
};

export type ConfirmFunction = {
  (title: string, content: GlobalCallContent): Promise<boolean>;
  (options: ConfirmOptions): Promise<boolean>;
};

export type MessageFunction = {
  (type: MessageType, content: GlobalCallContent): Promise<void>;
  (options: MessageOptions): Promise<void>;
};

export type GlobalCallFunctions = {
  $alert: AlertFunction;
  $confirm: ConfirmFunction;
  $message: MessageFunction;
  $remote: RemoteFunction;
  $schema: SchemaFunction;
};

type GlobalCallHostHandle = {
  showAlert(options: AlertOptions): Promise<void>;
  showConfirm(options: ConfirmOptions): Promise<boolean>;
  showMessage(options: MessageOptions): Promise<void>;
};

const messageTypes = new Set<MessageType>(['success', 'warning', 'info', 'error']);

let hostApp: VueApp<Element> | null = null;
let host: GlobalCallHostHandle | null = null;
let hostContainer: HTMLElement | null = null;

export const $alert = (function alert(first: string | AlertOptions, content?: GlobalCallContent) {
  return runWithHost((globalCallHost) => globalCallHost.showAlert(normalizeDialogOptions(first, content)));
}) as AlertFunction;

export const $confirm = (function confirm(first: string | ConfirmOptions, content?: GlobalCallContent) {
  return runWithHost((globalCallHost) => globalCallHost.showConfirm(normalizeDialogOptions(first, content)));
}) as ConfirmFunction;

export const $message = (function message(first: MessageType | MessageOptions, content?: GlobalCallContent) {
  return runWithHost((globalCallHost) => globalCallHost.showMessage(normalizeMessageOptions(first, content)));
}) as MessageFunction;

export function installGlobalCalls(app: VueApp) {
  app.config.globalProperties.$alert = $alert;
  app.config.globalProperties.$confirm = $confirm;
  app.config.globalProperties.$message = $message;
  app.config.globalProperties.$remote = $remote;
  app.config.globalProperties.$schema = $schema;
  registerWindowGlobalCalls();
}

export const globalCallsPlugin = {
  install: installGlobalCalls
};

export function registerWindowGlobalCalls() {
  if (typeof window === 'undefined') {
    return;
  }

  const globalWindow = window as Window & GlobalCallFunctions;
  globalWindow.$alert = $alert;
  globalWindow.$confirm = $confirm;
  globalWindow.$message = $message;
  globalWindow.$remote = $remote;
  globalWindow.$schema = $schema;
}

function runWithHost<T>(callback: (globalCallHost: GlobalCallHostHandle) => Promise<T>) {
  try {
    return callback(ensureHost());
  } catch (error) {
    return Promise.reject(error);
  }
}

function ensureHost() {
  if (host) {
    return host;
  }

  if (typeof document === 'undefined') {
    throw new Error('Global call functions require a browser document.');
  }

  hostContainer = document.createElement('div');
  hostContainer.setAttribute('data-testid', 'global-call-host-container');
  document.body.appendChild(hostContainer);
  hostApp = createApp(GlobalCallHost);
  host = hostApp.mount(hostContainer) as unknown as GlobalCallHostHandle;

  return host;
}

function normalizeDialogOptions(first: string | AlertOptions | ConfirmOptions, content?: GlobalCallContent): AlertOptions {
  if (typeof first === 'object' && first !== null) {
    return {
      title: String(first.title ?? ''),
      content: normalizeContent(first.content)
    };
  }

  return {
    title: first,
    content: normalizeContent(content)
  };
}

function normalizeMessageOptions(first: MessageType | MessageOptions, content?: GlobalCallContent): MessageOptions {
  if (typeof first === 'object' && first !== null) {
    return {
      type: normalizeMessageType(first.type),
      content: normalizeContent(first.content)
    };
  }

  return {
    type: normalizeMessageType(first),
    content: normalizeContent(content)
  };
}

function normalizeContent(content?: GlobalCallContent): GlobalCallContent {
  if (typeof content === 'string' || Array.isArray(content)) {
    return content;
  }

  return '';
}

function normalizeMessageType(type: unknown): MessageType {
  if (messageTypes.has(type as MessageType)) {
    return type as MessageType;
  }

  return 'info';
}

export function unmountGlobalCallHost() {
  hostApp?.unmount();
  hostContainer?.remove();
  hostApp = null;
  host = null;
  hostContainer = null;
}
