export type WorkbookErrorCode = 'unsupported' | 'malformed' | 'unexpected';

export interface WorkbookOpenError {
  code: WorkbookErrorCode;
  message: string;
}

export function normalizeWorkbookOpenError(error: unknown): WorkbookOpenError {
  const message =
    error instanceof Error ? error.message : 'The workbook could not be opened.';
  const normalized = message.toLowerCase();

  if (
    normalized.includes('password') ||
    normalized.includes('encrypt') ||
    normalized.includes('unsupported') ||
    normalized.includes('cfb') ||
    normalized.includes('zip')
  ) {
    return {
      code: 'unsupported',
      message:
        'This workbook is unsupported or password-protected and cannot be viewed in this release.'
    };
  }

  if (
    normalized.includes('invalid') ||
    normalized.includes('bad') ||
    normalized.includes('corrupt') ||
    normalized.includes('parse')
  ) {
    return {
      code: 'malformed',
      message:
        'This workbook appears to be malformed or corrupted and could not be opened.'
    };
  }

  return {
    code: 'unexpected',
    message: 'The workbook could not be opened because an unexpected error occurred.'
  };
}
