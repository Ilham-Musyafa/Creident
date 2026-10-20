'use client';
import { useEffect, useState } from 'react';
import { SegmentedControl } from './SegmentedControl';
const options = ['Light', 'Dark', 'System'] as const;
type Choice = typeof options[number];
export function ThemeSelector() {
  const [choice, setChoice] = useState<Choice>('System');
  useEffect(() => { const theme = document.documentElement.dataset.theme; setChoice(theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'); }, []);
  function change(next: Choice) {
    setChoice(next);
    document.documentElement.dataset.theme = next.toLowerCase();
    try { localStorage.setItem('halcyvault-theme', next.toLowerCase()); } catch { /* Private browsing can block storage. */ }
  }
  return <SegmentedControl label="Appearance" options={options} value={choice} onChange={change}/>;
}
