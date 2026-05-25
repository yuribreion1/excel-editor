import type { WorksheetSummary, WorksheetTable } from './workbook';

export type ViewerLoadState = 'idle' | 'loading' | 'ready' | 'unsupported' | 'error';

export interface ViewerState {
  loadState: ViewerLoadState;
  title: string;
  readOnly: boolean;
  availableSheets: WorksheetSummary[];
  selectedSheetId?: string;
  table?: WorksheetTable;
  warnings: string[];
  message?: string;
}
