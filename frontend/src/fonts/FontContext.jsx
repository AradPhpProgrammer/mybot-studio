import { createContext, useContext, useState, useEffect } from 'react';

const FontContext = createContext(null);

export const AVAILABLE_FONTS = [
  { id: 'vazirmatn', name: 'Vazirmatn (وزیرمتن)', family: "'Vazirmatn', sans-serif" },
  { id: 'inter', name: 'Inter (Latin)', family: "'Inter', sans-serif" },
  { id: 'jetbrains-mono', name: 'JetBrains Mono', family: "'JetBrains Mono', monospace" }
];

export function FontProvider({ children }) {
  const [currentFont, setCurrentFont] = useState(() => localStorage.getItem('mybot_font') || 'vazirmatn');

  useEffect(() => {
    localStorage.setItem('mybot_font', currentFont);
    const fontObj = AVAILABLE_FONTS.find(f => f.id === currentFont) || AVAILABLE_FONTS[0];
    document.documentElement.style.setProperty('--font-sans', fontObj.family);
  }, [currentFont]);

  return (
    <FontContext.Provider value={{ currentFont, setFont: setCurrentFont, availableFonts: AVAILABLE_FONTS }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFont() {
  const ctx = useContext(FontContext);
  if (!ctx) throw new Error("useFont must be used within FontProvider");
  return ctx;
}
