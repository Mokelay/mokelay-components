import { markRaw, type Component } from 'vue';
import MButton, { normalizeButtonProps, type MButtonProps } from './MButton.vue';
import MInput from './MInput.vue';
import MLink from './MLink.vue';
import MTag from './MTag.vue';

export type InlineRuntimeComponentDefinition = {
  component: Component;
  normalizeProps: (props: Record<string, unknown>) => Record<string, unknown>;
};

function defineInlineRuntimeComponent(
  component: Component,
  normalizeProps: InlineRuntimeComponentDefinition['normalizeProps'] = (props) => ({ ...props, edit: props.edit === true })
): InlineRuntimeComponentDefinition {
  return {
    component: markRaw(component),
    normalizeProps
  };
}

const inlineRuntimeComponents = {
  MButton: defineInlineRuntimeComponent(MButton, (props) => ({
    ...normalizeButtonProps(props as Partial<MButtonProps>)
  })),
  MInput: defineInlineRuntimeComponent(MInput),
  MLink: defineInlineRuntimeComponent(MLink),
  MTag: defineInlineRuntimeComponent(MTag)
};

export function getInlineRuntimeComponentDefinition(type: string) {
  return inlineRuntimeComponents[type as keyof typeof inlineRuntimeComponents];
}

export function isInlineRuntimeComponent(type: string) {
  return type in inlineRuntimeComponents;
}
