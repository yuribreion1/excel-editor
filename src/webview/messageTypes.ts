import type { EditorMessageState, ViewerState } from '../types/viewer-state';
import type { TableCell } from '../types/workbook';

export type FromWebviewMessage =
  | { type: 'ready' }
  | { type: 'selectSheet'; sheetId: string }
  | { type: 'commitCellEdit'; sheetId: string; address: string; value: string }
  | { type: 'dismissEditorMessage' };

export type ToWebviewMessage =
  | {
      type: 'state';
      state: ViewerState;
    }
  | {
      type: 'cellUpdate';
      sheetId: string;
      address: string;
      cell?: TableCell;
      state: ViewerState;
    }
  | {
      type: 'editorMessage';
      message: EditorMessageState;
    };
