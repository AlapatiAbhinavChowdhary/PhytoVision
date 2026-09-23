const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();

function getApiBaseUrl() {
  if (rawApiUrl) {
    if (rawApiUrl.startsWith('/') || rawApiUrl.startsWith('http')) {
      return rawApiUrl.replace(/\/+$/, '');
    }
    return `https://${rawApiUrl}`.replace(/\/+$/, '');
  }
  // If running in cloud production (e.g. Vercel), route through /api proxy
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api';
  }
  return 'http://127.0.0.1:8000';
}

export const API_BASE_URL = getApiBaseUrl();

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
    if (!res.ok) return { healthy: false };
    const data = await res.json();
    return { healthy: data.status === 'healthy', modelLoaded: data.model_loaded };
  } catch {
    return { healthy: false, modelLoaded: false };
  }
}

export async function predictImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Prediction failed.' }));
    throw new Error(errorData.detail || 'Prediction failed.');
  }

  return await res.json();
}

export async function explainImage(file, targetClass = null) {
  const formData = new FormData();
  formData.append('file', file);

  let url = `${API_BASE_URL}/explain`;
  if (targetClass) {
    url += `?target_class=${encodeURIComponent(targetClass)}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Explanation failed.' }));
    throw new Error(errorData.detail || 'Failed to generate visual explanation.');
  }

  return await res.json();
}

export async function fetchDiseaseInfo(rawClass) {
  const res = await fetch(`${API_BASE_URL}/disease-info/${encodeURIComponent(rawClass)}`, {
    method: 'GET',
  });

  if (!res.ok) {
    return null;
  }

  return await res.json();
}

export async function fetchModelMetrics() {
  const res = await fetch(`${API_BASE_URL}/model-metrics`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to load model metrics.' }));
    throw new Error(errorData.detail || 'Failed to load model metrics.');
  }

  return await res.json();
}
