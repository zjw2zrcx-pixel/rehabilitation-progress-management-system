import React from 'react';
import { useLanguage } from '../context';

export default function LanguageToggle({ floating = false }) {
  const { language, setLanguage, tr } = useLanguage();

  return (
    <div
      className={`language-toggle${floating ? ' language-toggle-floating' : ''}`}
      role="group"
      aria-label={tr('Choose language', '选择语言')}
    >
      <button
        type="button"
        className={language === 'en' ? 'active' : ''}
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        className={language === 'zh' ? 'active' : ''}
        onClick={() => setLanguage('zh')}
        aria-pressed={language === 'zh'}
      >
        {language === 'en' ? 'ZH' : '中文'}
      </button>
    </div>
  );
}
