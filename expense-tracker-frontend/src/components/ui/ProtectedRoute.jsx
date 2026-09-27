import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../i18n/I18nContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const { t } = useI18n()

  if (loading) {
    return (
      <div className="container route-skeleton" aria-label={t('loading')}><div className="skeleton skeleton-stat" /><div className="grid-2"><div className="skeleton skeleton-chart" /><div className="skeleton skeleton-chart" /></div></div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
