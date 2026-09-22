const configuredApiUrl = import.meta.env.VITE_API_URL;
const API_BASE_URL = configuredApiUrl
  ? configuredApiUrl.startsWith('http')
    ? configuredApiUrl
    : `https://${configuredApiUrl}`
  : 'http://127.0.0.1:8000';

export const VALIDATION_METRICS_FALLBACK = {
  accuracy: 0.991,
  precision: 0.991,
  recall: 0.991,
  f1_score: 0.991,
  dataset: 'PlantVillage validation set',
  sample_count: 17572,
  average: 'weighted'
};

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

export async function fetchModelMetrics() {
  try {
    const res = await fetch(`${API_BASE_URL}/metrics`, {
      method: 'GET',
    });

    if (!res.ok) {
      return VALIDATION_METRICS_FALLBACK;
    }

    return await res.json();
  } catch {
    return VALIDATION_METRICS_FALLBACK;
  }
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
