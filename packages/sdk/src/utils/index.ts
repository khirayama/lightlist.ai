/**
 * デバイスIDを生成する関数
 * ブラウザ環境では crypto.randomUUID() を使用し、
 * 利用できない場合はランダム文字列を生成
 */
export function generateDeviceId(): string {
  // ブラウザ環境で crypto.randomUUID が利用可能な場合
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  
  // Node.js環境またはcrypto.randomUUIDが利用できない場合
  return generateRandomString(32);
}

/**
 * ランダム文字列を生成する関数
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * デバイスIDをストレージから取得または生成する関数
 * ブラウザ環境では localStorage を使用
 */
export function getOrCreateDeviceId(storageKey = 'lightlist_device_id'): string {
  if (typeof window === 'undefined') {
    // サーバーサイド環境では新しいIDを生成
    return generateDeviceId();
  }
  
  try {
    // 既存のデバイスIDを確認
    const existingId = localStorage.getItem(storageKey);
    if (existingId) {
      return existingId;
    }
    
    // 新しいデバイスIDを生成して保存
    const newId = generateDeviceId();
    localStorage.setItem(storageKey, newId);
    return newId;
  } catch (error) {
    // localStorage が利用できない場合は新しいIDを生成
    console.warn('localStorage is not available, generating temporary device ID');
    return generateDeviceId();
  }
}

/**
 * 日付文字列をパースして Date オブジェクトに変換
 */
export function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Date オブジェクトを ISO 8601 形式の文字列に変換
 */
export function formatDate(date: Date | null): string | null {
  if (!date) return null;
  
  try {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD形式
  } catch {
    return null;
  }
}

/**
 * エラーオブジェクトから安全にメッセージを取得
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Unknown error occurred';
}

/**
 * バリデーション用のメールアドレス正規表現
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * メールアドレスの形式をチェック
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * パスワードの要件をチェック
 * - 最小8文字
 * - 大文字・小文字・数字を含む
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  
  // 大文字を含む
  if (!/[A-Z]/.test(password)) return false;
  
  // 小文字を含む
  if (!/[a-z]/.test(password)) return false;
  
  // 数字を含む
  if (!/\d/.test(password)) return false;
  
  return true;
}

/**
 * パスワード要件のエラーメッセージを取得
 */
export function getPasswordRequirements(password: string): string[] {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return errors;
}

/**
 * タスクテキストから日付を抽出する関数
 * 「今日」「明日」「月曜日」「2025/06/18」などを認識
 */
export function extractDateFromText(text: string): { cleanText: string; date: string | null } {
  const today = new Date();
  let extractedDate: Date | null = null;
  let cleanText = text.trim();
  
  // 日本語の日付パターン
  const japanesePatterns = [
    { pattern: /^今日\s+/, date: new Date(today) },
    { pattern: /^明日\s+/, date: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
    { pattern: /^昨日\s+/, date: new Date(today.getTime() - 24 * 60 * 60 * 1000) },
  ];
  
  // 英語の日付パターン
  const englishPatterns = [
    { pattern: /^today\s+/i, date: new Date(today) },
    { pattern: /^tomorrow\s+/i, date: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
    { pattern: /^yesterday\s+/i, date: new Date(today.getTime() - 24 * 60 * 60 * 1000) },
  ];
  
  // 日付形式のパターン（YYYY/MM/DD, YYYY-MM-DD）
  const datePatterns = [
    /^(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s+/,
    /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\s+/,
  ];
  
  // 日本語パターンをチェック
  for (const { pattern, date } of japanesePatterns) {
    if (pattern.test(cleanText)) {
      extractedDate = date;
      cleanText = cleanText.replace(pattern, '');
      break;
    }
  }
  
  // 英語パターンをチェック
  if (!extractedDate) {
    for (const { pattern, date } of englishPatterns) {
      if (pattern.test(cleanText)) {
        extractedDate = date;
        cleanText = cleanText.replace(pattern, '');
        break;
      }
    }
  }
  
  // 日付形式をチェック
  if (!extractedDate) {
    for (const pattern of datePatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        const parsedDate = new Date(match[1]);
        if (!isNaN(parsedDate.getTime())) {
          extractedDate = parsedDate;
          cleanText = cleanText.replace(pattern, '');
          break;
        }
      }
    }
  }
  
  return {
    cleanText: cleanText.trim(),
    date: extractedDate ? formatDate(extractedDate) : null,
  };
}