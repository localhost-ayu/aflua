import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useI18n } from '../i18n/I18nContext'
import { useFormErrors } from '../hooks/useFormErrors'
import LanguageSelect from '../components/ui/LanguageSelect'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()
  const { errors, globalError, handleApiError } = useFormErrors()
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    try { await login(email, password); navigate('/dashboard') }
    catch (error) { handleApiError(error) }
    finally { setLoading(false) }
  }

  return <div className="auth-wrapper"><div className="auth-card">
    <div className="auth-brand"><span className="brand-mark" aria-hidden="true">a</span><span className="brand-word">aflua</span></div>
    <div className="auth-tools"><LanguageSelect /><button type="button" className="icon-button" onClick={toggleTheme} aria-label={t(theme === 'dark' ? 'lightMode' : 'darkMode')}>{theme === 'dark' ? '☀' : '☾'}</button></div>
    <h1>{t('welcome')}</h1><p>{t('welcomeSubtitle')}</p>
    {globalError && <div className="alert alert-error" role="alert">{globalError}</div>}
    <form onSubmit={handleSubmit}>
      <div className="form-group"><label htmlFor="email">{t('email')}</label><input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="seu@email.com" autoComplete="email" required />{errors.email && <span className="error">{errors.email}</span>}</div>
      <div className="form-group"><label htmlFor="password">{t('password')}</label><input id="password" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" autoComplete="current-password" required />{errors.password && <span className="error">{errors.password}</span>}</div>
      <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? t('signingIn') : t('signIn')}</button>
    </form>
    <p className="auth-footer">{t('noAccount')} <Link to="/register">{t('signUp')}</Link></p>
  </div></div>
}
