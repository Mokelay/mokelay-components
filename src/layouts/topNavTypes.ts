import type { LayoutAuthState } from '@/layouts/runtime';
import type { LayoutBlock, LayoutMenuItem, LocalizedLayoutText, ResolvedLayoutMenuItem } from '@/layouts/domain';

export type TopNavBrand = {
  text?: LocalizedLayoutText;
  href?: string;
  showMark?: boolean;
};

export type TopNavControl = {
  id?: string;
  type?: string;
  label?: LocalizedLayoutText;
  value?: string;
  binding?: {
    source?: string;
    key?: string;
  };
  options?: Array<{
    label: LocalizedLayoutText;
    value: string;
  }>;
};

export type TopNavProps = {
  variant?: string;
  brand?: TopNavBrand;
  homeAction?: LayoutBlock;
  utilityControls?: TopNavControl[];
  items?: LayoutMenuItem[];
  actions?: LayoutBlock[];
  guestActions?: LayoutBlock[];
  userActions?: LayoutBlock[];
  auth?: LayoutAuthState;
};

export type ResolvedTopNavControl = Omit<TopNavControl, 'label' | 'options'> & {
  label?: string;
  options?: Array<{ label: string; value: string }>;
};

export type ResolvedTopNavProps = Omit<TopNavProps, 'brand' | 'utilityControls' | 'items'> & {
  brand?: Omit<TopNavBrand, 'text'> & { text?: string };
  utilityControls?: ResolvedTopNavControl[];
  items?: ResolvedLayoutMenuItem[];
};
