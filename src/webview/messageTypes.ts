import type { ViewerState } from '../types/viewer-state';

export type FromWebviewMessage =
  | { type: 'ready' }
  | { type: 'selectSheet'; sheetId: string };

export type ToWebviewMessage = {
  type: 'state';
  state: ViewerState;
};
