'use client'

import { useLang } from '../contexts/LanguageContext'

export function LanguageToggle({ style }: { style?: React.CSSProperties }) {
  const { lang, setLang } = useLang()
  return (
    <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '3px', ...style }}>
      {(['en', 'es'] as const).map(l => (
        <button key={l} onClick={() => setLang(l)}
          style={{
            padding: '0.25rem 0.6rem',
            borderRadius: '6px',
            border: 'none',
            background: lang === l ? '#fff' : 'transparent',
            color: lang === l ? '#000' : '#666',
            fontWeight: '700',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}>
          {l === 'en' ? '🇺🇸 EN' : '🇪🇸 ES'}
        </button>
      ))}
    </div>
  )
}
