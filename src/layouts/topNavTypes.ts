import type { LayoutAuthState } from '@/layouts/runtime';
import type { LayoutBlock, LayoutMenuItem } from '@/layouts/domain';

export type TopNavBrand = {
  text?: string;
  href?: string;
  showMark?: boolean;
};

export type TopNavControl = {
  id?: string;
  type?: string;
  label?: string;
  value?: string;
  binding?: {
    source?: string;
    key?: string;
  };
  options?: Array<{
    label: string;
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
