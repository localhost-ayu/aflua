import { useI18n } from '../../i18n/I18nContext'

export default function LanguageSelect() {
  const { locale, setLocale, t } = useI18n()
  return <select className="language-select" value={locale} onChange={event => setLocale(event.target.value)} aria-label={t('language')}><option value="pt-BR">PT</option><option value="en">EN</option></select>
}
