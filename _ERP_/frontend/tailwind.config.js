/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.12)",
        DEFAULT: "0 2px 8px -2px rgba(0, 0, 0, 0.18), 0 1px 3px 0 rgba(0, 0, 0, 0.12)",
        md: "0 8px 16px -6px rgba(0, 0, 0, 0.2), 0 2px 6px -2px rgba(0, 0, 0, 0.14)",
        lg: "0 14px 28px -10px rgba(0, 0, 0, 0.24), 0 6px 10px -4px rgba(0, 0, 0, 0.16)",
        xl: "0 20px 35px -12px rgba(0, 0, 0, 0.28), 0 8px 12px -6px rgba(0, 0, 0, 0.18)",
        "2xl": "0 28px 60px -16px rgba(0, 0, 0, 0.34)",
      },
    },
  },
  plugins: [],
}
