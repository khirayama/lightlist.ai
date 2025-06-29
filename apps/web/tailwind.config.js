/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ベースカラー（ライト/ダーク両対応）
        primary: {
          // ライトテーマ
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#005AAF', // Primary色（ライト）
          600: '#004d94',
          700: '#003f7a',
          800: '#003161',
          900: '#002347',
          // ダークテーマ対応
          'dark': '#3B82F6', // Primary色（ダーク）
        },
        secondary: {
          // ライトテーマ
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0078D4', // Secondary色（ライト）
          600: '#0066b3',
          700: '#005393',
          800: '#004173',
          900: '#002f53',
          // ダークテーマ対応
          'dark': '#60A5FA', // Secondary色（ダーク）
        },
        accent: {
          // ライトテーマ
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#00B8A9', // Accent色（ライト）
          600: '#009688',
          700: '#007b6f',
          800: '#006057',
          900: '#004640',
          // ダークテーマ対応
          'dark': '#10B981', // Accent色（ダーク）
        },
        // UIカラー（ライト/ダーク）
        border: {
          DEFAULT: '#D1D5DB', // ライト
          dark: '#374151', // ダーク
        },
        background: {
          DEFAULT: '#F9FAFB', // ライト
          dark: '#111827', // ダーク
        },
        surface: {
          DEFAULT: '#FFFFFF', // ライト
          dark: '#1F2937', // ダーク
        },
        // ステータスカラー（ライト/ダーク両対応）
        success: {
          // ライトテーマ
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399', // Success色（ライト）
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          // ダークテーマ対応
          'dark': '#10B981', // Success色（ダーク）
        },
        warning: {
          // ライトテーマ
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24', // Warning色（ライト）
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          // ダークテーマ対応
          'dark': '#FCD34D', // Warning色（ダーク）
        },
        error: {
          // ライトテーマ
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444', // Error色（ライト）
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          // ダークテーマ対応
          'dark': '#F87171', // Error色（ダーク）
        },
        // テキストカラー（ライト/ダーク）
        text: {
          primary: {
            DEFAULT: '#111827', // ライト
            dark: '#F9FAFB', // ダーク
          },
          secondary: {
            DEFAULT: '#6B7280', // ライト
            dark: '#D1D5DB', // ダーク
          },
          disabled: {
            DEFAULT: '#9CA3AF', // ライト
            dark: '#6B7280', // ダーク
          },
        },
        // グレー系
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans JP', 'sans-serif'],
        'noto-sans-jp': ['Noto Sans JP', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      fontSize: {
        // タイポグラフィ
        'xs': '12px',
        'sm': '14px',
        'base': '16px',
        'lg': '18px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
      },
      spacing: {
        // 4pxグリッド
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        '32': '128px',
      },
      borderRadius: {
        'sm': '2px',
        'DEFAULT': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      maxWidth: {
        'container': '1280px',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.scrollbar-hide': {
          /* IE and Edge */
          '-ms-overflow-style': 'none',
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        },
        '.snap-x': {
          'scroll-snap-type': 'x mandatory'
        },
        '.snap-y': {
          'scroll-snap-type': 'y mandatory'
        },
        '.snap-start': {
          'scroll-snap-align': 'start'
        },
        '.snap-center': {
          'scroll-snap-align': 'center'
        },
        '.snap-end': {
          'scroll-snap-align': 'end'
        }
      }
      addUtilities(newUtilities)
    }
  ],
};