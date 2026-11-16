const TOKEN_KEY = 'pc_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* penyimpanan diblokir */
  }
};
export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* penyimpanan diblokir */
  }
};

async function request(path, { method = 'GET', body, form, auth = false } = {}) {
  const headers = {};
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`/api${path}`, { method, headers, body: payload });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* respons tanpa body */
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Permintaan gagal (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // publik
  getPage: () => request('/page'),
  getAssets: () => request('/assets'),
  countRemix: () => request('/remix', { method: 'POST' }),

  // admin
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  adminGetPage: () => request('/admin/page', { auth: true }),
  adminSavePage: (layout) => request('/admin/page', { method: 'PUT', body: { layout }, auth: true }),
  adminPublish: () => request('/admin/publish', { method: 'POST', auth: true }),
  adminGetAssets: () => request('/admin/assets', { auth: true }),
  adminUploadAsset: (form) => request('/admin/assets', { method: 'POST', form, auth: true }),
  adminDeleteAsset: (id) => request(`/admin/assets/${id}`, { method: 'DELETE', auth: true }),
  adminGetTemplates: () => request('/admin/templates', { auth: true }),
  adminApplyTemplate: (id) => request(`/admin/templates/${encodeURIComponent(id)}/apply`, { method: 'POST', auth: true }),
};
