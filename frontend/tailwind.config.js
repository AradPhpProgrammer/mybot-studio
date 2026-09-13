/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        background: 'var(--background)',
        border: 'var(--border)',
        danger: 'var(--danger)',
        'danger-foreground': 'var(--danger-foreground)',
        default: 'var(--default)',
        'default-foreground': 'var(--default-foreground)',
        'field-background': 'var(--field-background)',
        'field-foreground': 'var(--field-foreground)',
        'field-placeholder': 'var(--field-placeholder)',
        focus: 'var(--focus)',
        foreground: 'var(--foreground)',
        muted: 'var(--muted)',
        overlay: 'var(--overlay)',
        'overlay-foreground': 'var(--overlay-foreground)',
        separator: 'var(--separator)',
        success: 'var(--success)',
        'success-foreground': 'var(--success-foreground)',
        surface: 'var(--surface)',
        'surface-foreground': 'var(--surface-foreground)',
        'surface-secondary': 'var(--surface-secondary)',
        'surface-secondary-foreground': 'var(--surface-secondary-foreground)',
        warning: 'var(--warning)',
        'warning-foreground': 'var(--warning-foreground)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        field: 'var(--field-radius)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
