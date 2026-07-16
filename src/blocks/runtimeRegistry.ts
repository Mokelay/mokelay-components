import { markRaw, type Component } from 'vue';
import type {
  MokelayBlockRenderDefinition,
  MokelayBlockRenderLoader
} from './types';
import { getMokelayComponentsAdapter } from '@/runtime/adapter';

type BlockModule = {
  default: Component;
  [key: string]: unknown;
};

const builtInLoaders: Record<string, () => Promise<BlockModule>> = {
  MActionCardList: () => import('./MActionCardList.vue'),
  MActionToolbar: () => import('./MActionToolbar.vue'),
  MAdvanceInput: () => import('./MAdvanceInput.vue'),
  MAdvanceTable: () => import('./MAdvanceTable.vue'),
  MButton: () => import('./MButton.vue'),
  MChart: () => import('./MChart.vue'),
  MCheckboxGroupField: () => import('./MCheckboxGroupField.vue'),
  MDateRangeField: () => import('./MDateRangeField.vue'),
  MDividerLine: () => import('./MDividerLine.vue'),
  MEmailField: () => import('./MEmailField.vue'),
  MEmbed: () => import('./MEmbed.vue'),
  MFileUploadField: () => import('./MFileUploadField.vue'),
  MForm: () => import('./MForm.vue'),
  MFormItem: () => import('./MFormItem.vue'),
  MHeading: () => import('./MHeading.vue'),
  MImage: () => import('./MImage.vue'),
  MImageChoiceField: () => import('./MImageChoiceField.vue'),
  MInput: () => import('./MInput.vue'),
  MJson: () => import('./MJson.vue'),
  MJsonEditor: () => import('./MJsonEditor.vue'),
  MLayoutGrid: () => import('./MLayoutGrid.vue'),
  MLayoutPreview: () => import('./MLayoutPreview.vue'),
  MLinearScaleField: () => import('./MLinearScaleField.vue'),
  MLink: () => import('./MLink.vue'),
  MLinkField: () => import('./MLinkField.vue'),
  MMatrixField: () => import('./MMatrixField.vue'),
  MPage: () => import('./MPage.vue'),
  MPageState: () => import('./MPageState.vue'),
  MPhoneField: () => import('./MPhoneField.vue'),
  MRadioGroupField: () => import('./MRadioGroupField.vue'),
  MRatingField: () => import('./MRatingField.vue'),
  MRecordList: () => import('./MRecordList.vue'),
  MResultPage: () => import('./MResultPage.vue'),
  MRichText: () => import('./MRichText.vue'),
  MSelectField: () => import('./MSelectField.vue'),
  MTabs: () => import('./MTabs.vue'),
  MTag: () => import('./MTag.vue'),
  MTextField: () => import('./MTextField.vue'),
  MTextareaField: () => import('./MTextareaField.vue'),
  MThankYouPage: () => import('./MThankYouPage.vue'),
  MUploadImport: () => import('./MUploadImport.vue')
};

const customLoaders = new Map<string, MokelayBlockRenderLoader>();
const definitions = new Map<string, MokelayBlockRenderDefinition>();
const pendingDefinitions = new Map<string, Promise<MokelayBlockRenderDefinition | undefined>>();

function definitionFromModule(module: BlockModule): MokelayBlockRenderDefinition {
  const normalizeProps = Object.entries(module).find(([name, value]) => (
    /^normalize.*Props$/.test(name) && typeof value === 'function'
  ))?.[1] as MokelayBlockRenderDefinition['normalizeProps'];

  return {
    component: markRaw(module.default),
    ...(normalizeProps ? { normalizeProps } : {})
  };
}

export function registerMokelayBlock(type: string, loader: MokelayBlockRenderLoader): void {
  customLoaders.set(type, loader);
  definitions.delete(type);
  pendingDefinitions.delete(type);
}

export function registerMokelayBlocks(loaders: Record<string, MokelayBlockRenderLoader>): void {
  Object.entries(loaders).forEach(([type, loader]) => registerMokelayBlock(type, loader));
}

export function isMokelayBlockRegistered(type: string): boolean {
  return Boolean(builtInLoaders[type] || customLoaders.has(type) || getMokelayComponentsAdapter().loadBlockDefinition);
}

export function getMokelayBlockDefinition(type: string): MokelayBlockRenderDefinition | undefined {
  return definitions.get(type);
}

export async function loadMokelayBlockDefinition(type: string): Promise<MokelayBlockRenderDefinition | undefined> {
  const loaded = definitions.get(type);
  if (loaded) return loaded;

  const existing = pendingDefinitions.get(type);
  if (existing) return existing;

  const loader = customLoaders.get(type);
  const builtInLoader = builtInLoaders[type];
  const adapterLoader = getMokelayComponentsAdapter().loadBlockDefinition;
  const pending = (async () => {
    const definition = loader
      ? await loader()
      : builtInLoader
        ? definitionFromModule(await builtInLoader())
        : adapterLoader
          ? await adapterLoader(type)
          : undefined;
    if (definition) definitions.set(type, definition);
    return definition;
  })().finally(() => pendingDefinitions.delete(type));

  pendingDefinitions.set(type, pending);
  return pending;
}

export function getRegisteredMokelayBlockNames(): string[] {
  return [...new Set([...Object.keys(builtInLoaders), ...customLoaders.keys()])];
}
