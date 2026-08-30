import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem('language') || 'en');

  const setLanguage = useCallback((nextLanguage) => {
    setLanguageState(nextLanguage);
    localStorage.setItem('language', nextLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = language === 'zh'
      ? '康复进展管理系统'
      : 'Rehabilitation Progress Management System';
  }, [language]);

  const tr = useCallback((english, chinese) => (
    language === 'zh' ? chinese : english
  ), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, tr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });

  const loginUser = useCallback((userObj) => {
    setUser(userObj);
    localStorage.setItem('user', JSON.stringify(userObj));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser: loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export const useLanguage = () => useContext(LanguageContext);
