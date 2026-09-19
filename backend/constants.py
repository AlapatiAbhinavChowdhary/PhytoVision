"""
Constants, class mappings, and pathology knowledge base for the 38 PlantVillage classes.
"""

CLASS_NAMES = [
    'Apple___Apple_scab',
    'Apple___Black_rot',
    'Apple___Cedar_apple_rust',
    'Apple___healthy',
    'Blueberry___healthy',
    'Cherry_(including_sour)___Powdery_mildew',
    'Cherry_(including_sour)___healthy',
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot',
    'Corn_(maize)___Common_rust_',
    'Corn_(maize)___Northern_Leaf_Blight',
    'Corn_(maize)___healthy',
    'Grape___Black_rot',
    'Grape___Esca_(Black_Measles)',
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)',
    'Grape___healthy',
    'Orange___Haunglongbing_(Citrus_greening)',
    'Peach___Bacterial_spot',
    'Peach___healthy',
    'Pepper,_bell___Bacterial_spot',
    'Pepper,_bell___healthy',
    'Potato___Early_blight',
    'Potato___Late_blight',
    'Potato___healthy',
    'Raspberry___healthy',
    'Soybean___healthy',
    'Squash___Powdery_mildew',
    'Strawberry___Leaf_scorch',
    'Strawberry___healthy',
    'Tomato___Bacterial_spot',
    'Tomato___Early_blight',
    'Tomato___Late_blight',
    'Tomato___Leaf_Mold',
    'Tomato___Septoria_leaf_spot',
    'Tomato___Spider_mites Two-spotted_spider_mite',
    'Tomato___Target_Spot',
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
    'Tomato___Tomato_mosaic_virus',
    'Tomato___healthy'
]

# Disease Information Database: accurate, concise layman explanations & practical advice
DISEASE_INFO = {
    'Apple___Apple_scab': {
        'what_it_means': 'A fungal infection causing olive-green to dark brown velvety spots on apple leaves and fruit, causing early leaf drop.',
        'recommended_action': 'Rake and destroy fallen leaves to reduce overwintering spores, prune for airflow, and apply appropriate copper or sulfur-based fungicides during early spring bud break.',
        'severity': 'medium'
    },
    'Apple___Black_rot': {
        'what_it_means': 'A fungal disease producing circular brown lesions on leaves (frog-eye leaf spot) and dark decaying cankers on branches and fruit.',
        'recommended_action': 'Prune out dead wood and mummified fruit where the fungus overwinters, and spray captan or thiophanate-methyl fungicides according to local orchard guidelines.',
        'severity': 'high'
    },
    'Apple___Cedar_apple_rust': {
        'what_it_means': 'A fungal rust that cycles between junipers/cedars and apple trees, showing bright orange-yellow spots on the upper leaf surface.',
        'recommended_action': 'Remove nearby wild eastern red cedars if possible, and apply myclobutanil or mancozeb fungicides from pink bud stage through petal fall.',
        'severity': 'medium'
    },
    'Apple___healthy': {
        'what_it_means': 'Foliage is vibrant, uniform in green color, and free from any detectable fungal, bacterial, or pest damage.',
        'recommended_action': 'Maintain standard irrigation and balanced seasonal fertilization, and inspect periodically for early signs of pests.',
        'severity': 'low'
    },
    'Blueberry___healthy': {
        'what_it_means': 'Leaves show healthy cellular structure with no sign of chlorosis, leaf spots, or stem blights.',
        'recommended_action': 'Keep soil pH acidic (4.5–5.2), use pine-bark mulch to conserve root moisture, and perform routine sanitary pruning.',
        'severity': 'low'
    },
    'Cherry_(including_sour)___Powdery_mildew': {
        'what_it_means': 'A widespread fungal disease coating young leaves and tender shoots with a white-to-light-gray powdery fungal growth, distorting leaf edges.',
        'recommended_action': 'Improve sunlight penetration through selective pruning, avoid excessive nitrogen feeding, and apply sulfur or potassium bicarbonate sprays.',
        'severity': 'medium'
    },
    'Cherry_(including_sour)___healthy': {
        'what_it_means': 'The foliage is robust, glossy, and actively photosynthesizing with no fungal lesions or chewing pests.',
        'recommended_action': 'Continue regular drip watering at the root base and monitor during humid periods to maintain healthy leaf vigor.',
        'severity': 'low'
    },
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot': {
        'what_it_means': 'Fungal disease producing distinct rectangular, tan-to-gray lesions running parallel between leaf veins, reducing photosynthetic yield.',
        'recommended_action': 'Rotate crops away from corn for at least one year, till residue under, and apply strobilurin or triazole fungicides if lesions spread before silking.',
        'severity': 'high'
    },
    'Corn_(maize)___Common_rust_': {
        'what_it_means': 'A fungal infection causing prominent cinnamon-brown powdery pustules scattered across both upper and lower leaf surfaces.',
        'recommended_action': 'Plant rust-resistant hybrids and monitor plants closely during cool, humid weather; fungicide is typically needed only in severe early-stage infestations.',
        'severity': 'medium'
    },
    'Corn_(maize)___Northern_Leaf_Blight': {
        'what_it_means': 'Fungus causing long, cigar-shaped grayish-green to tan lesions that can coalesce and cause entire leaves to wither and die.',
        'recommended_action': 'Choose resistant seed varieties, plow crop residue to reduce spore survival, and apply recommended foliar fungicides if disease is noted near ear leaves.',
        'severity': 'high'
    },
    'Corn_(maize)___healthy': {
        'what_it_means': 'Sturdy green blades showing optimal nitrogen absorption and vigorous development without pathogen scarring.',
        'recommended_action': 'Continue regular crop management, weed suppression, and balanced soil nutrition.',
        'severity': 'low'
    },
    'Grape___Black_rot': {
        'what_it_means': 'A destructive fungal pathogen creating reddish-brown leaf spots that later spread to shrivel grape clusters into dry, black "mummies".',
        'recommended_action': 'Remove all mummified grapes from vines and soil, prune to open the canopy for rapid leaf drying, and apply mancozeb or captan from budbreak onwards.',
        'severity': 'high'
    },
    'Grape___Esca_(Black_Measles)': {
        'what_it_means': 'A fungal trunk disease causing "tiger-stripe" yellow/brown banding between leaf veins and dark spotting on fruit skins.',
        'recommended_action': 'Protect pruning wounds with wound sealants, delay pruning until late winter, and sanitize cutting tools between vines to prevent spreading trunk pathogens.',
        'severity': 'high'
    },
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)': {
        'what_it_means': 'Fungal leaf spotting with irregular dark reddish-brown margins, causing premature defoliation in warm, wet vineyard conditions.',
        'recommended_action': 'Promote airflow by canopy thinning and apply copper-based fungicides after bloom to protect maturing foliage.',
        'severity': 'medium'
    },
    'Grape___healthy': {
        'what_it_means': 'Vigorous, rich green leaves showing strong vascular health and unimpeded cluster formation.',
        'recommended_action': 'Continue canopy training, balanced potassium/magnesium soil management, and routine pest scoutings.',
        'severity': 'low'
    },
    'Orange___Haunglongbing_(Citrus_greening)': {
        'what_it_means': 'A severe bacterial disease spread by citrus psyllids, causing asymmetric mottled yellow leaves, stunted shoots, and bitter, lopsided green fruit.',
        'recommended_action': 'Control Asian citrus psyllid vector populations with targeted insecticides or beneficial predators; severely infected trees may need roguing to protect nearby groves.',
        'severity': 'high'
    },
    'Peach___Bacterial_spot': {
        'what_it_means': 'A bacterium causing small water-soaked leaf spots that turn purplish-brown and drop out, creating a "shot-hole" appearance.',
        'recommended_action': 'Apply dormant copper sprays before bud swell, avoid overhead sprinkler irrigation, and plant resistant peach cultivars.',
        'severity': 'medium'
    },
    'Peach___healthy': {
        'what_it_means': 'Peach foliage is smooth, deep green, and free from bacterial cankers, leaf curl, or shot-holing.',
        'recommended_action': 'Ensure consistent deep root watering, proper fruit thinning, and monitor bark for borer activity.',
        'severity': 'low'
    },
    'Pepper,_bell___Bacterial_spot': {
        'what_it_means': 'Bacterial pathogen causing dark, water-soaked, circular to irregular spots on pepper leaves that turn brown with yellow halos.',
        'recommended_action': 'Avoid working in wet foliage, switch to drip irrigation, and apply preventative copper-mancozeb bactericidal sprays during warm rainy periods.',
        'severity': 'high'
    },
    'Pepper,_bell___healthy': {
        'what_it_means': 'Vibrant bell pepper foliage with balanced node spacing, dark green coloring, and strong flowering potential.',
        'recommended_action': 'Maintain steady soil moisture, provide calcium to prevent blossom end rot, and stake plants as peppers enlarge.',
        'severity': 'low'
    },
    'Potato___Early_blight': {
        'what_it_means': 'A fungal disease producing dark brown, concentric ringed "target board" spots on older potato leaves, leading to yellowing.',
        'recommended_action': 'Maintain adequate nitrogen and irrigation to prevent plant stress, rotate nightshade crops, and apply chlorothalonil or copper fungicide proactively.',
        'severity': 'medium'
    },
    'Potato___Late_blight': {
        'what_it_means': 'A rapid, devastating water mold (Phytophthora infestans) that causes dark water-soaked leaf lesions with white fuzz underneath during damp weather.',
        'recommended_action': 'Immediately remove and destroy infected vines to protect tubers, avoid overhead wetting, and apply systemic fungicides (e.g. metalaxyl or cymoxanil) immediately.',
        'severity': 'high'
    },
    'Potato___healthy': {
        'what_it_means': 'Dense, clean foliage and vigorous vine growth indicating healthy root system and active tuber bulking.',
        'recommended_action': 'Keep hills well mounded to prevent sunlight hitting developing tubers and inspect lower canopy weekly.',
        'severity': 'low'
    },
    'Raspberry___healthy': {
        'what_it_means': 'Fresh green canes and serrated leaves showing complete absence of cane blight, rust, or virus symptoms.',
        'recommended_action': 'Prune floricanes after harvest, ensure well-draining soil, and provide trellising for optimal sunlight distribution.',
        'severity': 'low'
    },
    'Soybean___healthy': {
        'what_it_means': 'Uniform trifoliate foliage with balanced nodulation and healthy nitrogen fixation.',
        'recommended_action': 'Monitor for sudden death syndrome or aphid pressure, and maintain optimal weed suppression.',
        'severity': 'low'
    },
    'Squash___Powdery_mildew': {
        'what_it_means': 'A pervasive white talcum powder-like fungal coating covering squash leaves and stems, causing yellowing and premature leaf crisping.',
        'recommended_action': 'Plant resistant squash varieties, space plants widely for air circulation, and spray horticultural oils, neem oil, or sulfur at early onset.',
        'severity': 'medium'
    },
    'Strawberry___Leaf_scorch': {
        'what_it_means': 'A fungus causing numerous small purple spots that expand into irregular blotches, making leaves appear scorched or burned at margins.',
        'recommended_action': 'Remove older infected leaves after renovation, maintain mulch to prevent soil splashing, and apply captan or copper fungicides in spring.',
        'severity': 'medium'
    },
    'Strawberry___healthy': {
        'what_it_means': 'Low-growing crown with glossy, deep-green trifoliate leaves showing clean runner formation and healthy blossoms.',
        'recommended_action': 'Maintain clean straw bedding around crowns, water at the soil line, and replenish organic compost.',
        'severity': 'low'
    },
    'Tomato___Bacterial_spot': {
        'what_it_means': 'Bacterial disease causing greasy, dark brown spots on tomato foliage and raised scabby bumps on green tomatoes.',
        'recommended_action': 'Use disease-free certified seeds, disinfect garden stakes and cages, water only at the soil level, and apply copper bactericides.',
        'severity': 'high'
    },
    'Tomato___Early_blight': {
        'what_it_means': 'Common fungal disease causing circular brown spots with distinct concentric rings on bottom leaves, gradually moving up the plant.',
        'recommended_action': 'Prune lower leaves touching the soil, add clean mulch around the stem, and spray organic copper or bio-fungicides every 7-10 days.',
        'severity': 'medium'
    },
    'Tomato___Late_blight': {
        'what_it_means': 'Fast-spreading water mold that causes large greasy olive-brown blotches on leaves with white fuzzy spore growth on undersides.',
        'recommended_action': 'Act immediately: remove infected plants entirely, keep foliage dry, and apply preventative copper or phosphonate fungicides in humid cool weather.',
        'severity': 'high'
    },
    'Tomato___Leaf_Mold': {
        'what_it_means': 'A fungal condition common in greenhouses and humid gardens, producing pale green-yellow spots on upper leaves and velvety olive-brown mold beneath.',
        'recommended_action': 'Increase greenhouse ventilation and air movement, reduce humidity below 85%, and trim crowded foliage to dry leaves quickly.',
        'severity': 'medium'
    },
    'Tomato___Septoria_leaf_spot': {
        'what_it_means': 'Fungal spotting causing hundreds of small circular spots with dark brown margins and light gray centers, often dotted with tiny black specks.',
        'recommended_action': 'Prune infected lower foliage immediately, apply thick straw mulch to stop soil splashing, and spray chlorothalonil or copper soap fungicide.',
        'severity': 'medium'
    },
    'Tomato___Spider_mites Two-spotted_spider_mite': {
        'what_it_means': 'Microscopic arachnids feeding on leaf sap, creating fine yellow stippling, bronze discoloration, and delicate webbing under leaves.',
        'recommended_action': 'Spray leaves thoroughly with insecticidal soap or horticultural oil (especially undersides), or release predatory mites (Phytoseiulus persimilis).',
        'severity': 'medium'
    },
    'Tomato___Target_Spot': {
        'what_it_means': 'A fungal disease causing brown circular lesions with distinct target-like concentric rings and yellow halos on leaves and stems.',
        'recommended_action': 'Ensure wide row spacing, stake and prune suckers to promote airflow, and treat with azoxystrobin or copper-based sprays.',
        'severity': 'medium'
    },
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus': {
        'what_it_means': 'A whitefly-transmitted virus causing severe leaf curling upwards, stunted bushy growth, and yellowed leaf margins with poor fruit set.',
        'recommended_action': 'Control whitefly vectors using yellow sticky cards and insecticidal soaps, cover young plants with fine insect netting, and rogue out infected plants.',
        'severity': 'high'
    },
    'Tomato___Tomato_mosaic_virus': {
        'what_it_means': 'A highly contagious viral disease causing light and dark green mottled mosaic patterns on leaves, leaf distortion, and stunted growth.',
        'recommended_action': 'Wash hands and disinfect tools thoroughly (virus easily spreads by touch), remove infected plants, and plant certified mosaic-resistant varieties.',
        'severity': 'high'
    },
    'Tomato___healthy': {
        'what_it_means': 'Vibrant emerald green foliage with strong apical growth, active blossom sets, and no signs of microbial or pest damage.',
        'recommended_action': 'Continue regular staking, consistent watering to prevent fruit splitting, and periodic balanced organic fertilizing.',
        'severity': 'low'
    }
}

CROP_DISPLAY_NAMES = {
    'Apple': 'Apple',
    'Blueberry': 'Blueberry',
    'Cherry_(including_sour)': 'Cherry (Sour/Sweet)',
    'Corn_(maize)': 'Corn (Maize)',
    'Grape': 'Grape',
    'Orange': 'Orange / Citrus',
    'Peach': 'Peach',
    'Pepper,_bell': 'Bell Pepper',
    'Potato': 'Potato',
    'Raspberry': 'Raspberry',
    'Soybean': 'Soybean',
    'Squash': 'Squash',
    'Strawberry': 'Strawberry',
    'Tomato': 'Tomato'
}

def parse_class_name(raw_name: str):
    """
    Parses a raw class name like 'Tomato___Late_blight' into human-friendly parts:
    returns (crop_name, disease_name, is_healthy)
    """
    parts = raw_name.split('___')
    raw_crop = parts[0]
    raw_disease = parts[1] if len(parts) > 1 else 'Unknown'

    crop_name = CROP_DISPLAY_NAMES.get(raw_crop, raw_crop.replace('_', ' ').title())

    if raw_disease.lower() == 'healthy':
        disease_name = 'Healthy'
        is_healthy = True
    else:
        is_healthy = False
        disease_name = raw_disease.replace('_', ' ').strip()
        # Clean up specific class quirks
        if 'Common rust' in disease_name:
            disease_name = 'Common Rust'
        elif 'Cercospora leaf spot' in disease_name:
            disease_name = 'Cercospora / Gray Leaf Spot'
        elif 'Spider mites' in disease_name:
            disease_name = 'Spider Mites'
        elif 'Haunglongbing' in disease_name:
            disease_name = 'Huanglongbing (Citrus Greening)'
        elif 'Esca' in disease_name:
            disease_name = 'Esca (Black Measles)'
        elif 'Isariopsis' in disease_name:
            disease_name = 'Leaf Blight (Isariopsis)'

    return crop_name, disease_name, is_healthy
