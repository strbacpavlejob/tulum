import React from "react";

interface ThemeProviderProps {
  children?: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return <>{children}</>;
};
