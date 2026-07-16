import type { Component } from 'vue';

export type MokelayBlockData = Record<string, unknown>;

export interface MokelayBlock {
  id?: string;
  type: string;
  data: MokelayBlockData;
  events?: unknown;
  slots?: Record<string, MokelayBlock[]>;
}

export interface MokelayPageDocument {
  time?: number;
  version?: string;
  blocks: MokelayBlock[];
}

export interface MokelayBlockComponentProps {
  edit: boolean;
  currentBlockId?: string;
}

export interface MokelayBlockRenderDefinition {
  component: Component;
  normalizeProps?: (props: Record<string, unknown>) => Record<string, unknown>;
}

export type MokelayBlockRenderLoader = () => Promise<MokelayBlockRenderDefinition | undefined>;
