// 定数定義

export const DEFAULT_THEME = 'system' as const;
export const DEFAULT_LANGUAGE = 'ja' as const;
export const DEFAULT_TASK_INSERT_POSITION = 'top' as const;
export const DEFAULT_AUTO_SORT = false;

export const API_TIMEOUTS = {
  DEFAULT: 30000,
  UPLOAD: 60000,
  DOWNLOAD: 60000,
} as const;

export const SYNC_INTERVALS = {
  POLLING: 10000,
  SESSION_KEEP_ALIVE: 1200000, // 20分
} as const;

export const SESSION_TIMEOUT = {
  ACTIVE: 3600000, // 60分
  BACKGROUND: 300000, // 5分
} as const;