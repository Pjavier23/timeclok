'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { translations, Lang } from '../lib/translations'

type TranslationSet = Record<string, string>

const LanguageContext = createContext<{
  lang: Lang
  setLang: (l: Lang) => void
  t: TranslationSet
}>({ lang: 'en', setLang: () => {}, t: translations.en })

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem('tc_lang') as Lang
    if (saved === 'en' || saved === 'es') setLangState(saved)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('tc_lang', l)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
