import { useState, useEffect } from 'react'
import { uploadDocument, listDocuments } from '../api/documents'

export default function DocumentsPage({ token, onGoToChat }) {
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadDocuments()
  }, [])

  async function loadDocuments() {
    try {
      const docs = await listDocuments(token)
      setDocuments(docs)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setMessage('')
    try {
      await uploadDocument(file, token)
      setMessage('Document uploaded. Processing in background...')
      setTimeout(loadDocuments, 2000)
    } catch (err) {
      setMessage('Upload failed')
    }
    setUploading(false)
  }

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>📄 Documents</h1>
        <button onClick={onGoToChat} style={btnStyle}>💬 Go to Chat</button>
      </div>

      <div style={{ margin: '24px 0', padding: 20, border: '2px dashed #ddd', borderRadius: 12, textAlign: 'center' }}>
        <p style={{ color: '#666', marginBottom: 12 }}>Upload a PDF maintenance manual</p>
        <input type="file" accept=".pdf" onChange={handleUpload} disabled={uploading} />
        {uploading && <p style={{ color: '#666', marginTop: 8 }}>Uploading...</p>}
        {message && <p style={{ color: 'green', marginTop: 8 }}>{message}</p>}
      </div>

      <h2 style={{ marginBottom: 16 }}>Uploaded Manuals</h2>
      {documents.length === 0 && <p style={{ color: '#666' }}>No documents yet. Upload a PDF to get started.</p>}
      {documents.map(doc => (
        <div key={doc.id} style={cardStyle}>
          <span style={{ fontWeight: 500 }}>{doc.title}</span>
          <span style={{
            padding: '2px 10px', borderRadius: 20, fontSize: 12,
            backgroundColor: doc.status === 'ready' ? '#e6f4ea' : '#fff3e0',
            color: doc.status === 'ready' ? '#2e7d32' : '#e65100'
          }}>
            {doc.status}
          </span>
        </div>
      ))}
    </div>
  )
}

const btnStyle = {
  padding: '8px 16px', backgroundColor: '#1a1a1a', color: 'white',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14
}

const cardStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 16px', marginBottom: 8, borderRadius: 8,
  border: '1px solid #eee', backgroundColor: '#fafafa'
}
