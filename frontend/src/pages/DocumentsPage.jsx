import { useState, useEffect } from 'react'
import { uploadDocument, listDocuments } from '../api/documents'

export default function DocumentsPage({ token, onGoToChat }) {
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => { loadDocuments() }, [])

  async function loadDocuments() {
    try {
      const docs = await listDocuments(token)
      setDocuments(docs)
    } catch (err) { console.error(err) }
  }

  async function handleUpload(file) {
    if (!file || file.type !== 'application/pdf') {
      setMessage('Please upload a PDF file')
      return
    }
    setUploading(true)
    setMessage('')
    try {
      await uploadDocument(file, token)
      setMessage('✓ Uploaded successfully. Processing in background...')
      setTimeout(loadDocuments, 2000)
    } catch (err) {
      setMessage('Upload failed. Please try again.')
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
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#ececec' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1e1e1e', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onGoToChat} style={{
            background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 20, lineHeight: 1
          }}>←</button>
          <span style={{ fontSize: 16, fontWeight: 500 }}>Documents</span>
        </div>
        <button onClick={onGoToChat} style={{
          padding: '8px 16px', background: '#252525', border: '1px solid #333',
          borderRadius: 8, color: '#ececec', cursor: 'pointer', fontSize: 13
        }}>
          Go to Chat →
        </button>
      </div>

      <div style={{ maxWidth: 640, margin: '48px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Upload Manuals</h1>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 32 }}>
          Upload PDF maintenance manuals to enable AI-powered Q&A
        </p>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? '#555' : '#2a2a2a'}`,
            borderRadius: 12, padding: '48px 24px', textAlign: 'center',
            background: dragOver ? '#1a1a1a' : 'transparent',
            transition: 'all 0.15s', marginBottom: 24
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 15, color: '#888', marginBottom: 8 }}>
            Drag & drop a PDF here
          </div>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>or</div>
          <label style={{
            padding: '10px 20px', background: '#252525', border: '1px solid #333',
            borderRadius: 8, color: '#ececec', cursor: 'pointer', fontSize: 13
          }}>
            {uploading ? 'Uploading...' : 'Choose file'}
            <input
              type="file" accept=".pdf" style={{ display: 'none' }}
              onChange={e => handleUpload(e.target.files[0])}
              disabled={uploading}
            />
          </label>
          {message && (
            <div style={{
              marginTop: 16, fontSize: 13,
              color: message.startsWith('✓') ? '#22c55e' : '#ef4444'
            }}>
              {message}
            </div>
          )}
        </div>

        {/* Document list */}
        {documents.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Uploaded ({documents.length})
            </div>
            {documents.map(doc => (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', background: '#171717', border: '1px solid #2a2a2a',
                borderRadius: 8, marginBottom: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>📄</span>
                  <div>
                    <div style={{ fontSize: 13, color: '#d4d4d4' }}>{doc.title}</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}
                    </div>
                  </div>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 11,
                  background: doc.status === 'ready' ? '#14291e' : '#2a1f0a',
                  color: doc.status === 'ready' ? '#22c55e' : '#f59e0b',
                  border: `1px solid ${doc.status === 'ready' ? '#1a3d28' : '#3d2f0a'}`
                }}>
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
