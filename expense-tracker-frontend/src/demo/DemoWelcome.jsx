import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useI18n } from '../i18n/I18nContext'
import LanguageSelect from '../components/ui/LanguageSelect'

/** no modo demonstração, a tela de login vira a porta de entrada: sem cadastro nem senha */
export default function DemoWelcome() {
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()
  const navigate = useNavigate()

  async function enter() {
    setLoading(true)
    try {
      await login('visitante@aflua.demo', 'demo')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return <div className="auth-wrapper"><div className="auth-card">
    <div className="auth-brand"><span className="brand-mark" aria-hidden="true">a</span><span className="brand-word">aflua</span><span className="demo-pill">{t('demoBadge')}</span></div>
    <div className="auth-tools"><LanguageSelect /><button type="button" className="icon-button" onClick={toggleTheme} aria-label={t(theme === 'dark' ? 'lightMode' : 'darkMode')}>{theme === 'dark' ? '☀' : '☾'}</button></div>
    <h1>{t('demoTitle')}</h1>
    <p>{t('demoIntro')}</p>
    <p className="demo-privacy">{t('demoPrivacy')}</p>
    <button type="button" className="btn btn-primary" onClick={enter} disabled={loading}>{loading ? t('demoEntering') : t('demoEnter')}</button>
    <p className="auth-footer"><a href="https://github.com/localhost-ayu/aflua" target="_blank" rel="noreferrer">{t('demoSource')} ↗</a></p>
  </div></div>
}
