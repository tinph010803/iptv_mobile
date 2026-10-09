import type { ReactNode } from 'react';

export type MenuPopoverItem = {
  key: string;
  label: string;
  icon: ReactNode;
  onPress: () => void;
};