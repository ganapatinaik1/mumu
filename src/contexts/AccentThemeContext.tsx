import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AccentThemeContextValue {
  accentHex: string;
  accentRgb: string;
  setAccentFromHex: (hex: string) => void;
}

const AccentThemeContext = createContext<AccentThemeContextValue | undefined>(undefined);

const DEFAULT_HEX = '#8b5cf6';
const DEFAULT_RGB = '139, 92, 246';

export { DEFAULT_HEX, DEFAULT_RGB };

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  if (isNaN(bigint)) return DEFAULT_RGB;
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}

export const normalizeAccentHex = (hex: string): string => {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = clean[0];
    const g = clean[1];
    const b = clean[2];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return `#${clean.slice(0, 6)}`;
};

export const AccentThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accentHex, setAccentHex] = useState<string>(DEFAULT_HEX);
  const [accentRgb, setAccentRgb] = useState<string>(DEFAULT_RGB);

  const setAccentFromHex = useCallback((hex: string) => {
    const normalized = normalizeAccentHex(hex);
    setAccentHex(normalized);
    const rgb = hexToRgb(normalized);
    setAccentRgb(rgb);

    // Inject CSS variables on :root for global access
    const root = document.documentElement;
    root.style.setProperty('--accent-hex', normalized);
    root.style.setProperty('--accent-rgb', rgb);
    root.style.setProperty('--accent-color', normalized);
    root.style.setProperty('--accent-color-rgb', rgb);
  }, []);

  // Initialize CSS variables with default
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent-hex', DEFAULT_HEX);
    root.style.setProperty('--accent-rgb', DEFAULT_RGB);
    root.style.setProperty('--accent-color', DEFAULT_HEX);
    root.style.setProperty('--accent-color-rgb', DEFAULT_RGB);
  }, []);

  return (
    <AccentThemeContext.Provider value={{ accentHex, accentRgb, setAccentFromHex }}>
      {children}
    </AccentThemeContext.Provider>
  );
};

export const useAccentTheme = () => {
  const ctx = useContext(AccentThemeContext);
  if (!ctx) throw new Error('useAccentTheme must be used within AccentThemeProvider');
  return ctx;
};
