import { describe, it, expect } from 'vitest';
import {
  DEFAULT_THEME,
  DEFAULT_LANGUAGE,
  DEFAULT_TASK_INSERT_POSITION,
  DEFAULT_AUTO_SORT,
  API_TIMEOUTS,
  SYNC_INTERVALS,
  SESSION_TIMEOUT,
} from '../constants';

describe('constants', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_THEME).toBe('system');
    expect(DEFAULT_LANGUAGE).toBe('ja');
    expect(DEFAULT_TASK_INSERT_POSITION).toBe('top');
    expect(DEFAULT_AUTO_SORT).toBe(false);
  });

  it('should have correct timeout values', () => {
    expect(API_TIMEOUTS.DEFAULT).toBe(30000);
    expect(API_TIMEOUTS.UPLOAD).toBe(60000);
    expect(API_TIMEOUTS.DOWNLOAD).toBe(60000);
  });

  it('should have correct sync intervals', () => {
    expect(SYNC_INTERVALS.POLLING).toBe(10000);
    expect(SYNC_INTERVALS.SESSION_KEEP_ALIVE).toBe(1200000);
  });

  it('should have correct session timeout values', () => {
    expect(SESSION_TIMEOUT.ACTIVE).toBe(3600000);
    expect(SESSION_TIMEOUT.BACKGROUND).toBe(300000);
  });
});