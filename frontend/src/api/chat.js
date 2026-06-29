import axios from 'axios'

const API = 'http://127.0.0.1:8000/api/v1'

export async function getSessions(token) {
  const res = await axios.get(`${API}/chat/sessions`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data
}

export async function createSession(token) {
  const res = await axios.post(`${API}/chat/sessions`, { title: 'New Chat' }, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data
}

export async function sendMessage(sessionId, content, token) {
  const res = await axios.post(`${API}/chat/sessions/${sessionId}/messages`,
    { content },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return res.data
}

export async function getMessages(sessionId, token) {
  const res = await axios.get(`${API}/chat/sessions/${sessionId}/messages`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data
}
