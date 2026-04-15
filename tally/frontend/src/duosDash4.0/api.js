const API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = "https://utsavevents.onrender.com/api/duosdash/";

export function getToken() {
  return localStorage.getItem('dd_token') || ''
}

export function setToken(token) {
  localStorage.setItem('dd_token', token)
}

export function clearToken() {
  localStorage.removeItem('dd_token')
}

export async function apiCall(path, opts = {}) {
  const token = getToken()
  const res = await fetch(API_BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export async function login(username, password) {
   console.log("LOGIN CALLED"); // add this

  const res = await fetch(API_BASE + '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Invalid credentials')
  return data
}