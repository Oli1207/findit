import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: "dark", toggle: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("fi_theme") || "dark"
  );

  // Applique data-theme sur <html> à chaque changement
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("fi_theme", theme);
  }, [theme]);

  // Initialise au premier rendu (sans attendre le prochain useEffect)
  useEffect(() => {
    const saved = localStorage.getItem("fi_theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
