/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    screens: {
      xs: '375px',
      sm: '768px',
      md: '1024px',
      lg: '1280px',
      xl: '1440px',
      '2xl': '1500px',
      '3xl': '1920px',
    },
    extend: {
      width: {
        'container-xs': '90%',
        'container-sm': '720px',
        'container-md': '960px',
        'container-lg': '1152px',
        'container-xl': '1280px',
        'container-2xl': '1440px',
        'container-3xl': '1640px',
      },
      colors: {
        brand: {
          red: '#E30613',
          gray: '#93A2AF',
        },
        pastel: {
          page: '#F5F7FA',
          surface: '#FFFFFF',
          panel: '#E5EAF0',
          successSoft: '#DFF5E8',
          success: '#4CAF50',
          successDark: '#2E7D32',
          infoSoft: '#E3F0FF',
          info: '#3B82F6',
          infoDark: '#1E3A8A',
          neutralSoft: '#F1F3F6',
          neutral: '#D1D5DB',
          neutralDark: '#374151',
          dangerSoft: '#FDEAEA',
          danger: '#EF4444',
          dangerDark: '#991B1B',
          accentCoral: '#F87171',
          accentAmber: '#F59E0B',
          accentSlate: '#9CA3AF',
        },
        surface: {
          page: '#F5F7FA',
          card: '#FFFFFF',
        },
        border: {
          input: '#D1D5DB',
        },
        content: {
          DEFAULT: '#374151',
          muted: '#9CA3AF',
        },
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        heading1: ['72px', '90px'],
        heading2: ['60px', '72px'],
        heading3: ['48px', '60px'],
        heading4: ['36px', '44px'],
        heading5: ['30px', '38px'],
        heading5_b: ['26px', '34px'],
        heading6: ['24px', '32px'],
        subheading: ['20px', '30px'],
        bodylarge: ['18px', '28px'],
        bodysmall: ['16px', '24px'],
        captionlarge: ['14px', '22px'],
        captionsmall: ['12px', '18px'],
        extrasmall: ['10px', '16px'],
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
      fontWeight: {
        thin: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      maxWidth: {
        'auth-card': '28rem',
      },
      spacing: {
        '18': '4.5rem',
      },
      accentColor: {
        'brand-gray': '#93A2AF',
      },
      boxShadow: {
        'auth-card': '0 1px 3px 0 rgb(0 0 0 / 0.04)',
      },
      borderRadius: {
        '2xs': '2px',
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '20px',
        '2xl': '24px',
        'auth': '0.5rem',
        'auth-input': '0.375rem',
      },
    },
  },
  plugins: [],
}
