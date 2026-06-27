import axios from 'axios'

const API = 'http://127.0.0.1:8000/api/v1'

export async function uploadDocument(file, token) {
  const form = new FormData()
  form.append('file', file)
  const res = await axios.post(`${API}/documents/upload`, form, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data
}

export async function listDocuments(token) {
  const res = await axios.get(`${API}/documents`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data
}
