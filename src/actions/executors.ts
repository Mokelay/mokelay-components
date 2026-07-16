import { $confirm } from '@/components/global-calls/globalCalls';
import { resolveDatasourceRuntimeData } from '@/datasource/runtime';
import type { MDatasourceApiObject } from '@/datasource/datasource';
import { showActionPageDialog } from '@/actions/dialogHost';
import type { ActionExecutor } from '@/actions/types';

function stringInput(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function booleanInput(value: unknown) {
  return value === true;
}

function datasourceInput(value: unknown) {
  return (typeof value === 'object' && value !== null ? value : {}) as MDatasourceApiObject;
}

function numberInput(value: unknown, fallback: number) {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim()
      ? Number(value)
      : fallback;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isFile(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

function fileInputs(value: unknown): File[] {
  if (isFile(value)) return [value];
  if (!Array.isArray(value)) return [];
  return value.filter(isFile);
}

function acceptInputs(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];
  return values
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getFileExtension(file: File) {
  const dotIndex = file.name.lastIndexOf('.');
  return dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : '';
}

function fileMatchesAccept(file: File, accept: string[]) {
  if (!accept.length) return true;

  const extension = getFileExtension(file);
  const mime = file.type.toLowerCase();
  return accept.some((item) => {
    if (item.startsWith('.')) return extension === item;
    if (item.endsWith('/*')) return mime.startsWith(item.slice(0, -1));
    return mime === item;
  });
}

function normalizeUploadedFile(file: File, patch: Record<string, unknown> = {}) {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    ...patch
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function mokelayFailureMessage(value: unknown) {
  const response = readRecord(value);
  if (response.ok !== false) return '';

  const error = readRecord(response.error);
  return stringInput(error.message) || '接口请求失败。';
}

function optionalRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function sourcePageAncestry(value: unknown): string[] {
  const source = readRecord(value);
  const ancestry = source._pageAncestry;
  if (!Array.isArray(ancestry)) return [];
  return ancestry
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function findCurrentPageBlockId(blocks: Record<string, Record<string, unknown>>) {
  return Object.entries(blocks).find(([, data]) => data?._blockType === 'MPage')?.[0] ?? '';
}

function firstStringPath(value: unknown, paths: string[]) {
  for (const path of paths) {
    const result = readPath(value, path);
    if (typeof result === 'string' && result.trim()) {
      return result.trim();
    }
  }

  return '';
}

function readPath(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((cursor, key) => (
    typeof cursor === 'object' && cursor !== null && key in cursor
      ? (cursor as Record<string, unknown>)[key]
      : undefined
  ), value);
}

function extractResponseUrl(value: unknown) {
  return firstStringPath(value, [
    'url',
    'fileUrl',
    'downloadUrl',
    'data.url',
    'data.fileUrl',
    'data.downloadUrl',
    'data.path',
    'result.url',
    'result.fileUrl'
  ]);
}

function normalizeRawResponse(value: unknown) {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    Array.isArray(value) ||
    (typeof value === 'object' && value !== null)
  ) {
    return value;
  }

  return {};
}

async function readResponsePayload(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.toLowerCase().includes('json')) {
    return await response.json() as unknown;
  }

  return await response.text();
}

async function uploadToEndpoint(file: File, endpoint: string, inputs: Record<string, unknown>) {
  const formData = new FormData();
  const fileField = stringInput(inputs.fileField) || 'file';
  formData.append(fileField, file);

  const extraFields = readRecord(inputs.fields);
  Object.entries(extraFields).forEach(([key, value]) => {
    if (!key) return;
    if (typeof value === 'string' || value instanceof Blob) {
      formData.append(key, value);
      return;
    }
    formData.append(key, JSON.stringify(value));
  });

  const response = await fetch(endpoint, {
    method: stringInput(inputs.method) || 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`.trim());
  }

  return await readResponsePayload(response);
}

function getDatasourceFileIndex(datasource: MDatasourceApiObject) {
  return datasource.bodyData.findIndex((item) => item.dataType === 'file');
}

async function uploadToDatasource(file: File, datasource: MDatasourceApiObject, state: Parameters<ActionExecutor>[0]['state']) {
  const fileIndex = getDatasourceFileIndex(datasource);
  const runtimeData = await resolveDatasourceRuntimeData(datasource, {
    bodyFiles: fileIndex >= 0 ? { [fileIndex]: file } : undefined,
    variableContext: {
      blocks: state.blocks
    }
  });
  return runtimeData.rawResponse;
}

async function uploadWithOssToken(file: File, inputs: Record<string, unknown>, state: Parameters<ActionExecutor>[0]['state']) {
  const tokenDatasource = datasourceInput(inputs.tokenDatasource);
  const tokenRuntimeData = await resolveDatasourceRuntimeData(tokenDatasource, {
    variableContext: {
      blocks: state.blocks
    }
  });
  const tokenResponse = tokenRuntimeData.rawResponse;
  const uploadUrl = firstStringPath(tokenResponse, ['uploadUrl', 'data.uploadUrl', 'result.uploadUrl']);
  if (!uploadUrl) {
    throw new Error('OSS token response is missing uploadUrl.');
  }

  const formData = new FormData();
  const tokenFields = readRecord(
    readPath(tokenResponse, 'fields') ??
    readPath(tokenResponse, 'data.fields') ??
    readPath(tokenResponse, 'result.fields')
  );
  Object.entries(tokenFields).forEach(([key, value]) => {
    if (!key) return;
    formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
  });
  formData.append(stringInput(inputs.fileField) || 'file', file);

  const response = await fetch(uploadUrl, {
    method: stringInput(inputs.method) || 'POST',
    body: formData
  });
  if (!response.ok) {
    throw new Error(`OSS upload failed: ${response.status} ${response.statusText}`.trim());
  }

  const responsePayload = await readResponsePayload(response).catch(() => ({}));
  const publicUrl = firstStringPath(tokenResponse, ['url', 'data.url', 'result.url']);
  return {
    uploadResponse: responsePayload,
    url: publicUrl
  };
}

/**
 * @clientActionDoc {
 *   "version": "1.0",
 *   "sourcePackage": "mokelay-components",
 *   "actionName": "execute_ds",
 *   "displayName": "执行数据源",
 *   "actionType": "action",
 *   "category": "data",
 *   "description": "执行 API 或数据源配置，解析响应并将匹配字段暴露给后续 Action。",
 *   "inputs": [{"key":"dsConfig","type":"MDatasourceApiObject","required":true,"supportsTemplate":true,"supportsProcessors":true,"description":"数据源请求配置。"}],
 *   "outputs": [{"key":"rawResponse","type":"unknown","description":"接口原始响应。"},{"key":"responses","type":"Record<string,unknown>","description":"按 schemaSelection 提取的字段。"}],
 *   "errors": [{"code":"DATASOURCE_REQUEST_FAILED","description":"数据源请求失败或返回 Mokelay 错误。"}],
 *   "config": [{"key":"dsConfig","type":"object","description":"支持变量模板和 Processor。"}],
 *   "nodeSchema": [],
 *   "runtime": [{"key":"sideEffect","value":true},{"key":"async","value":true},{"key":"failureMode","value":"throws"}],
 *   "examples": [{"action":{"uuid":"load","action":"execute_ds","inputs":{"dsConfig":"{{blocks.query.data}}"},"outputs":["rawResponse","responses"]}}]
 * }
 */
export const executeDatasourceAction: ActionExecutor = async ({ inputs, state }) => {
  const dsConfig = datasourceInput(inputs.dsConfig ?? inputs.value ?? inputs);
  const runtimeData = await resolveDatasourceRuntimeData(dsConfig, {
    variableContext: {
      blocks: state.blocks
    }
  });
  const failureMessage = mokelayFailureMessage(runtimeData.rawResponse);
  if (failureMessage) {
    throw new Error(failureMessage);
  }
  const responses = Object.fromEntries(
    runtimeData.schemaSelectionData.map((field) => [field.path, field.value])
  );
  const matchedOutputs = Object.fromEntries(
    runtimeData.matchingExternalFieldData.map((field) => [field.variable, field.value])
  );

  return {
    rawResponse: runtimeData.rawResponse,
    responses,
    ...matchedOutputs
  };
};

/**
 * @clientActionDoc {
 *   "version": "1.0",
 *   "sourcePackage": "mokelay-components",
 *   "actionName": "confirm",
 *   "displayName": "确认提示",
 *   "actionType": "action",
 *   "category": "ui",
 *   "description": "显示确认对话框，并等待用户选择。",
 *   "inputs": [{"key":"title","type":"string","required":false,"description":"对话框标题。"},{"key":"content","type":"string","required":false,"description":"确认内容。"}],
 *   "outputs": [{"key":"result","type":"boolean","description":"用户是否确认。"}],
 *   "errors": [],
 *   "config": [],
 *   "nodeSchema": [],
 *   "runtime": [{"key":"sideEffect","value":true},{"key":"async","value":true},{"key":"failureMode","value":"returns result"}],
 *   "examples": [{"action":{"uuid":"confirm","action":"confirm","inputs":{"title":"确认提交","content":"是否继续？"},"outputs":["result"]}}]
 * }
 */
export const confirmAction: ActionExecutor = async ({ inputs }) => {
  const result = await $confirm({
    title: stringInput(inputs.title),
    content: stringInput(inputs.content)
  });
  return { result };
};

/**
 * @clientActionDoc {
 *   "version": "1.0",
 *   "sourcePackage": "mokelay-components",
 *   "actionName": "open_dialog",
 *   "displayName": "打开页面弹窗",
 *   "actionType": "action",
 *   "category": "ui",
 *   "description": "加载指定页面并以弹窗方式打开，关闭时返回页面结果。",
 *   "inputs": [{"key":"title","type":"string","required":false,"description":"弹窗标题。"},{"key":"pageUUID","type":"string","required":true,"description":"页面 UUID。"},{"key":"pageSource","type":"user|system","required":false,"defaultValue":"user","description":"页面来源。"},{"key":"context","type":"object","required":false,"description":"传给弹窗页面的运行时上下文。"}],
 *   "outputs": [{"key":"close_result","type":"unknown","description":"页面关闭时返回的结果。"}],
 *   "errors": [{"code":"PAGE_NOT_FOUND","description":"目标页面不存在或读取失败。"}],
 *   "config": [],
 *   "nodeSchema": [],
 *   "runtime": [{"key":"sideEffect","value":true},{"key":"async","value":true},{"key":"failureMode","value":"throws"}],
 *   "examples": [{"action":{"uuid":"open","action":"open_dialog","inputs":{"title":"编辑","pageUUID":"page_settings","pageSource":"user"},"outputs":["close_result"]}}]
 * }
 */
export const openDialogAction: ActionExecutor = async ({ inputs, state }) => {
  const closeResult = await showActionPageDialog({
    title: stringInput(inputs.title),
    pageUUID: stringInput(inputs.pageUUID ?? inputs.pageUuid),
    pageSource: inputs.pageSource === 'system' ? 'system' : 'user',
    context: optionalRecord(inputs.context),
    ancestry: sourcePageAncestry(state.sourceBlock)
  });
  return {
    close_result: closeResult
  };
};

/**
 * @clientActionDoc {
 *   "version": "1.0",
 *   "sourcePackage": "mokelay-components",
 *   "actionName": "jump_url",
 *   "displayName": "跳转地址",
 *   "actionType": "action",
 *   "category": "navigation",
 *   "description": "跳转当前窗口或新窗口到指定 URL。",
 *   "inputs": [{"key":"url","type":"string","required":true,"supportsTemplate":true,"description":"目标地址。"},{"key":"openNew","type":"boolean","required":false,"defaultValue":false,"description":"是否新窗口打开。"}],
 *   "outputs": [],
 *   "errors": [],
 *   "config": [],
 *   "nodeSchema": [],
 *   "runtime": [{"key":"sideEffect","value":true},{"key":"async","value":false},{"key":"failureMode","value":"no-op without browser"}],
 *   "examples": [{"action":{"uuid":"go","action":"jump_url","inputs":{"url":"/settings","openNew":false}}}]
 * }
 */
export const jumpUrlAction: ActionExecutor = ({ inputs }) => {
  const url = stringInput(inputs.url);
  if (!url || typeof window === 'undefined') {
    return {};
  }

  if (booleanInput(inputs.openNew)) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return {};
  }

  window.location.href = url;
  return {};
};

/**
 * @clientActionDoc {
 *   "version": "1.0",
 *   "sourcePackage": "mokelay-components",
 *   "actionName": "call_block_method",
 *   "displayName": "调用 Block 方法",
 *   "actionType": "action",
 *   "category": "block",
 *   "description": "调用当前页面中指定 Block 实例的方法。",
 *   "inputs": [{"key":"blockId","type":"string","required":true,"description":"目标 Block ID。"},{"key":"method","type":"string","required":true,"description":"方法名称。"},{"key":"args","type":"unknown","required":false,"description":"方法参数。"}],
 *   "outputs": [{"key":"returnData","type":"unknown","description":"Block 方法返回值。"}],
 *   "errors": [{"code":"BLOCK_METHOD_FAILED","description":"目标 Block 或方法调用失败。"}],
 *   "config": [],
 *   "nodeSchema": [],
 *   "runtime": [{"key":"sideEffect","value":true},{"key":"async","value":true},{"key":"failureMode","value":"throws"}],
 *   "examples": [{"action":{"uuid":"refresh","action":"call_block_method","inputs":{"blockId":"table","method":"refresh"},"outputs":["returnData"]}}]
 * }
 */
export const callBlockMethodAction: ActionExecutor = async ({ config, inputs, callBlockMethod }) => {
  const blockId = stringInput(inputs.blockId);
  const method = stringInput(inputs.method);
  const hasArgs = Object.prototype.hasOwnProperty.call(inputs, 'args');
  const returnData = await callBlockMethod(blockId, method, {
    actionConfig: config,
    inputs,
    ...(hasArgs ? { args: inputs.args } : {})
  });
  return { returnData };
};

/**
 * @clientActionDoc {
 *   "version": "1.0",
 *   "sourcePackage": "mokelay-components",
 *   "actionName": "close_dialog",
 *   "displayName": "关闭页面弹窗",
 *   "actionType": "action",
 *   "category": "ui",
 *   "description": "关闭当前或指定页面弹窗，并可在关闭前要求用户确认。",
 *   "inputs": [{"key":"blockId","type":"string","required":false,"description":"目标页面 Block ID，缺省时使用当前页面。"},{"key":"reason","type":"string","required":false,"defaultValue":"success","description":"关闭原因。"},{"key":"result","type":"unknown","required":false,"description":"返回给打开弹窗 Action 的结果。"},{"key":"confirmBeforeClose","type":"boolean","required":false,"defaultValue":false,"description":"是否关闭前确认。"}],
 *   "outputs": [{"key":"closed","type":"boolean","description":"是否成功关闭。"},{"key":"reason","type":"string","description":"关闭原因。"},{"key":"result","type":"unknown","description":"关闭结果。"}],
 *   "errors": [],
 *   "config": [],
 *   "nodeSchema": [],
 *   "runtime": [{"key":"sideEffect","value":true},{"key":"async","value":true},{"key":"failureMode","value":"returns closed=false"}],
 *   "examples": [{"action":{"uuid":"close","action":"close_dialog","inputs":{"reason":"saved","result":{"ok":true}}}}]
 * }
 */
export const closeDialogAction: ActionExecutor = async ({ inputs, state, callBlockMethod }) => {
  const reason = stringInput(inputs.reason) || 'success';
  const blockId = stringInput(
    inputs.blockId ??
    inputs.pageUUID ??
    inputs.pageUuid ??
    inputs.pageId ??
    inputs.dialogId
  ) || findCurrentPageBlockId(state.blocks);
  const result = hasOwn(inputs, 'result') ? inputs.result : undefined;
  const closeResult = {
    reason,
    ...(result !== undefined ? { result } : {})
  };

  if (booleanInput(inputs.confirmBeforeClose)) {
    const confirmed = await $confirm({
      title: stringInput(inputs.confirmTitle) || '关闭弹窗',
      content: stringInput(inputs.confirmContent) || '确认关闭当前弹窗？'
    });
    if (!confirmed) {
      return {
        closed: false,
        reason,
        ...(result !== undefined ? { result } : {})
      };
    }
  }

  if (!blockId) {
    return {
      closed: false,
      reason,
      ...(result !== undefined ? { result } : {})
    };
  }

  await callBlockMethod(blockId, 'close', {
    inputs: {
      closeResult
    }
  });

  return {
    closed: true,
    reason,
    ...(result !== undefined ? { result } : {})
  };
};

/**
 * @clientActionDoc {
 *   "version": "1.0",
 *   "sourcePackage": "mokelay-components",
 *   "actionName": "upload_file",
 *   "displayName": "上传文件",
 *   "actionType": "action",
 *   "category": "file",
 *   "description": "将一个或多个文件上传到接口、数据源或 OSS Token 指定的存储。",
 *   "inputs": [{"key":"files","type":"File[]","required":true,"description":"待上传文件。"},{"key":"mode","type":"direct|oss-token","required":false,"defaultValue":"direct","description":"上传模式。"},{"key":"endpoint","type":"string","required":false,"description":"直接上传地址。"},{"key":"datasource","type":"object","required":false,"description":"数据源上传配置。"},{"key":"accept","type":"string|string[]","required":false,"description":"允许的 MIME 或扩展名。"},{"key":"maxSize","type":"number","required":false,"defaultValue":0,"description":"单文件最大字节数。"}],
 *   "outputs": [{"key":"files","type":"UploadedFile[]","description":"上传结果列表。"},{"key":"urls","type":"string[]","description":"成功解析出的文件 URL。"},{"key":"success","type":"boolean","description":"是否成功。"},{"key":"rawResponse","type":"unknown","description":"上传接口原始响应。"}],
 *   "errors": [{"code":"FILE_INVALID","description":"没有文件、类型不允许或文件超过大小限制。"},{"code":"UPLOAD_FAILED","description":"上传请求失败。"}],
 *   "config": [{"key":"fileField","type":"string","defaultValue":"file","description":"表单文件字段名。"}],
 *   "nodeSchema": [],
 *   "runtime": [{"key":"sideEffect","value":true},{"key":"async","value":true},{"key":"failureMode","value":"throws"}],
 *   "examples": [{"action":{"uuid":"upload","action":"upload_file","inputs":{"files":"{{event.files}}","endpoint":"/api/upload","accept":["image/png"],"maxSize":5242880},"outputs":["files","urls"]}}]
 * }
 */
export const uploadFileAction: ActionExecutor = async ({ inputs, state }) => {
  const files = fileInputs(inputs.files ?? inputs.file);
  if (!files.length) {
    throw new Error('No file was provided for upload.');
  }

  const accept = acceptInputs(inputs.accept);
  const maxSize = numberInput(inputs.maxSize, 0);
  files.forEach((file) => {
    if (!fileMatchesAccept(file, accept)) {
      throw new Error(`File type is not allowed: ${file.name}`);
    }
    if (maxSize > 0 && file.size > maxSize) {
      throw new Error(`File is too large: ${file.name}`);
    }
  });

  const mode = stringInput(inputs.mode) || 'direct';
  const endpoint = stringInput(inputs.endpoint);
  const datasource = datasourceInput(inputs.datasource);
  const uploadedFiles = [];
  const urls: string[] = [];
  const rawResponses = [];

  for (const file of files) {
    const rawResponse = mode === 'oss-token'
      ? await uploadWithOssToken(file, inputs, state)
      : endpoint
        ? await uploadToEndpoint(file, endpoint, inputs)
        : await uploadToDatasource(file, datasource, state);
    const url = extractResponseUrl(rawResponse);
    if (url) urls.push(url);
    rawResponses.push(normalizeRawResponse(rawResponse));
    uploadedFiles.push(normalizeUploadedFile(file, {
      status: 'success',
      ...(url ? { url } : {}),
      response: normalizeRawResponse(rawResponse)
    }));
  }

  return {
    files: uploadedFiles,
    urls,
    success: true,
    rawResponse: rawResponses.length === 1 ? rawResponses[0] : rawResponses
  };
};

/**
 * @clientActionDoc {
 *   "version": "1.0",
 *   "sourcePackage": "mokelay-components",
 *   "actionName": "download_blob",
 *   "displayName": "下载文件",
 *   "actionType": "action",
 *   "category": "file",
 *   "description": "下载 URL、Blob 或 ArrayBuffer，并触发浏览器文件保存。",
 *   "inputs": [{"key":"url","type":"string","required":false,"description":"下载地址。"},{"key":"blob","type":"Blob|ArrayBuffer","required":false,"description":"本地二进制数据。"},{"key":"fileName","type":"string","required":false,"defaultValue":"download","description":"保存文件名。"},{"key":"mime","type":"string","required":false,"description":"ArrayBuffer 的 MIME 类型。"},{"key":"revokeObjectUrl","type":"boolean","required":false,"defaultValue":true,"description":"下载后是否释放临时 URL。"}],
 *   "outputs": [{"key":"downloaded","type":"boolean","description":"是否触发下载。"},{"key":"fileName","type":"string","description":"最终文件名。"}],
 *   "errors": [],
 *   "config": [],
 *   "nodeSchema": [],
 *   "runtime": [{"key":"sideEffect","value":true},{"key":"async","value":true},{"key":"failureMode","value":"returns downloaded=false without browser"}],
 *   "examples": [{"action":{"uuid":"download","action":"download_blob","inputs":{"url":"{{actions.load.outputs.url}}","fileName":"report.xlsx"},"outputs":["downloaded","fileName"]}}]
 * }
 */
export const downloadBlobAction: ActionExecutor = async ({ inputs }) => {
  if (typeof document === 'undefined') {
    return { downloaded: false, fileName: stringInput(inputs.fileName) };
  }

  const fileName = stringInput(inputs.fileName) || 'download';
  const url = stringInput(inputs.url);
  let href = url;
  let objectUrl = '';

  if (!href) {
    const blobInput = inputs.blob;
    const blob = blobInput instanceof Blob
      ? blobInput
      : blobInput instanceof ArrayBuffer
        ? new Blob([blobInput], { type: stringInput(inputs.mime) })
        : undefined;
    if (!blob) {
      return { downloaded: false, fileName };
    }
    objectUrl = URL.createObjectURL(blob);
    href = objectUrl;
  }

  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();

  if (objectUrl && inputs.revokeObjectUrl !== false) {
    URL.revokeObjectURL(objectUrl);
  }

  return {
    downloaded: true,
    fileName
  };
};

export const actionExecutors: Record<string, ActionExecutor> = {
  execute_ds: executeDatasourceAction,
  confirm: confirmAction,
  open_dialog: openDialogAction,
  close_dialog: closeDialogAction,
  jump_url: jumpUrlAction,
  call_block_method: callBlockMethodAction,
  upload_file: uploadFileAction,
  download_blob: downloadBlobAction
};
