// Shared Tailwind tokens for the inner pages: same names as before, monochrome values.
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#0a0a0a", "primary-container": "#0a0a0a", "on-primary": "#ffffff", "on-primary-container": "#ffffff",
        "secondary": "#262626", "secondary-container": "#efefef", "on-secondary": "#ffffff", "on-secondary-container": "#0a0a0a",
        "tertiary": "#262626", "on-tertiary": "#ffffff",
        "background": "#ffffff", "on-background": "#0a0a0a",
        "surface": "#ffffff", "surface-bright": "#ffffff", "surface-dim": "#dcdcdc", "surface-variant": "#ececec",
        "surface-container-lowest": "#ffffff", "surface-container-low": "#f5f5f5", "surface-container": "#efefef",
        "surface-container-high": "#e8e8e8", "surface-container-highest": "#e0e0e0",
        "on-surface": "#0a0a0a", "on-surface-variant": "#595959",
        "outline": "#8c8c8c", "outline-variant": "#e0e0e0",
        "error": "#b3261e", "on-error": "#ffffff", "error-container": "#fbe9e7", "on-error-container": "#8c1d18"
      },
      borderRadius: { DEFAULT: "0.25rem", lg: "0.375rem", xl: "0.375rem", "2xl": "0.625rem", full: "9999px" },
      spacing: { gutter: "32px", "section-gap": "clamp(72px, 4rem + 5vw, 128px)", "container-max": "1200px", "margin-desktop": "64px", unit: "8px", "margin-mobile": "24px" },
      fontFamily: {
        "display-lg": ["Inter", "system-ui", "sans-serif"], "display-lg-mobile": ["Inter", "system-ui", "sans-serif"],
        "headline-lg": ["Inter", "system-ui", "sans-serif"], "headline-md": ["Inter", "system-ui", "sans-serif"],
        "body-lg": ["Inter", "system-ui", "sans-serif"], "body-md": ["Inter", "system-ui", "sans-serif"], "label-sm": ["Inter", "system-ui", "sans-serif"]
      },
      fontSize: {
        "display-lg": ["clamp(2.75rem, 1.5rem + 4.6vw, 4.75rem)", { lineHeight: "1.04", letterSpacing: "-0.035em", fontWeight: "400" }],
        "display-lg-mobile": ["2.5rem", { lineHeight: "1.06", letterSpacing: "-0.03em", fontWeight: "400" }],
        "headline-lg": ["clamp(2rem, 1.45rem + 2.3vw, 3.25rem)", { lineHeight: "1.08", letterSpacing: "-0.03em", fontWeight: "400" }],
        "headline-md": ["1.75rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "400" }],
        "body-lg": ["1.0625rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["1rem", { lineHeight: "1.55", fontWeight: "400" }],
        "label-sm": ["0.8125rem", { lineHeight: "1.2", letterSpacing: "0.01em", fontWeight: "500" }]
      }
    }
  }
};
