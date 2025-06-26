/**
 * タスクテキストから日付を抽出する関数
 * パフォーマンスを向上させるため、正規表現を事前にコンパイル
 */

// 事前にコンパイルされた正規表現パターン
const JAPANESE_TODAY_PATTERN = /^今日\s+/;
const JAPANESE_TOMORROW_PATTERN = /^明日\s+/;
const ENGLISH_TODAY_PATTERN = /^today\s+/i;
const ENGLISH_TOMORROW_PATTERN = /^tomorrow\s+/i;
const DATE_PATTERN = /^(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s+/;

// 曜日パターン（日本語）
const JAPANESE_WEEKDAYS = [
  { pattern: /^日曜日\s+/, dayOffset: 0 },
  { pattern: /^月曜日\s+/, dayOffset: 1 },
  { pattern: /^火曜日\s+/, dayOffset: 2 },
  { pattern: /^水曜日\s+/, dayOffset: 3 },
  { pattern: /^木曜日\s+/, dayOffset: 4 },
  { pattern: /^金曜日\s+/, dayOffset: 5 },
  { pattern: /^土曜日\s+/, dayOffset: 6 },
];

// 曜日パターン（英語）
const ENGLISH_WEEKDAYS = [
  { pattern: /^sunday\s+/i, dayOffset: 0 },
  { pattern: /^monday\s+/i, dayOffset: 1 },
  { pattern: /^tuesday\s+/i, dayOffset: 2 },
  { pattern: /^wednesday\s+/i, dayOffset: 3 },
  { pattern: /^thursday\s+/i, dayOffset: 4 },
  { pattern: /^friday\s+/i, dayOffset: 5 },
  { pattern: /^saturday\s+/i, dayOffset: 6 },
];

/**
 * 指定された曜日の次の日付を取得
 */
function getNextWeekday(targetDay: number): Date {
  const today = new Date();
  const currentDay = today.getDay();
  let daysToAdd = targetDay - currentDay;
  
  if (daysToAdd <= 0) {
    daysToAdd += 7; // 次週の同じ曜日
  }
  
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysToAdd);
  return targetDate;
}

/**
 * 日付文字列をISO形式（YYYY-MM-DD）に変換
 */
function formatDateToISO(date: Date): string {
  const isoString = date.toISOString().split('T')[0];
  return isoString || '';
}

/**
 * タスクテキストから日付を抽出し、クリーンなテキストと日付を返す
 */
export function extractDateFromTaskText(text: string): { 
  cleanText: string; 
  extractedDate: string | null 
} {
  const today = new Date();
  let extractedDate: Date | null = null;
  let cleanText = text.trim();
  
  // 1. 日本語の「今日」「明日」パターン
  if (JAPANESE_TODAY_PATTERN.test(cleanText)) {
    extractedDate = new Date(today);
    cleanText = cleanText.replace(JAPANESE_TODAY_PATTERN, '');
  } else if (JAPANESE_TOMORROW_PATTERN.test(cleanText)) {
    extractedDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    cleanText = cleanText.replace(JAPANESE_TOMORROW_PATTERN, '');
  }
  
  // 2. 英語の「today」「tomorrow」パターン
  else if (ENGLISH_TODAY_PATTERN.test(cleanText)) {
    extractedDate = new Date(today);
    cleanText = cleanText.replace(ENGLISH_TODAY_PATTERN, '');
  } else if (ENGLISH_TOMORROW_PATTERN.test(cleanText)) {
    extractedDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    cleanText = cleanText.replace(ENGLISH_TOMORROW_PATTERN, '');
  }
  
  // 3. 日本語の曜日パターン
  else {
    for (const { pattern, dayOffset } of JAPANESE_WEEKDAYS) {
      if (pattern.test(cleanText)) {
        extractedDate = getNextWeekday(dayOffset);
        cleanText = cleanText.replace(pattern, '');
        break;
      }
    }
    
    // 4. 英語の曜日パターン
    if (!extractedDate) {
      for (const { pattern, dayOffset } of ENGLISH_WEEKDAYS) {
        if (pattern.test(cleanText)) {
          extractedDate = getNextWeekday(dayOffset);
          cleanText = cleanText.replace(pattern, '');
          break;
        }
      }
    }
    
    // 5. 日付形式のパターン（YYYY/MM/DD, YYYY-MM-DD）
    if (!extractedDate) {
      const match = cleanText.match(DATE_PATTERN);
      if (match && match[1]) {
        const parsedDate = new Date(match[1].replace(/\//g, '-'));
        if (!isNaN(parsedDate.getTime())) {
          extractedDate = parsedDate;
          cleanText = cleanText.replace(DATE_PATTERN, '');
        }
      }
    }
  }
  
  return {
    cleanText: cleanText.trim(),
    extractedDate: extractedDate ? formatDateToISO(extractedDate) : null,
  };
}

/**
 * 複数のタスクテキストから一括で日付を抽出（バッチ処理用）
 */
export function extractDatesFromTaskTexts(texts: string[]): Array<{
  cleanText: string;
  extractedDate: string | null;
}> {
  return texts.map(text => extractDateFromTaskText(text));
}

/**
 * 日付が有効かどうかを検証
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && Boolean(dateString.match(/^\d{4}-\d{2}-\d{2}$/));
}

/**
 * 日付を相対的な表現に変換（例：今日、明日、3日後）
 */
export function formatRelativeDate(dateString: string | null): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  
  // 時間部分を除去して比較
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  
  if (dateOnly.getTime() === todayOnly.getTime()) {
    return '今日';
  } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
    return '明日';
  } else {
    const diffTime = dateOnly.getTime() - todayOnly.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return `${diffDays}日後`;
    } else {
      return `${Math.abs(diffDays)}日前`;
    }
  }
}