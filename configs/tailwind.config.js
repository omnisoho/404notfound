/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/public/**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "ui-sans-serif", "system-ui"],
      },
      colors: {
        canvas: "#F3F1EB",
        sheet: "#FEFDF9",
        ink: "#060606",
        muted: "#6D7177",
        border: "#DCD6C8",
        navy: "#1E3A5F",
        "navy-light": "#2D4F7C",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
