import os
import json
import logging
import requests
from typing import Dict, Any, Optional

logger = logging.getLogger("plant-disease-api.gemini")

GEMINI_API_MODELS = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
]

class GeminiAgronomistService:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    @property
    def api_key(self) -> Optional[str]:
        key = os.getenv("GEMINI_API_KEY", "").strip()
        return key if key else None

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def explain_disease(
        self,
        raw_class: str,
        crop_name: str,
        disease_name: str,
        is_healthy: bool,
        fallback_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generates an in-depth disease explanation, causes, organic remedies,
        chemical treatments, and preventive measures using Google Gemini API.
        Falls back to local pathology database if API key is not configured or on network error.
        """
        cache_key = f"{raw_class}_{is_healthy}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        if not self.is_configured:
            logger.info("GEMINI_API_KEY not configured. Using local agricultural knowledge base.")
            result = self._get_local_fallback(raw_class, crop_name, disease_name, is_healthy, fallback_info)
            result["source"] = "local_database"
            result["api_configured"] = False
            return result

        try:
            gemini_result = self._call_gemini_api(crop_name, disease_name, raw_class, is_healthy)
            gemini_result["source"] = "gemini"
            gemini_result["api_configured"] = True
            self._cache[cache_key] = gemini_result
            return gemini_result

        except Exception as e:
            logger.warning(f"Gemini API generation failed for {raw_class}: {e}. Falling back to local data.")
            fallback = self._get_local_fallback(raw_class, crop_name, disease_name, is_healthy, fallback_info)
            fallback["source"] = "local_database_fallback"
            fallback["api_configured"] = True
            fallback["error_message"] = str(e)
            return fallback

    def ask_agronomist(
        self,
        question: str,
        crop_name: str,
        disease_name: str,
        raw_class: str,
        is_healthy: bool
    ) -> Dict[str, Any]:
        """
        Answers a custom farmer/gardener question about the diagnosed plant condition.
        """
        if not self.is_configured:
            return {
                "answer": "Gemini API is not configured yet. Please set your GEMINI_API_KEY in the backend .env file to enable custom interactive consultations.",
                "source": "local",
                "api_configured": False
            }

        prompt = f"""
You are an expert plant pathologist and agronomist consulting a farmer/gardener in the PhytoVision crop diagnostics system.

Context:
- Crop: {crop_name}
- Diagnosed Condition: {disease_name} (Class: {raw_class})
- Is Healthy: {is_healthy}

User Question: "{question}"

Instructions:
- Provide a clear, actionable, friendly, and science-grounded response.
- If applicable, mention practical organic/safe steps they can take immediately.
- Keep the response concise (2-4 paragraphs max) with bullet points where helpful.
"""
        try:
            answer_text = self._call_gemini_raw_prompt(prompt)
            return {
                "answer": answer_text,
                "source": "gemini",
                "api_configured": True
            }
        except Exception as e:
            logger.error(f"Ask agronomist query failed: {e}")
            return {
                "answer": f"Unable to fetch answer from Gemini at this moment: {e}",
                "source": "error",
                "api_configured": True
            }

    def _call_gemini_api(
        self,
        crop_name: str,
        disease_name: str,
        raw_class: str,
        is_healthy: bool
    ) -> Dict[str, Any]:
        """
        Calls Gemini API with structured JSON output schema.
        """
        api_key = self.api_key
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set.")

        if is_healthy:
            system_instruction = (
                f"You are a master agronomist for PhytoVision. The user uploaded a photo of a {crop_name} plant, "
                f"which has been verified as healthy. Provide an expert maintenance, soil fertility, and preventive care guide."
            )
            prompt = f"""
Analyze the healthy status of this {crop_name} plant.

Return ONLY a valid JSON object with the following exact keys:
{{
  "disease_overview": "A description celebrating the plant's healthy foliage and explaining normal vigorous physiological benchmarks for {crop_name}.",
  "symptoms": ["3 positive visual signs of a healthy {crop_name} leaf (e.g. turgor pressure, clean venation, vibrant coloration)"],
  "causes_and_spread": "Explanation of the optimal environmental and soil conditions (moisture, sunlight, aeration) that keep this crop resilient against pathogens.",
  "organic_remedies": [
    "Recommended organic nutrient boost or biostimulant (e.g. compost tea, worm castings, balanced organic seaweed extract)",
    "Root zone care (e.g. organic mulch to regulate soil temperature and suppress fungal spores)"
  ],
  "chemical_treatments": [
    "Preventative mineral supplements if needed (e.g. calcium or magnesium foliar spray to strengthen leaf cell walls)",
    "Clear note that chemical fungicides/pesticides are NOT recommended for healthy foliage"
  ],
  "preventative_measures": [
    "Best watering practice to avoid future fungal disease (e.g. drip irrigation at base, water in early morning)",
    "Air circulation and spacing guidelines",
    "Seasonal scouting schedule for common {crop_name} pests"
  ],
  "urgency_level": "Low - Routine Maintenance",
  "farmer_pro_tip": "A specialized pro-tip from an agricultural extension officer to maximize {crop_name} yield and vigor."
}}
"""
        else:
            system_instruction = (
                f"You are an expert agricultural plant pathologist for PhytoVision. Provide an authoritative, "
                f"comprehensive disease diagnosis breakdown, causes, organic remedies, chemical treatments, and prevention protocols for {crop_name} affected by {disease_name}."
            )
            prompt = f"""
Diagnosed Crop: {crop_name}
Condition: {disease_name} (Dataset identifier: {raw_class})

Return ONLY a valid JSON object with the following exact keys:
{{
  "disease_overview": "A detailed 2-3 sentence explanation of what this disease is, pathogen type (fungal, bacterial, viral, or pest), and how it destroys leaf cells and impairs photosynthesis.",
  "symptoms": [
    "Early stage visual indicator on foliage",
    "Advanced stage symptom (lesions, concentric rings, chlorosis, spore pustules, or wilting)",
    "Effect on stems, flowers, or fruit"
  ],
  "causes_and_spread": "How this disease develops and spreads (temperature range, relative humidity, windborne spores, rain splash, soil contamination, or insect vectors).",
  "organic_remedies": [
    "Organic treatment 1 (e.g. specific biological agent, copper soap, neem oil, sulfur spray, or baking soda/potassium bicarbonate solution with application instructions)",
    "Organic treatment 2 (e.g. physical cultural sanitation like pruning infected lower leaves with sanitized shears)",
    "Organic treatment 3 (e.g. soil amendment or bio-fungicide like Bacillus subtilis)"
  ],
  "chemical_treatments": [
    "Conventional chemical fungicide/bactericide active ingredient (e.g. Chlorothalonil, Mancozeb, Azoxystrobin, or Copper Hydroxide)",
    "Application timing, spray interval, and pre-harvest interval (PHI) caution"
  ],
  "preventative_measures": [
    "Irrigation protocol (e.g. avoid overhead watering, irrigate at base)",
    "Plant spacing and pruning to maximize canopy airflow and speed drying",
    "Sanitation and crop rotation rules",
    "Selection of disease-resistant varieties for future plantings"
  ],
  "urgency_level": "High - Immediate Action Needed" (or "Moderate - Monitor & Treat"),
  "farmer_pro_tip": "An agronomist insider tip for managing this condition without damaging crop yield or beneficial insects."
}}
"""

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{system_instruction}\n\n{prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        }

        last_error = None
        for model in GEMINI_API_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                response = requests.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json=payload,
                    timeout=15
                )

                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        parsed_json = self._clean_and_parse_json(text)
                        if parsed_json:
                            logger.info(f"Successfully generated disease insights using {model}.")
                            return parsed_json
                else:
                    logger.warning(f"Gemini model {model} returned status {response.status_code}: {response.text[:200]}")
                    last_error = f"HTTP {response.status_code}: {response.text[:150]}"

            except requests.RequestException as re:
                logger.warning(f"Request to {model} failed: {re}")
                last_error = str(re)

        raise RuntimeError(f"All Gemini models failed. Last error: {last_error}")

    def _call_gemini_raw_prompt(self, prompt: str) -> str:
        api_key = self.api_key
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.4}
        }

        last_error = None
        for model in GEMINI_API_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                response = requests.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json=payload,
                    timeout=15
                )
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        return candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                else:
                    last_error = f"HTTP {response.status_code}"
            except Exception as e:
                last_error = str(e)

        raise RuntimeError(f"Failed to query Gemini: {last_error}")

    def _clean_and_parse_json(self, text: str) -> Optional[Dict[str, Any]]:
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError as jde:
            logger.error(f"Failed to decode JSON from Gemini output: {jde}. Raw snippet: {text[:200]}")
            return None

    def _get_local_fallback(
        self,
        raw_class: str,
        crop_name: str,
        disease_name: str,
        is_healthy: bool,
        fallback_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Structured, comprehensive fallback based on constants.py
        """
        what_it_means = fallback_info.get("what_it_means") if fallback_info else ""
        recommended_action = fallback_info.get("recommended_action") if fallback_info else ""
        severity = fallback_info.get("severity", "medium") if fallback_info else "medium"

        if is_healthy:
            return {
                "disease_overview": f"Your {crop_name} foliage displays clean cell structure, vibrant pigmentation, and no detectable pathological lesions.",
                "symptoms": [
                    "Even green coloration throughout the leaf blade",
                    "Firm cell turgidity with no wilting or chlorosis",
                    "Intact leaf margins and unblemished venation"
                ],
                "causes_and_spread": f"Optimal photosynthetic and environmental balance for {crop_name}. Keep roots well aerated and foliage dry.",
                "organic_remedies": [
                    "Apply mild organic compost tea to replenish beneficial soil microbiome.",
                    "Apply a 2-inch layer of organic mulch around base to conserve soil moisture."
                ],
                "chemical_treatments": [
                    "No synthetic chemical sprays are required for healthy leaves."
                ],
                "preventative_measures": [
                    "Use drip irrigation or soaker hoses to avoid wetting foliage.",
                    "Ensure adequate row spacing to promote airflow.",
                    "Scout leaves weekly, especially during humid warm spells."
                ],
                "urgency_level": "Low - Routine Maintenance",
                "farmer_pro_tip": f"Maintain consistent watering at root level. Early morning irrigation gives any incidental foliage moisture time to dry before sunset."
            }

        return {
            "disease_overview": what_it_means or f"{disease_name} is an active condition affecting {crop_name} crops, causing visible lesions and impairing photosynthetic vigor.",
            "symptoms": [
                f"Characteristic spots, discoloration, or pustules typical of {disease_name}.",
                "Yellowing (chlorosis) or browning (necrosis) spreading across infected foliage.",
                "Premature leaf drop leading to reduced crop yield."
            ],
            "causes_and_spread": "Pathogen spores and bacteria are typically spread by splashing rain, overhead irrigation, wind currents, and contaminated gardening shears.",
            "organic_remedies": [
                recommended_action or "Immediately prune and dispose of infected leaves. Do not compost diseased foliage.",
                "Spray with certified organic neem oil or liquid copper soap according to label instructions.",
                "Apply potassium bicarbonate or bio-fungicide (Bacillus amyloliquefaciens) to protect healthy foliage."
            ],
            "chemical_treatments": [
                "Apply targeted broad-spectrum fungicide (e.g. Chlorothalonil or Mancozeb) if infection is severe.",
                "Rotate chemical classes (FRAC groups) to prevent fungicide resistance from developing."
            ],
            "preventative_measures": [
                "Switch from overhead sprinklers to drip irrigation to keep leaf canopies dry.",
                "Prune lower branches to keep foliage at least 12 inches above the soil line.",
                "Sanitize pruning shears with 70% isopropyl alcohol between plants.",
                "Rotate with non-susceptible crops for 2-3 seasons."
            ],
            "urgency_level": "High - Immediate Action Needed" if severity == "high" else "Moderate - Monitor & Treat",
            "farmer_pro_tip": "Always treat early morning or late evening to prevent phototoxic leaf burn from spray droplets under intense midday sun."
        }

gemini_service = GeminiAgronomistService()
