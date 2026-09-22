/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#0F172A',
        surface: '#1E293B',
        surface2: '#2D3748',
        border: '#334155',
        accent: {
          DEFAULT: '#6366F1',
          hover: '#818CF8',
          muted: 'rgba(99,102,241,0.15)',
        },
        text: {
          DEFAULT: '#F1F5F9',
          muted: '#94A3B8',
          faint: '#64748B',
        },
        tag: {
          important: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6',
          temp: '#64748B',
        },
        status: {
          pending: '#94A3B8',
          progress: '#6366F1',
          done: '#10B981',
          cancelled: '#EF4444',
        },
        priority: {
          high: '#EF4444',
          medium: '#F59E0B',
          low: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'display': ['3rem', { lineHeight: '1.2', fontWeight: '700' }],
        'headline-lg': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'headline-md': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'headline-sm': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.6' }],
        'body-md': ['0.875rem', { lineHeight: '1.5' }],
        'body-sm': ['0.75rem', { lineHeight: '1.4' }],
        'label': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
      },
      borderRadius: {
        DEFAULT: '0.375rem',
        'sm': '0.25rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'elevated': '0 4px 16px rgba(0,0,0,0.4)',
        'modal': '0 20px 60px rgba(0,0,0,0.6)',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'toast-in': 'toastIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-progress': 'toastProgress linear forwards',
        'xp-pulse': 'xpPulse 0.7s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        toastIn: {
          from: { transform: 'translateY(12px) scale(0.96)', opacity: '0' },
          to: { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        toastProgress: {
          from: { width: '100%' },
          to: { width: '0%' },
        },
        xpPulse: {
          '0%': { boxShadow: 'inset 0 0 0 0 rgba(99,102,241,0)' },
          '35%': { boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.55)' },
          '100%': { boxShadow: 'inset 0 0 0 0 rgba(99,102,241,0)' },
        },
      },
    },
  },
  plugins: [],
}
