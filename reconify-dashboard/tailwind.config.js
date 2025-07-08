/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,jsx}",
    ],
    theme: {
      extend: {
        colors: {
          primary: {
            DEFAULT: '#646cff', // brand primary
            dark: '#535bf2',
          },
          success: {
            DEFAULT: '#15b79e',
          },
        },
      },
    },
    plugins: [],
  };
  