import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/axios'
import { useI18n } from '../i18n/I18nContext'

export function useFetch(url) {
  const { t } = useI18n()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const requestId = useRef(0)

  const refetch = useCallback(async () => {
    const current = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const response = await api.get(url)
      if (current === requestId.current) setData(response.data)
    } catch {
      if (current === requestId.current) setError(t('loadError'))
    } finally {
      if (current === requestId.current) setLoading(false)
    }
  }, [url, t])

  useEffect(() => {
    // The request updates loading asynchronously; the effect also invalidates older responses.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
    const sequence = requestId
    return () => { sequence.current++ }
  }, [refetch])

  return { data, loading, error, refetch }
}
