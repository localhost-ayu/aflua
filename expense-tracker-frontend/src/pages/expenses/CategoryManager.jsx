import { useState } from 'react'
import api from '../../api/axios'
import { useI18n } from '../../i18n/I18nContext'

export default function CategoryManager({ categories = [], loading, error, onChanged, onFeedback }) {
  const { t, categoryName } = useI18n()
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [busy, setBusy] = useState(false)

  async function createCategory(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await api.post('/categories', { name: name.trim() })
      setName('')
      onChanged()
      onFeedback('categoryCreated')
    } catch {
      onFeedback('categorySaveError', true)
    } finally {
      setBusy(false)
    }
  }

  function startEditing(category) {
    setEditingId(category.id)
    setEditName(category.name)
    setEditColor(category.color)
  }

  async function updateCategory(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await api.put(`/categories/${editingId}`, { name: editName.trim(), color: editColor })
      setEditingId(null)
      onChanged()
      onFeedback('categoryUpdated')
    } catch {
      onFeedback('categorySaveError', true)
    } finally {
      setBusy(false)
    }
  }

  async function deleteCategory(category) {
    if (!window.confirm(t('deleteCategoryConfirm', { name: categoryName(category.name) }))) return
    setBusy(true)
    try {
      await api.delete(`/categories/${category.id}`)
      onChanged(category.id)
      onFeedback('categoryDeleted')
    } catch (error) {
      onFeedback(error.response?.status === 409 ? 'categoryInUse' : 'categoryDeleteError', true)
    } finally {
      setBusy(false)
    }
  }

  return <details className="card category-manager mb-3">
    <summary>{t('manageCategories')}</summary>
    <p className="category-help">{t('categoryHelp')}</p>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    {loading && !categories.length && <div aria-label={t('loading')}><div className="skeleton skeleton-row" /><div className="skeleton skeleton-row" /></div>}
    <ul className="category-list" aria-busy={loading}>
      {categories.map(category => <li key={category.id}>
        {editingId === category.id ? <form className="category-edit" onSubmit={updateCategory}>
          <input aria-label={t('categoryName')} value={editName} onChange={event => setEditName(event.target.value)} maxLength={255} required />
          <input aria-label={t('categoryColor')} type="color" value={editColor} onChange={event => setEditColor(event.target.value)} />
          <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !editName.trim()}>{t('saveChanges')}</button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditingId(null)} disabled={busy}>{t('cancel')}</button>
        </form> : <>
          <span className="category-label"><span className="category-dot" style={{ background: category.color }} />{categoryName(category.name)}</span>
          <span className="row-actions"><button className="btn btn-secondary btn-sm" type="button" onClick={() => startEditing(category)} disabled={busy}>{t('edit')}</button><button className="btn btn-danger btn-sm" type="button" onClick={() => deleteCategory(category)} disabled={busy}>{t('delete')}</button></span>
        </>}
      </li>)}
    </ul>
    <form className="category-create" onSubmit={createCategory}>
      <label htmlFor="new-category-name">{t('newCategory')}</label>
      <div><input id="new-category-name" value={name} onChange={event => setName(event.target.value)} maxLength={255} placeholder={t('categoryName')} required /><button className="btn btn-secondary btn-sm" type="submit" disabled={busy || !name.trim()}>{t('addCategory')}</button></div>
    </form>
  </details>
}
