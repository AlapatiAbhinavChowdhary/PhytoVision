const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').trim();
const normalizedUrl = rawApiUrl.startsWith('http')
  ? rawApiUrl
  : `https://${rawApiUrl}`;
export const API_BASE_URL = normalizedUrl.replace(/\/+$/, '');

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
