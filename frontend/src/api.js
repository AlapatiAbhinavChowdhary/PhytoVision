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

export async function explainImage(file, targetClass = null, modelName = 'ConvNeXtTiny') {
  const formData = new FormData();
  formData.append('file', file);

  const params = new URLSearchParams();
  if (modelName) {
    params.set('model_name', modelName);
  }
  if (targetClass) {
    params.set('target_class', targetClass);
  }
  const queryStr = params.toString();
  const url = `${API_BASE_URL}/explain${queryStr ? `?${queryStr}` : ''}`;

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
  try {
    const res = await fetch(`${API_BASE_URL}/model-metrics`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    console.info('Backend /model-metrics unreachable, falling back to static asset...');
  }

  // Resilient fallback to static json file served from public/
  const staticRes = await fetch('/model_metrics.json');
  if (!staticRes.ok) {
    throw new Error('Failed to load model metrics.');
  }
  return await staticRes.json();
}

export async function checkGeminiStatus() {
  try {
    const res = await fetch(`${API_BASE_URL}/gemini-status`);
    if (!res.ok) return { configured: false };
    return await res.json();
  } catch {
    return { configured: false };
  }
}

export async function askGeminiAgronomist({ question, crop_name, disease_name, raw_class, is_healthy }) {
  const res = await fetch(`${API_BASE_URL}/ask-gemini`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      crop_name,
      disease_name,
      raw_class,
      is_healthy: Boolean(is_healthy),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to contact Gemini Agronomist.' }));
    throw new Error(err.detail || 'Failed to get answer from Gemini.');
  }

  return await res.json();
}

export async function predictAllModels(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/predict/all`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Multi-model prediction failed.' }));
    throw new Error(errorData.detail || 'Multi-model prediction failed.');
  }

  return await res.json();
}

export async function fetchModelsInfo() {
  const res = await fetch(`${API_BASE_URL}/models/info`, {
    method: 'GET',
  });

  if (!res.ok) {
    return null;
  }

  return await res.json();
}
