/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        brand: {
          red: '#E30613',
          teal: '#3AAFA9',
        },
        surface: {
          page: '#F2F2F2',
          card: '#FFFFFF',
        },
        border: {
          input: '#C4C4C4',
        },
        content: {
          DEFAULT: '#1a1a1a',
          muted: '#666666',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        /** Page title / auth heading */
        'display-sm': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        'display-md': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '700' }],
        /** Subtitle under auth titles */
        'body-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'body-md': ['1rem', { lineHeight: '1.5rem' }],
        /** Form labels */
        'label': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '600' }],
        /** Helper / error */
        'caption': ['0.75rem', { lineHeight: '1rem' }],
      },
      maxWidth: {
        'auth-card': '28rem',
      },
      spacing: {
        '18': '4.5rem',
      },
      accentColor: {
        'brand-teal': '#3AAFA9',
      },
      boxShadow: {
        'auth-card': '0 1px 3px 0 rgb(0 0 0 / 0.04)',
      },
      borderRadius: {
        'auth': '0.5rem',
        'auth-input': '0.375rem',
      },
    },
  },
  plugins: [],
}
