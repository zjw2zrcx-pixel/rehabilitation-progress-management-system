import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider, useLanguage } from './context';
import LanguageToggle from './components/LanguageToggle';

beforeEach(() => localStorage.clear());

test('uses English by default and switches to Chinese', () => {
  function Example() {
    const { tr } = useLanguage();
    return <><LanguageToggle /><h1>{tr('English interface', '中文界面')}</h1></>;
  }

  render(<LanguageProvider><Example /></LanguageProvider>);
  expect(screen.getByRole('heading', { name: 'English interface' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ZH' }));
  expect(screen.getByRole('heading', { name: '中文界面' })).toBeInTheDocument();
  expect(localStorage.getItem('language')).toBe('zh');
});
