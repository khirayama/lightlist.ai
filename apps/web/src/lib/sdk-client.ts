import { LightlistSDK } from '@lightlist/sdk';
import { v4 as uuidv4 } from 'uuid';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// デバイスIDを取得（ブラウザのlocalStorageから、ない場合は新規生成）
const getDeviceId = (): string => {
  if (typeof window === 'undefined') return '';
  
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

// SDKクライアントのシングルトンインスタンス
export const sdkClient = new LightlistSDK(API_BASE_URL);

// 認証情報をlocalStorageから復元
export const restoreAuthFromStorage = () => {
  if (typeof window === 'undefined') return;

  try {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const deviceId = getDeviceId();

    if (accessToken && refreshToken) {
      sdkClient.setAuth(accessToken, refreshToken, deviceId);
    }
  } catch (error) {
    console.error('Failed to restore auth from storage:', error);
  }
};

// 認証情報をlocalStorageに保存
export const saveAuthToStorage = (accessToken: string, refreshToken: string) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    
    const deviceId = getDeviceId();
    sdkClient.setAuth(accessToken, refreshToken, deviceId);
  } catch (error) {
    console.error('Failed to save auth to storage:', error);
  }
};

// 認証情報をlocalStorageから削除
export const clearAuthFromStorage = () => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sdkClient.clearAuth();
  } catch (error) {
    console.error('Failed to clear auth from storage:', error);
  }
};

// デバイスIDを取得する関数をエクスポート
export { getDeviceId };

// SDKクライアントをデフォルトエクスポート
export default sdkClient;