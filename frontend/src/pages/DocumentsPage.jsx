import { useState, useEffect } from 'react'
import { uploadDocument, listDocuments } from '../api/documents'

const MAX_SIZE_MB = 25

export default function DocumentsPage({ onGoToChat }) {
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Load the document list; keep polling while any document is still
  // processing so its status flips to Ready without a manual refresh.
  useEffect(() => {
    let cancelled = false
    let timer = null

    async function load() {
      try {
        const docs = await listDocuments()
        if (cancelled) return
        setDocuments(docs)
        if (docs.some(d => d.status !== 'ready')) {
          timer = setTimeout(load, 3000)
        }
      } catch (err) { console.error(err) }
    }

    load()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [reloadKey])

  async function handleUpload(file) {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setMessage({ type: 'error', text: 'Only PDF files are supported.' })
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setMessage({ type: 'error', text: `File is too large (max ${MAX_SIZE_MB} MB).` })
      return
    }
    setUploading(true)
    setMessage(null)
    try {
      await uploadDocument(file)
      setMessage({ type: 'success', text: 'Uploaded. Processing in the background — status updates automatically.' })
      setReloadKey(k => k + 1)
    } catch (err) {
      const detail = err.response?.data?.detail
      setMessage({
        type: 'error',
        text: detail || (err.response ? 'Upload failed. Please try again.' : 'Could not reach the server. Is the backend running?'),
      })
    }
    setUploading(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  return (
    <div className="docs-page">
      <header className="docs-header">
        <div className="docs-header-left">
          <button className="back-btn" onClick={onGoToChat} aria-label="Back to chat">←</button>
          <span className="docs-header-title">Documents</span>
        </div>
        <button className="go-chat-btn" onClick={onGoToChat}>Go to Chat →</button>
      </header>

      <div className="docs-container">
        <h1 className="docs-title">Upload manuals</h1>
        <p className="docs-subtitle">
          Upload PDF maintenance manuals to enable AI-powered Q&amp;A with page citations.
        </p>

        <div
          className={`dropzone${dragOver ? ' drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="dropzone-icon">📄</div>
          <div className="dropzone-text">Drag &amp; drop a PDF here</div>
          <div className="dropzone-or">or</div>
          <label className={`choose-file-btn${uploading ? ' disabled' : ''}`}>
            {uploading ? 'Uploading…' : 'Choose file'}
            <input
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={e => { handleUpload(e.target.files[0]); e.target.value = '' }}
              disabled={uploading}
            />
          </label>
          {message && (
            <div className={`upload-message ${message.type}`}>
              {message.type === 'success' ? '✓ ' : ''}{message.text}
            </div>
          )}
        </div>

        {documents.length > 0 && (
          <>
            <div className="docs-list-label">Uploaded ({documents.length})</div>
            {documents.map(doc => (
              <div key={doc.id} className="doc-card">
                <div className="doc-card-left">
                  <span className="doc-card-icon">📄</span>
                  <div>
                    <div className="doc-card-title">{doc.title}</div>
                    <div className="doc-card-date">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}
                    </div>
                  </div>
                </div>
                <span className={`doc-badge ${doc.status === 'ready' ? 'ready' : 'processing'}`}>
                  {doc.status === 'ready' ? '✓ Ready' : '⏳ Processing'}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
