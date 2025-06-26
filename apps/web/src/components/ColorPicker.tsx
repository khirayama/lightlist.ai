import React from 'react';

interface ColorPickerProps {
  color: string;
  onChangeComplete: (color: string) => void;
}

const PRESET_COLORS = [
  '#FFE4E1', // 薄いピンク
  '#E6E6FA', // 薄い紫
  '#E0FFFF', // 薄い水色
  '#F0FFF0', // 薄い緑
  '#FFFACD', // 薄い黄色
  '#FFE4B5', // 薄いオレンジ
  '#F5F5DC', // ベージュ
  '#FFFFFF', // 白
];

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChangeComplete }) => {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-4 gap-2">
        {PRESET_COLORS.map((presetColor) => (
          <button
            key={presetColor}
            type="button"
            className={`
              w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${color === presetColor 
                ? 'border-blue-500 shadow-md' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }
            `}
            style={{ backgroundColor: presetColor }}
            onClick={() => onChangeComplete(presetColor)}
            aria-label={`色を${presetColor}に設定`}
          />
        ))}
      </div>
    </div>
  );
};
