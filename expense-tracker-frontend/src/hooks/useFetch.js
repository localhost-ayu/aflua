import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useI18n } from '../i18n/I18nContext'

export function useFetch(url) {
  const { t } = useI18n()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(url)
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.message || t('loadError'))
    } finally {
      setLoading(false)
    }
  }, [url, t])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
