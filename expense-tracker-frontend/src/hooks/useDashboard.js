import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import { useI18n } from '../i18n/I18nContext'

export function useDashboard(month, year) {
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
      // Preparing occurrences is a separate write; the dashboard GET only reads.
      await api.post('/recurring-occurrences/prepare', { month, year })
      if (current !== requestId.current) return
      const response = await api.get(`/dashboard?month=${month}&year=${year}`)
      if (current === requestId.current) setData(response.data)
    } catch {
      if (current === requestId.current) setError(t('loadError'))
    } finally {
      if (current === requestId.current) setLoading(false)
    }
  }, [month, year, t])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
    const sequence = requestId
    return () => { sequence.current++ }
  }, [refetch])

  return { data: data?.month === month && data?.year === year ? data : null, loading, error, refetch }
}
