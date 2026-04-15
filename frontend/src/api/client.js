const BASE = '/api'

// Token storage
export const auth = {
  getToken:  ()  => sessionStorage.getItem('ipam_token'),
  getUser:   ()  => { try { return JSON.parse(sessionStorage.getItem('ipam_user') || 'null') } catch { return null } },
  setSession: (data) => {
    sessionStorage.setItem('ipam_token', data.access_token)
    sessionStorage.setItem('ipam_user', JSON.stringify({ username: data.username, role: data.role }))
  },
  clear: () => { sessionStorage.removeItem('ipam_token'); sessionStorage.removeItem('ipam_user') },
  isAdmin:  () => auth.getUser()?.role === 'admin',
  isEditor: () => ['admin', 'editor'].includes(auth.getUser()?.role),
  isViewer: () => !!auth.getUser(),
}

async function request(method, path, body) {
  const token = auth.getToken()
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) { auth.clear(); window.location.reload(); return }
  if (res.status === 402) {
    window.dispatchEvent(new CustomEvent('purchase_required'))
    throw new Error('purchase_required')
  }
  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Request failed')
  return data
}

export const api = {
  // Dashboard
  getStats: () => request('GET', '/dashboard/stats'),

  // Subnets
  getSubnets:   ()         => request('GET', '/subnets/'),
  createSubnet: (body)     => request('POST', '/subnets/', body),
  updateSubnet: (id, body) => request('PATCH', `/subnets/${id}`, body),
  deleteSubnet: (id)       => request('DELETE', `/subnets/${id}`),

  // IPs
  getIPs: (params = {}) => {
    const q = new URLSearchParams()
    if (params.subnet_id) q.set('subnet_id', params.subnet_id)
    if (params.status)    q.set('status', params.status)
    if (params.search)    q.set('search', params.search)
    return request('GET', `/ips/?${q}`)
  },
  createIP: (body)     => request('POST', '/ips/', body),
  updateIP: (id, body) => request('PATCH', `/ips/${id}`, body),
  deleteIP: (id)       => request('DELETE', `/ips/${id}`),

  // Audit Log
  getAuditLogs: (params = {}) => {
    const q = new URLSearchParams()
    if (params.action)     q.set('action', params.action)
    if (params.table_name) q.set('table_name', params.table_name)
    return request('GET', `/audit/?${q}`)
  },

  // CSV Import
  importCSV: async (subnetId, file) => {
    const form = new FormData()
    form.append('file', file)
    const token = auth.getToken()
    const res = await fetch(`${BASE}/import/ips/csv?subnet_id=${subnetId}`, {
      method: 'POST', body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.status === 402) {
      window.dispatchEvent(new CustomEvent('purchase_required'))
      throw new Error('purchase_required')
    }
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Import failed')
    return data
  },
  importSubnetsCSV: async (file) => {
    const form = new FormData()
    form.append('file', file)
    const token = auth.getToken()
    const res = await fetch(`${BASE}/import/subnets/csv`, {
      method: 'POST', body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.status === 402) {
      window.dispatchEvent(new CustomEvent('purchase_required'))
      throw new Error('purchase_required')
    }
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Import failed')
    return data
  },

  // Generic methods
  get:    (path)       => request('GET',    path),
  post:   (path, body) => request('POST',   path, body),
  put:    (path, body) => request('PUT',    path, body),
  patch:  (path, body) => request('PATCH',  path, body),
  delete: (path)       => request('DELETE', path),
}
