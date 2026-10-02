import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { categoryKeys, translations } from './translations'

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => (localStorage.getItem('aflua-locale') ?? localStorage.getItem('cifra-locale')) === 'en' ? 'en' : 'pt-BR')

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = locale === 'en' ? 'aflua — clarity for your money' : 'aflua — clareza para o seu dinheiro'
    localStorage.setItem('aflua-locale', locale)
  }, [locale])

  const t = useCallback((key, values = {}) => (translations[locale][key] || key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? ''), [locale])
  const currency = value => new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)
  const date = value => value ? new Intl.DateTimeFormat(locale, { timeZone: 'UTC' }).format(new Date(`${value.substring(0, 10)}T12:00:00Z`)) : ''
  const monthName = index => new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2024, index, 1))
  const categoryName = name => t(categoryKeys[name] || name)

  return <I18nContext.Provider value={{ locale, setLocale, t, currency, date, monthName, categoryName }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
