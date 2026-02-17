/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px', // Extra small breakpoint for mobile
      },
      colors: {
        // Jio Brand Colors
        jio: {
          blue: {
            50: '#e6eaf5',
            100: '#ccd5eb',
            200: '#99abd7',
            300: '#6681c3',
            400: '#3357af',
            500: '#0033A0', // Main Jio Blue
            600: '#002980',
            700: '#001f60',
            800: '#001440',
            900: '#000a20',
          },
          red: {
            50: '#ffe6e6',
            100: '#ffcccc',
            200: '#ff9999',
            300: '#ff6666',
            400: '#ff3333',
            500: '#E60000', // Jio Red accent
            600: '#b80000',
            700: '#8a0000',
            800: '#5c0000',
            900: '#2e0000',
          },
          orange: {
            50: '#fff3e6',
            100: '#ffe7cc',
            200: '#ffcf99',
            300: '#ffb766',
            400: '#ff9f33',
            500: '#FF6B00', // Jio Orange accent
            600: '#cc5600',
            700: '#994000',
            800: '#662b00',
            900: '#331500',
          },
        },
        primary: {
          50: '#e6eaf5',
          100: '#ccd5eb',
          200: '#99abd7',
          300: '#6681c3',
          400: '#3357af',
          500: '#0033A0',
          600: '#002980',
          700: '#001f60',
          800: '#001440',
          900: '#000a20',
        },
      },
    },
  },
  plugins: [],
}
