import type { WorkbookSaveAssessment } from './workbook-edit';
import type { WorksheetSummary, WorksheetTable } from './workbook';

export type ViewerLoadState = 'idle' | 'loading' | 'ready' | 'unsupported' | 'error';

export interface EditorMessageState {
  kind: 'info' | 'warning' | 'error';
  text: string;
}

export interface ViewerState {
  loadState: ViewerLoadState;
  title: string;
  readOnly: boolean;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  availableSheets: WorksheetSummary[];
  selectedSheetId?: string;
  table?: WorksheetTable;
  warnings: string[];
  message?: string;
  editability: WorkbookSaveAssessment;
  editorMessage?: EditorMessageState;
}
