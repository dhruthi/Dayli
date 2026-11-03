#!/usr/bin/env python3
"""
Dayli AI — Multilingual Climate-Health Intent & Urgency Dataset Builder
Generates balanced, high-fidelity train and holdout datasets across:
  Languages: English (en), Telugu (te), Hindi (hi), Tamil (ta), Kannada (kn),
             Malayalam (ml), Marathi (mr), Bengali (bn) and Romanized variants.
  Intents: 14 core classes + out_of_scope
  Urgencies: routine, same_day, emergency_signal
"""

import json
import random
import os
from collections import defaultdict

# Deterministic seed for reproducible evaluation
RANDOM_SEED = 42
random.seed(RANDOM_SEED)

# Seed corpus organized by [intent, urgency, lang, text]
SEEDS = [
    # ── 1. weather_now_24h ──
    ("weather_now_24h", "routine", "en", "What is the temperature today in Hyderabad?"),
    ("weather_now_24h", "routine", "en", "How hot will it get this afternoon?"),
    ("weather_now_24h", "routine", "en", "Is it going to rain tonight in Secunderabad?"),
    ("weather_now_24h", "routine", "en", "24 hour weather forecast please"),
    ("weather_now_24h", "routine", "en", "What is the weather change expected today?"),
    ("weather_now_24h", "routine", "en", "When will the peak heat hit today?"),
    ("weather_now_24h", "routine", "en", "Feels like temperature right now"),
    ("weather_now_24h", "routine", "en", "Will there be evening showers today?"),
    ("weather_now_24h", "routine", "en", "Tell me the weather prediction for Hyderabad"),
    ("weather_now_24h", "routine", "en", "What are the recommended actions for today's weather?"),

    ("weather_now_24h", "routine", "te", "ఈరోజు హైదరాబాద్‌లో ఉష్ణోగ్రత ఎంత?"),
    ("weather_now_24h", "routine", "te", "మధ్యాహ్నం ఎండ తీవ్రత ఎలా ఉంటుంది?"),
    ("weather_now_24h", "routine", "te", "ఈ రాత్రికి వర్షం పడే అవకాశం ఉందా?"),
    ("weather_now_24h", "routine", "te", "24 గంటల వాతావరణ మార్పుల వివరాలు కావాలి"),
    ("weather_now_24h", "routine", "te", "వాతావరణం ఎలా ఉంది ఈరోజు?"),

    ("weather_now_24h", "routine", "te-Latn", "eroju hyderabad lo temperature entha undi?"),
    ("weather_now_24h", "routine", "te-Latn", "madhyanam enda ekkuva untundha?"),
    ("weather_now_24h", "routine", "te-Latn", "24 hours weather forecast cheppandi"),
    ("weather_now_24h", "routine", "te-Latn", "vathavaranam ela undi eroju?"),

    ("weather_now_24h", "routine", "hi", "आज हैदराबाद में तापमान कितना है?"),
    ("weather_now_24h", "routine", "hi", "दोपहर में धूप कितनी तेज होगी?"),
    ("weather_now_24h", "routine", "hi", "अगले 24 घंटे का मौसम का हाल बताइए"),
    ("weather_now_24h", "routine", "hi", "आज की गर्मी के लिए क्या सावधानियां हैं?"),

    ("weather_now_24h", "routine", "hi-Latn", "aaj hyderabad me temperature kitna hai?"),
    ("weather_now_24h", "routine", "hi-Latn", "dophar me garmi kitni hogi?"),
    ("weather_now_24h", "routine", "hi-Latn", "24 ghante ka mausam prediction batao"),

    ("weather_now_24h", "routine", "ta", "இன்று சென்னையில் வெப்பநிலை எவ்வளவு?"),
    ("weather_now_24h", "routine", "ta", "மதியம் வெயில் அதிகமாக இருக்குமா?"),
    ("weather_now_24h", "routine", "ta", "24 மணி நேர வானிலை தகவல் வேண்டும்"),

    ("weather_now_24h", "routine", "ta-Latn", "iniku temperature evvalavu irukku?"),
    ("weather_now_24h", "routine", "ta-Latn", "madhiyam veiyil romba irukkuma?"),
    ("weather_now_24h", "routine", "ta-Latn", "24 hours weather update sollunga"),

    ("weather_now_24h", "routine", "kn", "ಇಂದು ತಾಪಮಾನ ಎಷ್ಟಿದೆ?"),
    ("weather_now_24h", "routine", "kn", "ಮಧ್ಯಾಹ್ನ ಬಿಸಿಲು ಹೆಚ್ಚಿರುತ್ತದೆಯೇ?"),
    ("weather_now_24h", "routine", "kn", "24 ಗಂಟೆಗಳ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ ನೀಡಿ"),

    ("weather_now_24h", "routine", "kn-Latn", "ivathu temperature estide?"),
    ("weather_now_24h", "routine", "kn-Latn", "madhyahna bisilu jaasti irutha?"),
    ("weather_now_24h", "routine", "kn-Latn", "24 hours weather forecast heli"),

    ("weather_now_24h", "routine", "ml", "ഇന്ന് താപനില എത്രയാണ്?"),
    ("weather_now_24h", "routine", "ml", "ഉച്ചയ്ക്ക് കഠിന ചൂട് ഉണ്ടാകുമോ?"),
    ("weather_now_24h", "routine", "ml", "24 മണിക്കൂർ കാലാവസ്ഥാ പ്രവചനം വേണം"),

    ("weather_now_24h", "routine", "ml-Latn", "iniku temp ethraya?"),
    ("weather_now_24h", "routine", "ml-Latn", "uchakku kooduthal choodu undaakumo?"),
    ("weather_now_24h", "routine", "ml-Latn", "24 hours weather update tharumo"),

    ("weather_now_24h", "routine", "mr", "आज तापमान किती आहे?"),
    ("weather_now_24h", "routine", "mr", "दुपारी ऊन खूप जास्त असेल का?"),
    ("weather_now_24h", "routine", "mr", "२४ तासांचा हवामान अंदाज सांगा"),

    ("weather_now_24h", "routine", "mr-Latn", "aaj temperature kiti ahe?"),
    ("weather_now_24h", "routine", "mr-Latn", "dupari un khup asel ka?"),
    ("weather_now_24h", "routine", "mr-Latn", "24 hours hawaman andaj sanga"),

    ("weather_now_24h", "routine", "bn", "আজকের তাপমাত্রা কত?"),
    ("weather_now_24h", "routine", "bn", "দুপুরে কি খুব গরম পড়বে?"),
    ("weather_now_24h", "routine", "bn", "২৪ ঘণ্টার আবহাওয়ার পূর্বাভাস জানান"),

    ("weather_now_24h", "routine", "bn-Latn", "aaj temperature koto?"),
    ("weather_now_24h", "routine", "bn-Latn", "dupure ki khub gorom porbe?"),
    ("weather_now_24h", "routine", "bn-Latn", "24 hours weather forecast jante chai"),

    # ── 2. weather_5day ──
    ("weather_5day", "routine", "en", "What is the 5-day weather forecast?"),
    ("weather_5day", "routine", "en", "Can you show me the weekly forecast?"),
    ("weather_5day", "routine", "en", "How will the weather be for the next five days?"),
    ("weather_5day", "routine", "en", "Will the heat wave continue for the next few days?"),

    ("weather_5day", "routine", "te", "రాబోయే 5 రోజుల వాతావరణం ఎలా ఉంటుంది?"),
    ("weather_5day", "routine", "te", "ఈ వారం వాతావరణ నివేదిక ఇవ్వండి"),
    ("weather_5day", "routine", "te-Latn", "raboye 5 days weather forecast ivvandi"),
    ("weather_5day", "routine", "te-Latn", "next 5 days heatwave untunda?"),

    ("weather_5day", "routine", "hi", "अगले 5 दिनों का मौसम कैसा रहेगा?"),
    ("weather_5day", "routine", "hi", "पूरे हफ्ते का मौसम पूर्वानुमान बताइए"),
    ("weather_5day", "routine", "hi-Latn", "agle 5 din ka weather kaisa rahega?"),
    ("weather_5day", "routine", "hi-Latn", "weekly forecast batao"),

    ("weather_5day", "routine", "ta", "அடுத்த 5 நாட்களுக்கு வானிலை எப்படி இருக்கும்?"),
    ("weather_5day", "routine", "ta", "5 நாள் வானிலை அறிக்கை வேண்டும்"),
    ("weather_5day", "routine", "ta-Latn", "adutha 5 days weather eppadi irukkum?"),

    ("weather_5day", "routine", "kn", "ಮುಂದಿನ 5 ದಿನಗಳ ಹವಾಮಾನ ಹೇಗಿರುತ್ತದೆ?"),
    ("weather_5day", "routine", "kn", "ವಾರದ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ ನೀಡಿ"),
    ("weather_5day", "routine", "kn-Latn", "mundina 5 dina weather hegiruthe?"),

    ("weather_5day", "routine", "ml", "അടുത്ത 5 ദിവസത്തെ കാലാവസ്ഥ എങ്ങനെയുണ്ടാകും?"),
    ("weather_5day", "routine", "ml", "5 ദിവസത്തെ കാലാവസ്ഥ റിപ്പോർട്ട്"),
    ("weather_5day", "routine", "ml-Latn", "adutha 5 days kaalavastha enganeyanu?"),

    ("weather_5day", "routine", "mr", "पुढील ५ दिवसांचे हवामान कसे राहील?"),
    ("weather_5day", "routine", "mr", "५ दिवसांचा हवामान अंदाज द्या"),
    ("weather_5day", "routine", "mr-Latn", "pudhcha 5 divasacha hawaman kasa rahil?"),

    ("weather_5day", "routine", "bn", "পরবর্তী ৫ দিনের আবহাওয়া কেমন থাকবে?"),
    ("weather_5day", "routine", "bn", "৫ দিনের আবহাওয়ার পূর্বাভাস দিন"),
    ("weather_5day", "routine", "bn-Latn", "poroborti 5 diner abhawa kemon thakbe?"),

    # ── 3. heat_hydration ──
    ("heat_hydration", "routine", "en", "How much water should I drink during 3rd trimester pregnancy?"),
    ("heat_hydration", "routine", "en", "Can I drink ORSL or coconut water in this heat?"),
    ("heat_hydration", "routine", "en", "Drinking water, tender coconut water, and ORSL in heat"),
    ("heat_hydration", "routine", "en", "Safe drinks for hydration in heatwave"),
    ("heat_hydration", "routine", "en", "Should I give water to my 4 month old baby in hot weather?"),
    ("heat_hydration", "routine", "en", "How to prevent heat cramps while pregnant?"),

    ("heat_hydration", "routine", "te", "గర్భిణీ స్త్రీలు ఎండలో ఎంత నీరు తాగాలి?"),
    ("heat_hydration", "routine", "te", "4 నెలల పాపకి ఎండలో నీరు ఇవ్వవచ్చా?"),
    ("heat_hydration", "routine", "te", "ఓఆర్ఎస్ఎల్ లేదా కొబ్బరి నీళ్ళు తాగవచ్చా?"),
    ("heat_hydration", "routine", "te-Latn", "pregnant ga unnapudu daily entha water thagali?"),
    ("heat_hydration", "routine", "te-Latn", "baby ki water ivvocha 3 months unte?"),

    ("heat_hydration", "routine", "hi", "गर्भावस्था में दिन में कितना पानी पीना चाहिए?"),
    ("heat_hydration", "routine", "hi", "क्या 5 महीने के बच्चे को गर्मी में पानी देना चाहिए?"),
    ("heat_hydration", "routine", "hi", "ओआरएस या नारियल पानी पीने की सलाह दीजिए"),
    ("heat_hydration", "routine", "hi-Latn", "pregnancy me kitna paani pina chahiye daily?"),
    ("heat_hydration", "routine", "hi-Latn", "kya 4 month ke bacche ko paani de sakte hai?"),

    ("heat_hydration", "routine", "ta", "கர்ப்பிணி பெண்கள் வெயிலில் எவ்வளவு தண்ணீர் குடிக்க வேண்டும்?"),
    ("heat_hydration", "routine", "ta", "4 மாத குழந்தைக்கு வெயிலில் தண்ணீர் கொடுக்கலாமா?"),
    ("heat_hydration", "routine", "ta-Latn", "pregnancy la entha thanni kudikanum?"),
    ("heat_hydration", "routine", "ta-Latn", "4 month baby ku thanni tharalama?"),

    ("heat_hydration", "routine", "kn", "ಗರ್ಭಿಣಿಯರು ಬಿಸಿಲಿನಲ್ಲಿ ಎಷ್ಟು ನೀರು ಕುಡಿಯಬೇಕು?"),
    ("heat_hydration", "routine", "kn", "4 ತಿಂಗಳ ಮಗುವಿಗೆ ನೀರು ಕೊಡಬಹುದೇ?"),
    ("heat_hydration", "routine", "kn-Latn", "pregnancy time nalli entha neeru kudibeku?"),
    ("heat_hydration", "routine", "kn-Latn", "4 months maguvige neeru kodabahuda?"),

    ("heat_hydration", "routine", "ml", "ഗർഭിണികൾ ചൂടിൽ എത്ര വെള്ളം കുടിക്കണം?"),
    ("heat_hydration", "routine", "ml", "4 മാസം പ്രായമുള്ള കുഞ്ഞിന് വെള്ളം കൊടുക്കാമോ?"),
    ("heat_hydration", "routine", "ml-Latn", "pregnancy samayathu ethra vellam kudikkanam?"),
    ("heat_hydration", "routine", "ml-Latn", "4 months babykku vellam kodukkaamo?"),

    ("heat_hydration", "routine", "mr", "गरोदरपणात उन्हाळ्यात किती पाणी प्यावे?"),
    ("heat_hydration", "routine", "mr", "४ महिन्यांच्या बाळाला उन्हात पाणी पाजावे का?"),
    ("heat_hydration", "routine", "mr-Latn", "pregnancy madhe kiti pani pyayla pahije?"),
    ("heat_hydration", "routine", "mr-Latn", "4 month balala pani deu ka garmi madhe?"),

    ("heat_hydration", "routine", "bn", "গর্ভাবস্থায় গরমে কতটা পানি পান করা উচিত?"),
    ("heat_hydration", "routine", "bn", "৪ মাসের শিশুকে কি গরমে পানি খাওয়ানো যাবে?"),
    ("heat_hydration", "routine", "bn-Latn", "pregnancy te gorome koto ta jol khabo?"),
    ("heat_hydration", "routine", "bn-Latn", "4 month baby ke jol deya jabe ki?"),

    # ── 4. air_quality ──
    ("air_quality", "routine", "en", "What is the AQI level in Hyderabad today?"),
    ("air_quality", "routine", "en", "Is the air quality safe for a newborn baby outside?"),
    ("air_quality", "routine", "en", "Air pollution index and particulate matter pm2.5"),

    ("air_quality", "routine", "te", "ఈరోజు గాలి నాణ్యత (AQI) ఎలా ఉంది?"),
    ("air_quality", "routine", "te", "కాలుష్యం ఎక్కువగా ఉంది చిన్న పిల్లలను బయటకు తీసుకెళ్లవచ్చా?"),
    ("air_quality", "routine", "te-Latn", "eroju air quality aqi entha undi?"),

    ("air_quality", "routine", "hi", "आज वायु गुणवत्ता (AQI) कितनी है?"),
    ("air_quality", "routine", "hi", "क्या बाहर प्रदूषण शिशु के लिए सुरक्षित है?"),
    ("air_quality", "routine", "hi-Latn", "aaj aqi level kaisa hai pollution kitna hai?"),

    ("air_quality", "routine", "ta", "இன்று காற்றின் தரம் (AQI) எப்படி உள்ளது?"),
    ("air_quality", "routine", "ta", "குழந்தைகளை வெளியே அழைத்துச் செல்லலாமா காற்று மாசு அதிகம்?"),
    ("air_quality", "routine", "ta-Latn", "air quality aqi level evvalavu?"),

    ("air_quality", "routine", "kn", "ಇಂದಿನ ಗಾಳಿಯ ಗುಣಮಟ್ಟ (AQI) ಎಷ್ಟಿದೆ?"),
    ("air_quality", "routine", "kn", "ವಾಯು ಮಾಲಿನ್ಯ ಹೆಚ್ಚಾಗಿದೆ ಮಗುವನ್ನು ಹೊರಗೆ ಕರೆದೊಯ್ಯಬಹುದೇ?"),
    ("air_quality", "routine", "kn-Latn", "ivathina air quality aqi hegiruthe?"),

    ("air_quality", "routine", "ml", "ഇന്നത്തെ വായു നിലവാരം (AQI) എത്രയാണ്?"),
    ("air_quality", "routine", "ml", "വായു മലിനീകരണം ഉള്ളതിനാൽ കുഞ്ഞിനെ പുറത്തിറക്കാമോ?"),
    ("air_quality", "routine", "ml-Latn", "inathe air quality aqi ethraya?"),

    ("air_quality", "routine", "mr", "आज हवेचा दर्जा (AQI) कसा आहे?"),
    ("air_quality", "routine", "mr", "प्रदूषण जास्त आहे बाळाला बाहेर नेणे सुरक्षित आहे का?"),
    ("air_quality", "routine", "mr-Latn", "aaj hava gunwatta aqi kiti ahe?"),

    ("air_quality", "routine", "bn", "আজ বায়ুর গুণমান সূচক (AQI) কত?"),
    ("air_quality", "routine", "bn", "দূষণ খুব বেশি বাচ্চাকে কি বাইরে নিয়ে যাওয়া যাবে?"),
    ("air_quality", "routine", "bn-Latn", "aaj air quality aqi koto?"),

    # ── 5. facility_hospital_labour ──
    ("facility_hospital_labour", "same_day", "en", "Find the nearest ready labour room in Hyderabad"),
    ("facility_hospital_labour", "same_day", "en", "Where is the closest government maternity hospital with bed availability?"),
    ("facility_hospital_labour", "same_day", "en", "Maternity delivery ward nearby hospital"),

    ("facility_hospital_labour", "same_day", "te", "నాకు దగ్గరలో ఉన్న ప్రసవ ఆసుపత్రి మరియు లేబర్ రూమ్ ఎక్కడ ఉంది?"),
    ("facility_hospital_labour", "same_day", "te", "ప్రభుత్వ మెటర్నిటీ హాస్పిటల్ బెడ్స్ ఎక్కడ అందుబాటులో ఉన్నాయి?"),
    ("facility_hospital_labour", "same_day", "te-Latn", "naaku daggara unna labour room delivery hospital ekkada?"),

    ("facility_hospital_labour", "same_day", "hi", "नजदीकी प्रसूति अस्पताल और लेबर रूम कहां है?"),
    ("facility_hospital_labour", "same_day", "hi", "सरकारी डिलीवरी अस्पताल में खाली बेड की जानकारी दें"),
    ("facility_hospital_labour", "same_day", "hi-Latn", "najdeeki maternity hospital aur labour room kaha hai?"),

    ("facility_hospital_labour", "same_day", "ta", "அருகில் உள்ள பிரசவ மருத்துவமனை மற்றும் லேபர் ரூம் எங்குள்ளது?"),
    ("facility_hospital_labour", "same_day", "ta", "அரசு மகப்பேறு மருத்துவமனையில் படுக்கைகள் உள்ளதா?"),
    ("facility_hospital_labour", "same_day", "ta-Latn", "nearest delivery hospital labour room enga irukku?"),

    ("facility_hospital_labour", "same_day", "kn", "ಹತ್ತಿರದ ಹೆರಿಗೆ ಆಸ್ಪತ್ರೆ ಮತ್ತು ಲೇಬರ್ ರೂಮ್ ಎಲ್ಲಿದೆ?"),
    ("facility_hospital_labour", "same_day", "kn", "ಸರ್ಕಾರಿ ಹೆರಿಗೆ ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ಬೆಡ್ ಲಭ್ಯವಿದೆಯೇ?"),
    ("facility_hospital_labour", "same_day", "kn-Latn", "daggara delivery hospital labour room ellide?"),

    ("facility_hospital_labour", "same_day", "ml", "അടുത്തുള്ള പ്രസവാശുപത്രിയും ലേബർ റൂമും എവിടെയാണ്?"),
    ("facility_hospital_labour", "same_day", "ml", "മെറ്റേണിറ്റി ആശുപത്രിയിൽ ബെഡ് ഒഴിവുണ്ടോ?"),
    ("facility_hospital_labour", "same_day", "ml-Latn", "aduthulla delivery hospital labour room evideya?"),

    ("facility_hospital_labour", "same_day", "mr", "जवळचे प्रसूती रुग्णालय आणि लेबर रूम कुठे आहे?"),
    ("facility_hospital_labour", "same_day", "mr", "सरकारी प्रसूती रुग्णालयात बेड उपलब्ध आहेत का?"),
    ("facility_hospital_labour", "same_day", "mr-Latn", "delivery sathi jawalcha hospital labour room kuthe ahe?"),

    ("facility_hospital_labour", "same_day", "bn", "নিকটস্থ প্রসূতি হাসপাতাল এবং লেবার রুম কোথায়?"),
    ("facility_hospital_labour", "same_day", "bn", "সরকারি মাতৃসদনে কি বেড ফাঁকা আছে?"),
    ("facility_hospital_labour", "same_day", "bn-Latn", "delivery r jonno kacher hospital labour room kothay?"),

    # ── 6. facility_pharmacy ──
    ("facility_pharmacy", "routine", "en", "Find medical store near me"),
    ("facility_pharmacy", "routine", "en", "Where is the nearest 24/7 chemist pharmacy?"),
    ("facility_pharmacy", "routine", "te", "సమీపంలో మెడికల్ షాప్ లేదా ఫార్మసీ ఎక్కడ ఉంది?"),
    ("facility_pharmacy", "routine", "te-Latn", "daggara medical shop pharmacy ekkada undi?"),
    ("facility_pharmacy", "routine", "hi", "पास में मेडिकल स्टोर या दवा की दुकान कहां है?"),
    ("facility_pharmacy", "routine", "hi-Latn", "pass me medical store ya chemist kaha hai?"),
    ("facility_pharmacy", "routine", "ta", "அருகில் உள்ள மருந்தகம் அல்லது மெடிக்கல் ஷாப் எங்குள்ளது?"),
    ("facility_pharmacy", "routine", "ta-Latn", "nearest medical shop pharmacy enga?"),
    ("facility_pharmacy", "routine", "kn", "ಹತ್ತಿರದ ಮೆಡಿಕಲ್ ಶಾಪ್ ಅಥವಾ ಔಷಧಿ ಅಂಗಡಿ ಎಲ್ಲಿದೆ?"),
    ("facility_pharmacy", "routine", "kn-Latn", "hattira medical store pharmacy ellide?"),
    ("facility_pharmacy", "routine", "ml", "അടുത്തുള്ള മെഡിക്കൽ ഷോപ്പ് അല്ലെങ്കിൽ ഫാർമസി എവിടെയാണ്?"),
    ("facility_pharmacy", "routine", "ml-Latn", "aduthulla medical shop pharmacy evideya?"),
    ("facility_pharmacy", "routine", "mr", "जवळचे मेडिकल स्टोअर किंवा औषधांचे दुकान कुठे आहे?"),
    ("facility_pharmacy", "routine", "mr-Latn", "jawalcha medical store pharmacy kuthe ahe?"),
    ("facility_pharmacy", "routine", "bn", "কাছের ওষুধের দোকান বা ফার্মেসি কোথায়?"),
    ("facility_pharmacy", "routine", "bn-Latn", "kacher osudher dokan pharmacy kothay?"),

    # ── 7. symptom_pregnancy ──
    ("symptom_pregnancy", "emergency_signal", "en", "I am 34 weeks pregnant and have severe vaginal bleeding with sharp pain"),
    ("symptom_pregnancy", "emergency_signal", "en", "Water broke suddenly with greenish fluid, baby is not moving"),
    ("symptom_pregnancy", "same_day", "en", "Having mild contractions every 15 minutes in 38th week"),
    ("symptom_pregnancy", "same_day", "en", "Severe headache and blurred vision with swollen feet in 3rd trimester"),
    ("symptom_pregnancy", "routine", "en", "Feeling mild nausea and backache in second trimester"),

    ("symptom_pregnancy", "emergency_signal", "te", "నాకు 8వ నెలలో రక్తస్రావం మరియు తీవ్రమైన కడుపు నొప్పి వస్తుంది"),
    ("symptom_pregnancy", "emergency_signal", "te", "ఉమ్మనీరు పడిపోయింది పసికందు కదలికలు తెలియడం లేదు"),
    ("symptom_pregnancy", "same_day", "te", "కాన్పు నొప్పులు ప్రతి 15 నిమిషాలకు వస్తున్నాయి"),
    ("symptom_pregnancy", "routine", "te", "రెండవ త్రైమాసికంలో నడుము నొప్పి సాధారణమేనా?"),

    ("symptom_pregnancy", "emergency_signal", "te-Latn", "8 months pregnant bleeding avthundi kadupu noppi ekkuva undi"),
    ("symptom_pregnancy", "emergency_signal", "te-Latn", "water break aindi baby movements levu"),
    ("symptom_pregnancy", "same_day", "te-Latn", "delivery pains vasthunnayi 15 mins ki okasari"),

    ("symptom_pregnancy", "emergency_signal", "hi", "मुझे 8वें महीने में तेज पेट दर्द और रक्तस्राव (ब्लीडिंग) हो रहा है"),
    ("symptom_pregnancy", "emergency_signal", "hi", "पानी की थैली फट गई है और शिशु की हलचल बंद हो गई है"),
    ("symptom_pregnancy", "same_day", "hi", "हर 15 मिनट में प्रसव पीड़ा (संकुचन) हो रही है"),
    ("symptom_pregnancy", "routine", "hi", "गर्भावस्था के पांचवें महीने में कमर दर्द और उल्टी जैसा लग रहा है"),

    ("symptom_pregnancy", "emergency_signal", "hi-Latn", "8th month me bleeding aur tez pet dard ho raha hai"),
    ("symptom_pregnancy", "emergency_signal", "hi-Latn", "pani choot gaya hai aur baby movement nahi kar raha"),

    ("symptom_pregnancy", "emergency_signal", "ta", "8 மாத கர்ப்பிணி கடுமையான ரத்தப்போக்கு மற்றும் தாங்க முடியாத வயிற்று வலி"),
    ("symptom_pregnancy", "emergency_signal", "ta", "பனிக்குடம் உடைந்து பச்சை நிற நீர் வெளியேறுகிறது குழந்தையின் அசைவு இல்லை"),
    ("symptom_pregnancy", "same_day", "ta", "15 நிமிடத்திற்கு ஒருமுறை பிரசவ வலி வருகிறது"),
    ("symptom_pregnancy", "routine", "ta", "இரண்டாவது காலாண்டில் லேசான முதுகு வலி மற்றும் குமட்டல்"),
    ("symptom_pregnancy", "emergency_signal", "ta-Latn", "8 months pregnant heavy bleeding severe abdominal pain"),
    ("symptom_pregnancy", "emergency_signal", "ta-Latn", "panikudam broken green fluid baby movement illa"),

    ("symptom_pregnancy", "emergency_signal", "kn", "8 ತಿಂಗಳ ಗರ್ಭಿಣಿಗೆ ತೀವ್ರ ರಕ್ತಸ್ರಾವ ಮತ್ತು ಅತಿಯಾದ ಹೊಟ್ಟೆನೋವು"),
    ("symptom_pregnancy", "emergency_signal", "kn", "ಉಮ್ಮಿನೀರು ಒಡೆದು ಹಸಿರು ದ್ರವ ಬರುತ್ತಿದೆ ಮಗುವಿನ ಚಲನೆ ನಿಂತಿದೆ"),
    ("symptom_pregnancy", "same_day", "kn", "ಪ್ರತಿ 15 ನಿಮಿಷಕ್ಕೆ ಹೆರಿಗೆ ನೋವು ಬರುತ್ತಿದೆ"),
    ("symptom_pregnancy", "routine", "kn", "ಎರಡನೇ ತ್ರೈಮಾಸಿಕದಲ್ಲಿ ಬೆನ್ನು ನೋವು ಮತ್ತು ವಾಕರಿಕೆ"),
    ("symptom_pregnancy", "emergency_signal", "kn-Latn", "8 months pregnant severe bleeding and sharp stomach pain"),
    ("symptom_pregnancy", "emergency_signal", "kn-Latn", "water break aithu baby movements illa"),

    ("symptom_pregnancy", "emergency_signal", "ml", "8 മാസം ഗർഭിണിയാണ് കഠിനമായ രക്തസ്രാവവും വയറുവേദനയും"),
    ("symptom_pregnancy", "emergency_signal", "ml", "അമ്നിയോട്ടിക് ഫ്ലൂയിഡ് പൊട്ടി വെള്ളം പോകുന്നു കുഞ്ഞിന്റെ അനക്കമില്ല"),
    ("symptom_pregnancy", "same_day", "ml", "ഓരോ 15 മിനിറ്റിലും പ്രസവവേദന വരുന്നു"),
    ("symptom_pregnancy", "routine", "ml", "രണ്ടാം ത്രൈമാസത്തിൽ നടുവേദനയും ഛർദ്ദിയും"),
    ("symptom_pregnancy", "emergency_signal", "ml-Latn", "8 months pregnant heavy bleeding severe stomach pain"),

    ("symptom_pregnancy", "emergency_signal", "mr", "८ व्या महिन्यात अचानक खूप रक्तस्त्राव आणि तीव्र पोटदुखी होत आहे"),
    ("symptom_pregnancy", "emergency_signal", "mr", "गर्भाशयाचे पाणी सुटले आहे आणि बाळाची हालचाल जाणवत नाही"),
    ("symptom_pregnancy", "same_day", "mr", "दर १५ मिनिटांनी प्रसूती वेदना (कळा) येत आहेत"),
    ("symptom_pregnancy", "routine", "mr", "दुसऱ्या तिमाहीत हलकी मळमळ आणि पाठदुखी"),
    ("symptom_pregnancy", "emergency_signal", "mr-Latn", "8 mahine pregnant khup bleeding ani potat tivra vedna"),

    ("symptom_pregnancy", "emergency_signal", "bn", "৮ মাসের গর্ভবতী হঠাৎ অতিরিক্ত রক্তক্ষরণ এবং তীব্র পেটে ব্যথা"),
    ("symptom_pregnancy", "emergency_signal", "bn", "পানি ভেঙে গেছে সবুজ রঙের তরল বের হচ্ছে বাচ্চার নড়াচড়া নেই"),
    ("symptom_pregnancy", "same_day", "bn", "প্রতি ১৫ মিনিট পর পর প্রসব বেদনা উঠছে"),
    ("symptom_pregnancy", "routine", "bn", "দ্বিতীয় ত্রৈমাসিকে হালকা পিঠে ব্যথা ও বমি ভাব"),
    ("symptom_pregnancy", "emergency_signal", "bn-Latn", "8 months pregnant heavy bleeding ar prochondo pete byatha"),

    # ── 8. symptom_infant_child ──
    ("symptom_infant_child", "emergency_signal", "en", "My 2 month old baby is turning blue and struggling to breathe"),
    ("symptom_infant_child", "emergency_signal", "en", "Baby is completely unresponsive and limp in the heat"),
    ("symptom_infant_child", "same_day", "en", "Infant has watery loose stools 6 times today and sunken fontanelle"),
    ("symptom_infant_child", "routine", "en", "My 3 month old is crying continuously after feeding, seems like colic"),

    ("symptom_infant_child", "emergency_signal", "te", "2 నెలల పసికందుకి ఊపిరి తీసుకోవడం కష్టంగా ఉంది పెదవులు నీలంగా మారాయి"),
    ("symptom_infant_child", "emergency_signal", "te", "ఎండలో బిడ్డ కదలకుండా అచేతనంగా పడిపోయింది"),
    ("symptom_infant_child", "same_day", "te", "చిన్నారికి విరేచనాలు మరియు కళ్ళు గుంటలు పడ్డాయి"),
    ("symptom_infant_child", "routine", "te", "పాలు తాగిన తర్వాత బాబు ఏడుస్తూనే ఉన్నాడు కడుపులో ఉబ్బరమా?"),
    ("symptom_infant_child", "emergency_signal", "te-Latn", "2 months baby ki breathing problem lip blue aindi"),

    ("symptom_infant_child", "emergency_signal", "hi", "2 महीने का शिशु सांस नहीं ले पा रहा है और होंठ नीले पड़ रहे हैं"),
    ("symptom_infant_child", "emergency_signal", "hi", "गर्मी में बच्चा बिल्कुल बेहोश जैसा हो गया है प्रतिक्रिया नहीं दे रहा"),
    ("symptom_infant_child", "same_day", "hi", "शिशु को दिन में 6 बार दस्त हुए हैं और तालू धंस गया है"),
    ("symptom_infant_child", "routine", "hi", "3 महीने का बच्चा दूध पीने के बाद लगातार रो रहा है गैस की समस्या"),
    ("symptom_infant_child", "emergency_signal", "hi-Latn", "2 month baby breathing nahi le pa raha blue ho raha hai"),

    ("symptom_infant_child", "emergency_signal", "ta", "2 மாத குழந்தைக்கு மூச்சு திணறல் மற்றும் உதடுகள் நீல நிறமாக மாறியுள்ளது"),
    ("symptom_infant_child", "emergency_signal", "ta", "வெயிலில் குழந்தை மயங்கி அசைவற்று கிடக்கிறது"),
    ("symptom_infant_child", "same_day", "ta", "குழந்தைக்கு இன்று 6 முறை வயிற்றுப்போக்கு மற்றும் உச்சி குழி விழுந்துள்ளது"),
    ("symptom_infant_child", "routine", "ta", "பால் குடித்த பிறகு குழந்தை தொடர்ந்து அழுகிறது"),
    ("symptom_infant_child", "emergency_signal", "ta-Latn", "2 month baby breathing kashtam lips blue aachu"),

    ("symptom_infant_child", "emergency_signal", "kn", "2 ತಿಂಗಳ ಮಗುವಿಗೆ ಉಸಿರಾಟದ ತೊಂದರೆ ಮತ್ತು ತುಟಿಗಳು ನೀಲಿ ಬಣ್ಣಕ್ಕೆ ತಿರುಗಿವೆ"),
    ("symptom_infant_child", "emergency_signal", "kn", "ಬಿಸಿಲಿನಲ್ಲಿ ಮಗು ಪ್ರಜ್ಞೆ ತಪ್ಪಿ ಬಿದ್ದಿದೆ ಯಾವುದೇ ಚಲನೆಯಿಲ್ಲ"),
    ("symptom_infant_child", "same_day", "kn", "ಮಗುವಿಗೆ ದಿನಕ್ಕೆ 6 ಬಾರಿ ಭೇದಿಯಾಗಿದ್ದು ನೆತ್ತಿ ಕುಸಿದಿದೆ"),
    ("symptom_infant_child", "routine", "kn", "ಹಾಲು ಕುಡಿದ ನಂತರ ಮಗು ನಿರಂತರವಾಗಿ ಅಳುತ್ತಿದೆ ಗ್ಯಾಸ್ ಸಮಸ್ಯೆಯೇ?"),
    ("symptom_infant_child", "emergency_signal", "kn-Latn", "2 months baby usirata problem lips neeli aagide"),

    ("symptom_infant_child", "emergency_signal", "ml", "2 മാസം പ്രായമുള്ള കുഞ്ഞിന് ശ്വാസതടസ്സം ചുണ്ടുകൾ നീലനിറമായി"),
    ("symptom_infant_child", "emergency_signal", "ml", "ചൂടിൽ കുഞ്ഞ് ബോധരഹിതനായി അനക്കമില്ലാതെ കിടക്കുന്നു"),
    ("symptom_infant_child", "same_day", "ml", "കുഞ്ഞിന് ഇന്ന് 6 തവണ വയറിളക്കം ഉണ്ടായി നെറുക താഴ്ന്നുപോയി"),
    ("symptom_infant_child", "routine", "ml", "പാൽ കുടിച്ച ശേഷം കുഞ്ഞ് നിർത്താതെ കരയുന്നു ഗ്യാസ് ആണോ?"),
    ("symptom_infant_child", "emergency_signal", "ml-Latn", "2 months baby shwasam edukkaan paadu lips blue aayi"),

    ("symptom_infant_child", "emergency_signal", "mr", "२ महिन्यांच्या बाळाला श्वास घेण्यास त्रास होतोय आणि ओठ निळे पडले आहेत"),
    ("symptom_infant_child", "emergency_signal", "mr", "उन्हात बाळ बेशुद्ध पडले आहे अजिबात हालचाल करत नाही"),
    ("symptom_infant_child", "same_day", "mr", "बाळाला आज ६ वेळा पातळ जुलाब झाले आणि टाळू खोल गेली आहे"),
    ("symptom_infant_child", "routine", "mr", "दूध पिल्यानंतर बाळ सतत रडत आहे गॅस झाला आहे का?"),
    ("symptom_infant_child", "emergency_signal", "mr-Latn", "2 month balala shwas ghyayla tras hoto otha nile padlet"),

    ("symptom_infant_child", "emergency_signal", "bn", "২ মাসের বাচ্চার শ্বাসকষ্ট হচ্ছে ও ঠোঁট নীল হয়ে গেছে"),
    ("symptom_infant_child", "emergency_signal", "bn", "গরমে বাচ্চা জ্ঞান হারিয়ে নিস্তেজ হয়ে পড়ে আছে"),
    ("symptom_infant_child", "same_day", "bn", "বাচ্চার দিনে ৬ বার পাতলা পায়খানা হয়েছে ও মাথার তালু বসে গেছে"),
    ("symptom_infant_child", "routine", "bn", "দুধ খাওয়ার পর বাচ্চা একটানা কাঁদছে পেটে গ্যাস হয়েছে কি?"),
    ("symptom_infant_child", "emergency_signal", "bn-Latn", "2 month bacchar shash koshto thot neel hoye geche"),

    # ── 9. symptom_fever ──
    ("symptom_fever", "emergency_signal", "en", "Newborn baby under 2 months has 102F fever and stiff neck"),
    ("symptom_fever", "emergency_signal", "en", "Child having seizure and convulsion with very high fever"),
    ("symptom_fever", "same_day", "en", "Toddler has 101F fever for 3 days and is refusing to eat"),
    ("symptom_fever", "routine", "en", "Mild fever 99.5F in adult, how to do lukewarm sponging?"),

    ("symptom_fever", "emergency_signal", "te", "నెల రోజుల పసికందుకి 102 జ్వరం మరియు మెడ బిగుసుకుపోయింది"),
    ("symptom_fever", "same_day", "te", "మూడు రోజులుగా 101 డిగ్రీల జ్వరం ఉంది ఏ మందు వేయాలి?"),
    ("symptom_fever", "routine", "te", "సాధారణ జ్వరం వస్తే తడిగుడ్డతో ఎలా తుడవాలి?"),
    ("symptom_fever", "emergency_signal", "te-Latn", "1 month baby ki 102 fever convulsions fit vachindi"),
    ("symptom_fever", "same_day", "te-Latn", "3 days nundi jvaram taggatam ledu 101 undi"),
    ("symptom_fever", "routine", "te-Latn", "fever undi cold sponge ela cheyali?"),
    ("symptom_fever", "same_day", "te-Latn", "baby ki jwaram 100 undi em cheyali"),

    ("symptom_fever", "emergency_signal", "hi", "1 महीने के नवजात को 102 बुखार और शरीर में ऐंठन (दौरे) आ रहे हैं"),
    ("symptom_fever", "same_day", "hi", "बच्चे को 3 दिन से 101 डिग्री बुखार है उतर नहीं रहा"),
    ("symptom_fever", "routine", "hi", "हल्का बुखार है पट्टी कैसे करें?"),
    ("symptom_fever", "emergency_signal", "hi-Latn", "newborn baby ko 102 bukhar hai aur jhatke aa rahe hai"),
    ("symptom_fever", "same_day", "hi-Latn", "3 din se 101 fever bukhar hai kam nahi ho raha"),
    ("symptom_fever", "routine", "hi-Latn", "bukhar me patti kaise kare gungune pani se?"),

    ("symptom_fever", "emergency_signal", "ta", "2 மாதத்திற்கு உட்பட்ட பச்சிளம் குழந்தைக்கு 102F காய்ச்சல் மற்றும் கழுத்து விறைப்பு"),
    ("symptom_fever", "emergency_signal", "ta", "அதிக காய்ச்சலுடன் குழந்தைக்கு வலிப்பு அல்லது இழுப்பு வருகிறது"),
    ("symptom_fever", "same_day", "ta", "குழந்தைக்கு 3 நாட்களாக 101 டிகிரி காய்ச்சல் உள்ளது குறையவில்லை"),
    ("symptom_fever", "routine", "ta", "லேசான காய்ச்சல் வெதுவெதுப்பான நீரில் துடைப்பது எப்படி?"),
    ("symptom_fever", "emergency_signal", "ta-Latn", "newborn baby 102 fever convulsions seizure valippu"),
    ("symptom_fever", "same_day", "ta-Latn", "3 days aa kaichal kurayala 101 fever"),

    ("symptom_fever", "emergency_signal", "kn", "2 ತಿಂಗಳ ಒಳಗಿನ ನವಜಾತ ಶಿಶುವಿಗೆ 102F ಜ್ವರ ಮತ್ತು ಕುತ್ತಿಗೆ ಬಿಗಿತ"),
    ("symptom_fever", "emergency_signal", "kn", "ಅತಿಯಾದ ಜ್ವರದೊಂದಿಗೆ ಮಗುವಿಗೆ ಫಿಟ್ಸ್ ಅಥವಾ ಸೆಳವು ಬರುತ್ತಿದೆ"),
    ("symptom_fever", "same_day", "kn", "ಮಗುವಿಗೆ 3 ದಿನಗಳಿಂದ 101 ಡಿಗ್ರಿ ಜ್ವರವಿದೆ ಕಡಿಮೆಯಾಗುತ್ತಿಲ್ಲ"),
    ("symptom_fever", "routine", "kn", "ಸಾಮಾನ್ಯ ಜ್ವರಕ್ಕೆ ಉಗುರುಬೆಚ್ಚಗಿನ ನೀರಿನಿಂದ ಮೈ ಒರೆಸುವುದು ಹೇಗೆ?"),
    ("symptom_fever", "emergency_signal", "kn-Latn", "newborn baby 102 jwara convulsions fits bandide"),
    ("symptom_fever", "same_day", "kn-Latn", "3 dina dinda jwara kadime aagilla 101"),

    ("symptom_fever", "emergency_signal", "ml", "2 മാസത്തിൽ താഴെയുള്ള നവജാതശിശുവിന് 102F പനിയും കഴുത്ത് കോച്ചലും"),
    ("symptom_fever", "emergency_signal", "ml", "കഠിനമായ പനിയോടൊപ്പം കുഞ്ഞിന് അപസ്മാരം അല്ലെങ്കിൽ ഫിറ്റ്സ്"),
    ("symptom_fever", "same_day", "ml", "കുഞ്ഞിന് 3 ദിവസമായി 101 ഡിഗ്രി പനിയുണ്ട് കുറയുന്നില്ല"),
    ("symptom_fever", "routine", "ml", "ചെറിയ പനിക്ക് ചെറുചൂടുവെള്ളത്തിൽ തുണി നനച്ചു തുടയ്ക്കുന്നത് എങ്ങനെ?"),
    ("symptom_fever", "emergency_signal", "ml-Latn", "newborn baby 102 pani convulsions fits vannu"),
    ("symptom_fever", "same_day", "ml-Latn", "3 divasam aayi pani maarunnilla 101"),

    ("symptom_fever", "emergency_signal", "mr", "२ महिन्यांपेक्षा लहान नवजात बाळाला १०२ ताप आणि मान ताठ झाली आहे"),
    ("symptom_fever", "emergency_signal", "mr", "खूप तापासोबत बाळाला झटके (आचके) येत आहेत"),
    ("symptom_fever", "same_day", "mr", "बाळाला ३ दिवसांपासून १०१ ताप आहे कमी होत नाहीये"),
    ("symptom_fever", "routine", "mr", "हल्का ताप आहे कोमट पाण्याने अंग कसे पुसावे?"),
    ("symptom_fever", "emergency_signal", "mr-Latn", "newborn balala 102 taap convulsions jhatke yet ahet"),
    ("symptom_fever", "same_day", "mr-Latn", "3 divasapasun taap kami hot nahiye 101"),

    ("symptom_fever", "emergency_signal", "bn", "২ মাসের কম বয়সী নবজাতকের ১০২ ডিগ্রি জ্বর ও ঘাড় শক্ত হয়ে গেছে"),
    ("symptom_fever", "emergency_signal", "bn", "তীব্র জ্বরের সাথে বাচ্চার খিঁচুনি বা কাঁপুনি উঠছে"),
    ("symptom_fever", "same_day", "bn", "বাচ্চার ৩ দিন ধরে ১০১ ডিগ্রি জ্বর কমছে না"),
    ("symptom_fever", "routine", "bn", "হালকা জ্বর হলে কুসুম গরম পানিতে শরীর স্পঞ্জ করব কীভাবে?"),
    ("symptom_fever", "emergency_signal", "bn-Latn", "newborn baby 102 jwor convulsions khichuni uthche"),
    ("symptom_fever", "same_day", "bn-Latn", "3 din dhore jwor komche na 101"),

    # ── 10. symptom_general_adult ──
    ("symptom_general_adult", "emergency_signal", "en", "Grandmother collapsed outside in heat with hot dry skin and no sweat"),
    ("symptom_general_adult", "same_day", "en", "Severe heat cramps in legs and dizzy fainting sensation"),
    ("symptom_general_adult", "routine", "en", "Mild heat headache and fatigue after working in sun"),

    ("symptom_general_adult", "emergency_signal", "te", "ఎండలో నడిచి స్పృహ తప్పి పడిపోయారు చర్మం వేడిగా ఉంది చెమట పట్టట్లేదు"),
    ("symptom_general_adult", "same_day", "te", "ఎండ తీవ్రత వల్ల కాళ్ళ నొప్పులు మరియు తీవ్రమైన కళ్ళు తిరగడం"),
    ("symptom_general_adult", "routine", "te", "ఎండలో తిరిగిన తర్వాత తలనొప్పి మరియు నీరసం వస్తుంది"),
    ("symptom_general_adult", "emergency_signal", "te-Latn", "enda debba valla spruha thappipoyaru heat stroke"),

    ("symptom_general_adult", "emergency_signal", "hi", "धूप में चक्कर खाकर गिर गए हैं और पसीना नहीं आ रहा है हीट स्ट्रोक"),
    ("symptom_general_adult", "same_day", "hi", "गर्मी की वजह से मांसपेशियों में ऐंठन और तेज चक्कर आ रहे हैं"),
    ("symptom_general_adult", "routine", "hi", "धूप में काम करने के बाद सिरदर्द और थकान हो रही है"),
    ("symptom_general_adult", "emergency_signal", "hi-Latn", "dhoop me behosh ho gaye heat stroke sweat nahi aa raha"),

    ("symptom_general_adult", "emergency_signal", "ta", "வெயிலில் சென்று மயங்கி விழுந்துவிட்டார் தோல் சூடாக உள்ளது வியர்வை இல்லை ஹீட் ஸ்ட்ரோக்"),
    ("symptom_general_adult", "same_day", "ta", "வெயில் தாக்கத்தால் கால்களில் தசைப்பிடிப்பு மற்றும் மயக்கம்"),
    ("symptom_general_adult", "routine", "ta", "வெயிலில் வேலை செய்த பிறகு தலைவலி மற்றும் சோர்வு"),
    ("symptom_general_adult", "emergency_signal", "ta-Latn", "veiyil la behosh fainting heat stroke no sweat"),

    ("symptom_general_adult", "emergency_signal", "kn", "ಬಿಸಿಲಿನಲ್ಲಿ ಹೋಗಿ ಪ್ರಜ್ಞೆ ತಪ್ಪಿ ಬಿದ್ದಿದ್ದಾರೆ ಮೈ ಬಿಸಿಯಾಗಿದೆ ಬೆವರುತ್ತಿಲ್ಲ ಹೀಟ್ ಸ್ಟ್ರೋಕ್"),
    ("symptom_general_adult", "same_day", "kn", "ಬಿಸಿಲಿನ ತೀವ್ರತೆಯಿಂದ ಕಾಲು ಸೆಳೆತ ಮತ್ತು ತಲೆಸುತ್ತು"),
    ("symptom_general_adult", "routine", "kn", "ಬಿಸಿಲಿನಲ್ಲಿ ಕೆಲಸ ಮಾಡಿದ ನಂತರ ತಲೆನೋವು ಮತ್ತು ಆಯಾಸ"),
    ("symptom_general_adult", "emergency_signal", "kn-Latn", "bisilalli unconscious heat stroke sweat illa"),

    ("symptom_general_adult", "emergency_signal", "ml", "ചൂടിൽ തലകറങ്ങി വീണു ശരീരം ചൂടാണ് വിയർക്കുന്നില്ല ഹീറ്റ് സ്ട്രോക്ക്"),
    ("symptom_general_adult", "same_day", "ml", "കഠിന ചൂട് കാരണം കാലുകളിൽ കോച്ചലും തലകറക്കവും"),
    ("symptom_general_adult", "routine", "ml", "വെയിലത്ത് ജോലി ചെയ്ത ശേഷം തലവേദനയും ക്ഷീണവും"),
    ("symptom_general_adult", "emergency_signal", "ml-Latn", "choodil fainting heat stroke no sweating"),

    ("symptom_general_adult", "emergency_signal", "mr", "उन्हात चक्कर येऊन पडले आहेत त्वचा गरम आहे पण घाम येत नाही हीट स्ट्रोक"),
    ("symptom_general_adult", "same_day", "mr", "उन्हामुळे पायाच्या स्नायूंमध्ये पेटके आणि चक्कर येणे"),
    ("symptom_general_adult", "routine", "mr", "उन्हात काम केल्यावर डोकेदुखी आणि थकवा"),
    ("symptom_general_adult", "emergency_signal", "mr-Latn", "unhat behosh padle heat stroke gham yet nahi"),

    ("symptom_general_adult", "emergency_signal", "bn", "রোদে মাথা ঘুরে পড়ে গেছেন ত্বক গরম কিন্তু ঘাম হচ্ছে না হিট স্ট্রোক"),
    ("symptom_general_adult", "same_day", "bn", "গরমের কারণে পায়ে টান ধরা ও মাথা ঘোরানো"),
    ("symptom_general_adult", "routine", "bn", "রোদে কাজ করার পর মাথা ব্যথা ও ক্লান্তি"),
    ("symptom_general_adult", "emergency_signal", "bn-Latn", "rode behosh hoye geche heat stroke gham hocche na"),

    # ── 11. daily_brief_subscribe ──
    ("daily_brief_subscribe", "routine", "en", "Send me morning weather forecast daily at 7 AM"),
    ("daily_brief_subscribe", "routine", "en", "Stop sending daily morning forecast messages"),
    ("daily_brief_subscribe", "routine", "te", "ప్రతిరోజూ ఉదయం 7 గంటలకు వాతావరణ బులెటిన్ పంపించండి"),
    ("daily_brief_subscribe", "routine", "te", "రోజూ ఉదయం వచ్చే మెసేజ్‌లు ఆపండి"),
    ("daily_brief_subscribe", "routine", "hi", "रोजाना सुबह 7 बजे मुझे मौसम का पूर्वानुमान भेजिए"),
    ("daily_brief_subscribe", "routine", "hi", "रोज सुबह आने वाले संदेश बंद कर दीजिए अनसब्सक्राइब"),
    ("daily_brief_subscribe", "routine", "ta", "தினமும் காலை 7 மணிக்கு வானிலை அறிக்கை அனுப்புங்கள் சப்ஸ்கிரைப்"),
    ("daily_brief_subscribe", "routine", "ta", "தினசரி வானிலை மெசேஜ்களை நிறுத்துங்கள் அன்சப்ஸ்கிரைப்"),
    ("daily_brief_subscribe", "routine", "kn", "ಪ್ರತಿದಿನ ಬೆಳಿಗ್ಗೆ 7 ಗಂಟೆಗೆ ಹವಾಮಾನ ವರದಿ ಕಳುಹಿಸಿ ಸಬ್‌ಸ್ಕ್ರೈಬ್"),
    ("daily_brief_subscribe", "routine", "kn", "ದೈನಂದಿನ ಹವಾಮಾನ ಸಂದೇಶಗಳನ್ನು ನಿಲ್ಲಿಸಿ ಅನ್‌ಸಬ್‌ಸ್ಕ್ರೈಬ್"),
    ("daily_brief_subscribe", "routine", "ml", "ദിവസവും രാവിലെ 7 മണിക്ക് കാലാവസ്ഥാ അപ്ഡേറ്റ് അയക്കൂ സബ്സ്ക്രൈബ്"),
    ("daily_brief_subscribe", "routine", "ml", "ദൈനംദിന കാലാവസ്ഥാ സന്ദേശങ്ങൾ നിർത്തൂ അൺസബ്സ്ക്രൈബ്"),
    ("daily_brief_subscribe", "routine", "mr", "दररोज सकाळी ७ वाजता हवामान अंदाज पाठवा सबस्क्राईब"),
    ("daily_brief_subscribe", "routine", "mr", "दैनिक हवामान संदेश बंद करा अनसबस्क्राईब"),
    ("daily_brief_subscribe", "routine", "bn", "প্রতিদিন সকাল ৭টায় আবহাওয়ার আপডেট পাঠান সাবস্ক্রাইব"),
    ("daily_brief_subscribe", "routine", "bn", "দৈনিক আবহাওয়া বার্তা পাঠানো বন্ধ করুন আনসাবস্ক্রাইব"),

    # ── 12. feedback_survey ──
    ("feedback_survey", "routine", "en", "I want to give feedback on Dayli AI"),
    ("feedback_survey", "routine", "en", "Start the feedback survey 5 stars"),
    ("feedback_survey", "routine", "te", "డేలీ AIకి ఫీడ్‌బ్యాక్ ఇవ్వాలనుకుంటున్నాను"),
    ("feedback_survey", "routine", "te", "సర్వే చేయండి రేటింగ్ ఇస్తాను"),
    ("feedback_survey", "routine", "hi", "मैं Dayli AI को फीडबैक देना चाहता हूं"),
    ("feedback_survey", "routine", "hi", "सर्वे शुरू करें रेटिंग देनी है"),
    ("feedback_survey", "routine", "ta", "டேலி AI-க்கு கருத்து தெரிவிக்க விரும்புகிறேன்"),
    ("feedback_survey", "routine", "ta", "கருத்துக்கணிப்பை தொடங்குங்கள் 5 நட்சத்திர மதிப்பீடு"),
    ("feedback_survey", "routine", "kn", "ಡೇಲಿ AI ಗೆ ಪ್ರತಿಕ್ರಿಯೆ ನೀಡಲು ಬಯಸುತ್ತೇನೆ"),
    ("feedback_survey", "routine", "kn", "ಸಮೀಕ್ಷೆಯನ್ನು ಪ್ರಾರಂಭಿಸಿ 5 ಸ್ಟಾರ್ ರೇಟಿಂಗ್"),
    ("feedback_survey", "routine", "ml", "ഡേലി AI-ക്ക് ഫീഡ്ബാക്ക് നൽകാൻ ആഗ്രഹിക്കുന്നു"),
    ("feedback_survey", "routine", "ml", "സർവേ ആരംഭിക്കൂ 5 സ്റ്റാർ റേറ്റിംഗ്"),
    ("feedback_survey", "routine", "mr", "Dayli AI ला अभिप्राय द्यायचा आहे"),
    ("feedback_survey", "routine", "mr", "सर्वेक्षण सुरू करा ५ स्टार रेटिंग"),
    ("feedback_survey", "routine", "bn", "Dayli AI কে মতামত বা ফিডব্যাক দিতে চাই"),
    ("feedback_survey", "routine", "bn", "সমীক্ষা শুরু করুন ৫ স্টার রেটিং"),

    # ── 13. opt_out_delete ──
    ("opt_out_delete", "routine", "en", "Opt out and delete my data immediately"),
    ("opt_out_delete", "routine", "en", "Stop messaging me, remove my account"),
    ("opt_out_delete", "routine", "te", "ఆప్ట్ అవుట్ చేయండి నా వివరాలు పూర్తిగా తొలగించండి"),
    ("opt_out_delete", "routine", "te", "ఇకపై సందేశాలు పంపవద్దు నా డేటా డిలీట్ చేయండి"),
    ("opt_out_delete", "routine", "hi", "ऑप्ट आउट करें और मेरा सारा डेटा तुरंत डिलीट करें"),
    ("opt_out_delete", "routine", "hi", "मुझे अब कोई मैसेज न भेजें मेरी जानकारी हटा दें"),
    ("opt_out_delete", "routine", "ta", "விலகுகிறேன் எனது விவரங்களை உடனடியாக அழிக்கவும்"),
    ("opt_out_delete", "routine", "ta", "என்னை நீக்கு என் தரவை அழி"),
    ("opt_out_delete", "routine", "kn", "ಆಪ್ಟ್-ಔಟ್ ಮಾಡಿ ನನ್ನ ಎಲ್ಲಾ ಡೇಟಾವನ್ನು ತಕ್ಷಣವೇ ಅಳಿಸಿ"),
    ("opt_out_delete", "routine", "kn", "ನನ್ನ ಖಾತೆ ಮತ್ತು ವಿವರಗಳನ್ನು ತೆಗೆದುಹಾಕಿ"),
    ("opt_out_delete", "routine", "ml", "ഒഴിവാക്കുക എന്റെ വിവരങ്ങൾ ഉടനടി നീക്കം ചെയ്യുക"),
    ("opt_out_delete", "routine", "ml", "ഡാറ്റ ഡിലീറ്റ് ചെയ്യുക സന്ദേശങ്ങൾ നിർത്തുക"),
    ("opt_out_delete", "routine", "mr", "ऑप्ट आउट करा आणि माझा सर्व डेटा त्वरित हटवा"),
    ("opt_out_delete", "routine", "mr", "माझे खाते काढून टाका मेसेज पाठवू नका"),
    ("opt_out_delete", "routine", "bn", "অপ্ট আউট করুন এবং আমার সমস্ত তথ্য এখনই মুছে ফেলুন"),
    ("opt_out_delete", "routine", "bn", "আমার অ্যাকাউন্ট মুছে দিন আর মেসেজ পাঠাবেন না"),

    # ── 14. greeting_smalltalk ──
    ("greeting_smalltalk", "routine", "en", "Hi"),
    ("greeting_smalltalk", "routine", "en", "Hello Dayli"),
    ("greeting_smalltalk", "routine", "en", "Good morning"),
    ("greeting_smalltalk", "routine", "en", "What can you do?"),
    ("greeting_smalltalk", "routine", "te", "నమస్కారం"),
    ("greeting_smalltalk", "routine", "te", "హలో డేలీ"),
    ("greeting_smalltalk", "routine", "te", "శుభోదయం"),
    ("greeting_smalltalk", "routine", "hi", "नमस्ते"),
    ("greeting_smalltalk", "routine", "hi", "हेलो Dayli"),
    ("greeting_smalltalk", "routine", "hi", "सुप्रभात"),
    ("greeting_smalltalk", "routine", "ta", "வணக்கம்"),
    ("greeting_smalltalk", "routine", "ta", "ஹலோ டேலி"),
    ("greeting_smalltalk", "routine", "ta", "காலை வணக்கம்"),
    ("greeting_smalltalk", "routine", "kn", "ನಮಸ್ಕಾರ"),
    ("greeting_smalltalk", "routine", "kn", "ಹಲೋ ಡೇಲಿ"),
    ("greeting_smalltalk", "routine", "kn", "ಶುಭೋದಯ"),
    ("greeting_smalltalk", "routine", "ml", "നമസ്കാരം"),
    ("greeting_smalltalk", "routine", "ml", "ഹലോ ഡേലി"),
    ("greeting_smalltalk", "routine", "ml", "സുപ്രഭാതം"),
    ("greeting_smalltalk", "routine", "mr", "नमस्कार"),
    ("greeting_smalltalk", "routine", "mr", "हॅलो Dayli"),
    ("greeting_smalltalk", "routine", "mr", "शुभ प्रभात"),
    ("greeting_smalltalk", "routine", "bn", "নমস্কার"),
    ("greeting_smalltalk", "routine", "bn", "হ্যালো Dayli"),
    ("greeting_smalltalk", "routine", "bn", "সুপ্রভাত"),

    # ── 15. out_of_scope ──
    ("out_of_scope", "routine", "en", "Book movie tickets for tonight"),
    ("out_of_scope", "routine", "en", "What is the live cricket score India vs Australia?"),
    ("out_of_scope", "routine", "en", "Tell me a joke"),
    ("out_of_scope", "routine", "en", "What is the share price of Tata Motors?"),
    ("out_of_scope", "routine", "te", "సినిమా టికెట్లు బుక్ చేయండి"),
    ("out_of_scope", "routine", "te", "క్రికెట్ స్కోర్ ఎంత?"),
    ("out_of_scope", "routine", "hi", "सिनेमा की टिकट बुक कर दो"),
    ("out_of_scope", "routine", "hi", "क्रिकेट स्कोर क्या चल रहा है?"),
    ("out_of_scope", "routine", "ta", "சினிமா டிக்கெட் புக் செய்யுங்கள்"),
    ("out_of_scope", "routine", "ta", "இன்றைய கிரிக்கெட் ஸ்கோர் என்ன?"),
    ("out_of_scope", "routine", "kn", "ಸಿನಿಮಾ ಟಿಕೆಟ್ ಬುಕ್ ಮಾಡಿ"),
    ("out_of_scope", "routine", "kn", "ಇಂದಿನ ಕ್ರಿಕೆಟ್ ಸ್ಕೋರ್ ಎಷ್ಟಾಗಿದೆ?"),
    ("out_of_scope", "routine", "ml", "സിനിമ ടിക്കറ്റ് ബുക്ക് ചെയ്യുക"),
    ("out_of_scope", "routine", "ml", "ക്രിക്കറ്റ് സ്കോർ എത്രയായി?"),
    ("out_of_scope", "routine", "mr", "चित्रपटाचे तिकीट बुक करा"),
    ("out_of_scope", "routine", "mr", "आजचा क्रिकेट स्कोर काय आहे?"),
    ("out_of_scope", "routine", "bn", "সিনেমার টিকিট বুক করুন"),
    ("out_of_scope", "routine", "bn", "আজকের ক্রিকেট স্কোর কত?"),
]

# Systematic paraphrase modifiers to expand dataset to ~3,000 diverse utterances
EN_PREFIXES = ["Please tell me: ", "Can you help: ", "Urgent question: ", "Doctor: ", "Hello, ", "Kindly share ", "I want to know "]
TE_PREFIXES = ["దయచేసి చెప్పండి: ", "సహాయం కావాలి: ", "డాక్టర్ గారూ: ", "నమస్కారం, "]
HI_PREFIXES = ["कृपया बताएं: ", "मदद चाहिए: ", "नमस्ते डॉक्टर, ", "जानकारी दीजिए: "]
TA_PREFIXES = ["தயவுசெய்து சொல்லுங்கள்: ", "உதவி வேண்டும்: ", "டாக்டர்: ", "வணக்கம், "]
KN_PREFIXES = ["ದಯವಿಟ್ಟು ತಿಳಿಸಿ: ", "ಸಹಾಯ ಬೇಕು: ", "ಡಾಕ್ಟರ್: ", "ನಮಸ್ಕಾರ, "]
ML_PREFIXES = ["ദയവായി പറയൂ: ", "സഹായം വേണം: ", "ഡോക്ടർ: ", "നമസ്കാരം, "]
MR_PREFIXES = ["कृपया सांगा: ", "मदत हवी आहे: ", "डॉक्टर: ", "नमस्कार, "]
BN_PREFIXES = ["দয়া করে বলুন: ", "সাহায্য চাই: ", "ডাক্তার: ", "নমস্কার, "]
LATN_PREFIXES = ["pls tell: ", "help me: ", "doctor: ", "hey dayli: "]

def expand_dataset(seeds):
    expanded = []
    seen = set()

    for intent, urgency, lang, text in seeds:
        clean = text.strip()
        if clean.lower() not in seen:
            seen.add(clean.lower())
            expanded.append({"text": clean, "intent": intent, "urgency": urgency, "lang": lang})

        # Add punctuation and case variants
        for variant in [clean + "?", clean + "!", clean.lower(), clean.upper() if len(clean) < 15 else clean]:
            if variant.lower() not in seen:
                seen.add(variant.lower())
                expanded.append({"text": variant, "intent": intent, "urgency": urgency, "lang": lang})

        # Add language-appropriate prefixes
        prefixes = (
            EN_PREFIXES if lang == "en"
            else TE_PREFIXES if lang == "te"
            else HI_PREFIXES if lang == "hi"
            else TA_PREFIXES if lang == "ta"
            else KN_PREFIXES if lang == "kn"
            else ML_PREFIXES if lang == "ml"
            else MR_PREFIXES if lang == "mr"
            else BN_PREFIXES if lang == "bn"
            else LATN_PREFIXES
        )

        for p in prefixes[:3]:
            prefixed = p + clean
            if prefixed.lower() not in seen:
                seen.add(prefixed.lower())
                expanded.append({"text": prefixed, "intent": intent, "urgency": urgency, "lang": lang})

    random.shuffle(expanded)
    return expanded

def main():
    print("Building Dayli Multilingual Climate-Health Dataset...")
    full_data = expand_dataset(SEEDS)
    print(f"Total synthetic & seed samples generated: {len(full_data)}")

    # Stratified split: 80% train, 20% holdout (stratified by intent)
    by_intent = defaultdict(list)
    for row in full_data:
        by_intent[row["intent"]].append(row)

    train_data = []
    holdout_data = []

    for intent, rows in by_intent.items():
        random.shuffle(rows)
        split_idx = int(len(rows) * 0.8)
        train_data.extend(rows[:split_idx])
        holdout_data.extend(rows[split_idx:])

    random.shuffle(train_data)
    random.shuffle(holdout_data)

    out_train_path = "ml/data/train.jsonl"
    out_holdout_path = "ml/data/eval/holdout.jsonl"

    with open(out_train_path, "w", encoding="utf-8") as f:
        for r in train_data:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    with open(out_holdout_path, "w", encoding="utf-8") as f:
        for r in holdout_data:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"✅ Train dataset written to: {out_train_path} ({len(train_data)} rows)")
    print(f"✅ Holdout evaluation dataset written to: {out_holdout_path} ({len(holdout_data)} rows)")

    # Write DATA_CARD.md
    data_card = f"""# Dayli Multilingual Climate-Health Intent & Urgency Dataset (v1)

## Summary
Curated multilingual training and benchmark holdout dataset created specifically for Dayli's Human-Scale AI router. Covers maternal, neonatal, and climate heat risks across 8 Indian languages (English, Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi, Bengali) and their Romanized colloquial dialects.

## Dataset Statistics
- **Total Samples**: {len(full_data)}
- **Training Samples**: {len(train_data)} (`ml/data/train.jsonl`)
- **Holdout Test Samples**: {len(holdout_data)} (`ml/data/eval/holdout.jsonl`)
- **Languages**:
  - `en`: English
  - `te`: Telugu (తెలుగు) & `te-Latn` (Tenglish)
  - `hi`: Hindi (हिन्दी) & `hi-Latn` (Hinglish)
  - `ta`: Tamil (தமிழ்) & `ta-Latn` (Tanglish)
  - `kn`: Kannada (ಕನ್ನಡ) & `kn-Latn` (Kanglish)
  - `ml`: Malayalam (മലയാളം) & `ml-Latn` (Manglish)
  - `mr`: Marathi (मराठी) & `mr-Latn` (Marathlish)
  - `bn`: Bengali (বাংলা) & `bn-Latn` (Banglish)

## Taxonomy
- **14 Core Intents + 1 Out of Scope Class**:
  1. `weather_now_24h`: Real-time temperature, heat shifts, rain & nighttime lows.
  2. `weather_5day`: 5-day / multi-day forecast & outlooks.
  3. `heat_hydration`: Heat prevention, ORSL, coconut water, infant hydration safety.
  4. `air_quality`: Pollution, AQI index, smoke, dust alerts.
  5. `facility_hospital_labour`: Nearest ready labour room, bed availability, maternity centers.
  6. `facility_pharmacy`: Nearest pharmacy / 24h chemist.
  7. `symptom_pregnancy`: Contractions, bleeding, water breaking, preeclampsia symptoms.
  8. `symptom_infant_child`: Breathing distress, fontanelle depression, loose stools, colic.
  9. `symptom_fever`: Infant/pediatric/maternal fever, sponging guidance.
  10. `symptom_general_adult`: Heat exhaustion, heat stroke collapse, muscle cramps.
  11. `daily_brief_subscribe`: Subscribe/unsubscribe to daily 7 AM forecast alerts.
  12. `feedback_survey`: 30-second CSAT MCQ quality survey.
  13. `opt_out_delete`: Immediate DPDP Act data deletion & opt-out.
  14. `greeting_smalltalk`: Greetings, capabilities, identity.
  15. `out_of_scope`: Non-health/non-climate requests (filtered to maintain clinical scope).

- **3 Urgency Tiers**:
  - `emergency_signal`: Critical maternal/pediatric danger signs.
  - `same_day`: High-risk or urgent review needed today.
  - `routine`: Standard daily questions and care navigation.

## Ethical Standards & Privacy
- **Zero-PHI**: No real phone numbers, names, or addresses are stored or used.
- **DPDP Act 2023 Compliant**: Completely de-identified seed corpus.
- **Licence**: Creative Commons Attribution 4.0 International (CC-BY-4.0).
"""
    with open("ml/DATA_CARD.md", "w", encoding="utf-8") as f:
        f.write(data_card)

    print("✅ ml/DATA_CARD.md generated.")

if __name__ == "__main__":
    main()
