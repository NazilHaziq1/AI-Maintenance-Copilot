import axios from 'axios'

const API = 'http://127.0.0.1:8000/api/v1'

export async function login(email, password) {
  const form = new FormData()
  form.append('username', email)
  form.append('password', password)
  const res = await axios.post(`${API}/auth/login`, form)
  return res.data.access_token
}

export async function register(email, name, password) {
  const res = await axios.post(`${API}/auth/register`, { email, name, password })
  return res.data
}
