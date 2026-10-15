export type ErrorType = 'internal' | 'invalid_request' | 'auth' | 'system';

export type ResponseError = {
  message: string;
  code: string;
  type: ErrorType;
  link: string;
};

export class MeiliError extends Error {
  constructor(
    public httpStatus: number,
    public code: string,
    public type: ErrorType | string,
    public link: string,
    message: string
  ) {
    super(message);
    this.name = 'MeiliError';
  }
}

export type ErrorKind = 'network' | 'auth' | 'permission' | 'readonly' | 'other';

export function classifyError(error: unknown): ErrorKind {
  if (!(error instanceof MeiliError)) return 'other';
  if (error.code === 'connection_read_only') return 'readonly';
  if (error.code === 'proxy_error' || error.code === 'proxy_timeout' || error.code === 'not_connected') {
    return 'network';
  }
  if (error.httpStatus === 401 || error.code === 'missing_authorization_header' || error.code === 'invalid_api_key') {
    return 'auth';
  }
  if (error.httpStatus === 403) return 'permission';
  return 'other';
}

const KIND_LABEL: Record<ErrorKind, string> = {
  network: 'Mạng',
  auth: 'Xác thực',
  permission: 'Quyền',
  readonly: 'Chỉ đọc',
  other: 'Lỗi'
};

export function errorLabel(error: unknown): string {
  if (!error) return '';
  const kind = classifyError(error);
  const prefix = KIND_LABEL[kind];
  if (error instanceof MeiliError) {
    return `${prefix}: ${error.message} (${error.code})`;
  }
  if (error instanceof Error) return `${prefix}: ${error.message}`;
  return `${prefix}: ${String(error)}`;
}
