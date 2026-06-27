import { useState, useEffect, useRef } from 'react'
import { createSession, sendMessage, getMessages } from '../api/chat'
import { listDocuments } from '../api/documents'

export default function ChatPage({ token, onGoToDocuments, onLogout }) {
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => { initSession(); loadDocuments(); }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function initSession() {
    try {
      const session = await createSession(token)
      setSessionId(session.id)
    } catch (err) { console.error(err) }
  }

  async function loadDocuments() {
    try {
      const docs = await listDocuments(token)
      setDocuments(docs)
    } catch (err) { console.error(err) }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || !sessionId || loading) return
    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await sendMessage(sessionId, input, token)
      setMessages(prev => [...prev, { role: 'assistant', content: res.answer, sources: res.sources }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error getting response.' }])
    }
    setLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f0f0f' }}>
      {/* Sidebar */}
      <div style={{
        width: 260, background: '#171717', borderRight: '1px solid #2a2a2a',
        display: 'flex', flexDirection: 'column', padding: '16px 12px', gap: 8, flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{ padding: '8px 12px', marginBottom: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#ececec' }}>🔧 Maintenance Copilot</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>AI-powered manual assistant</div>
        </div>

        {/* New Chat */}
        <button onClick={() => { setMessages([]); initSession() }} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
          background: '#252525', border: '1px solid #333', borderRadius: 8,
          color: '#ececec', cursor: 'pointer', fontSize: 13, width: '100%'
        }}>
          <span style={{ fontSize: 16 }}>+</span> New Chat
        </button>

        {/* Documents section */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: '#555', padding: '4px 12px', textTransform: 'uppercase', letterSpacing: 1 }}>
            Documents
          </div>
          {documents.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 12, color: '#555' }}>No documents yet</div>
          ) : (
            documents.map(doc => (
              <div key={doc.id} style={{
                padding: '8px 12px', fontSize: 12, color: '#888', borderRadius: 6,
                display: 'flex', alignItems: 'center', gap: 6, marginTop: 2
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: doc.status === 'ready' ? '#22c55e' : '#f59e0b'
                }}/>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.title}
                </span>
              </div>
            ))
          )}
          <button onClick={onGoToDocuments} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            background: 'transparent', border: 'none', borderRadius: 6,
            color: '#555', cursor: 'pointer', fontSize: 12, width: '100%', marginTop: 4
          }}>
            + Upload document
          </button>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Logout */}
        <button onClick={onLogout} style={{
          padding: '8px 12px', background: 'transparent', border: 'none',
          color: '#555', cursor: 'pointer', fontSize: 12, textAlign: 'left', borderRadius: 6
        }}>
          Sign out
        </button>
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 0' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '20vh' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔧</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: '#ececec', marginBottom: 8 }}>
                Maintenance Copilot
              </div>
              <div style={{ fontSize: 14, color: '#555', maxWidth: 360, margin: '0 auto' }}>
                Upload a maintenance manual and ask questions about it. I'll find the relevant information and cite the exact page.
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} style={{
                maxWidth: 720, margin: '0 auto', padding: '8px 24px',
              }}>
                {msg.role === 'user' ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <div style={{
                      background: '#2a2a2a', borderRadius: 16, padding: '12px 16px',
                      maxWidth: '75%', fontSize: 14, lineHeight: 1.6, color: '#ececec'
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: '#333',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, flexShrink: 0, marginTop: 2
                    }}>🔧</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, lineHeight: 1.8, color: '#d4d4d4' }}>
                        {msg.content}
                      </div>
                      {msg.sources && msg.sources.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {[...new Set(msg.sources.map(s => s.page_number))].map(page => (
                            <span key={page} style={{
                              padding: '2px 8px', background: '#1e1e1e', border: '1px solid #333',
                              borderRadius: 4, fontSize: 11, color: '#666'
                            }}>
                              Page {page}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div style={{ maxWidth: 720, margin: '0 auto', padding: '8px 24px' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#333',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14
                }}>🔧</div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', paddingTop: 6 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#555',
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`
                    }}/>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #1e1e1e' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your manuals..."
              rows={1}
              style={{
                width: '100%', padding: '14px 52px 14px 16px',
                background: '#1e1e1e', border: '1px solid #2a2a2a',
                borderRadius: 12, color: '#ececec', fontSize: 14,
                resize: 'none', outline: 'none', lineHeight: 1.5,
                fontFamily: 'inherit'
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                position: 'absolute', right: 10, bottom: 10,
                width: 32, height: 32, borderRadius: 6,
                background: input.trim() ? '#ececec' : '#2a2a2a',
                border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: input.trim() ? '#0f0f0f' : '#555', fontSize: 16, transition: 'all 0.15s'
              }}
            >
              ↑
            </button>
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#444', marginTop: 8 }}>
            Press Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
