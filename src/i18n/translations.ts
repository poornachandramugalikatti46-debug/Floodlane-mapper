import {LanguageCode, NavSection, ReportCategory, RiskLevel, VerificationStatus, FeatureCategory} from '../types';

export interface TranslationDictionary {
  appName: string;
  tagline: string;
  wardSubtitle: string;
  demoDisclaimer: string;
  nav: Record<NavSection, string>;
  kpis: {
    housesMapped: string;
    streetsMapped: string;
    drainagePoints: string;
    floodHotspots: string;
    communityReports: string;
    pendingVerification: string;
  };
  risk: Record<RiskLevel, string>;
  status: Record<VerificationStatus, string>;
  categories: Record<FeatureCategory, string>;
  reportCategories: Record<ReportCategory, string>;
  common: {
    reportFloodIssue: string;
    startMapping: string;
    onlineLocalSaved: string;
    offlineMode: string;
    pendingSync: string;
    syncNow: string;
    basemapOsm: string;
    basemapSatellite: string;
    locateMe: string;
    filterRisk: string;
    filterCategory: string;
    all: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    viewOnMap: string;
    latitude: string;
    longitude: string;
    description: string;
    uploadPhoto: string;
    submitReport: string;
    findNearestShelter: string;
    downloadGeoJSON: string;
    downloadCSV: string;
    approveVerify: string;
    markReviewed: string;
    reject: string;
    autoSnap: string;
    undoVertex: string;
    finishShape: string;
    clearDraft: string;
    demoRouteNotice: string;
    scientificDisclaimer: string;
  };
}

export const TRANSLATIONS: Record<LanguageCode, TranslationDictionary> = {
  en: {
    appName: 'FloodLane Mapper',
    tagline: 'Mapping Every Lane. Protecting Every Life.',
    wardSubtitle: 'Ward 148 · Ejipura–Koramangala Low-Lying Settlement (Bengaluru)',
    demoDisclaimer: 'DEMO DATA — COMMUNITY CONTRIBUTED — UNVERIFIED',
    nav: {
      'dashboard': 'Dashboard',
      'live-map': 'Live Flood Map',
      'community-mapping': 'Community Mapping',
      'report-issue': 'Report Flood Issue',
      'risk-analysis': 'Flood Risk Analysis',
      'safe-shelters': 'Safe Shelters',
      'community-reports': 'Community Reports',
      'gis-export': 'GIS Data Export',
      'admin-panel': 'Admin Panel',
      'settings': 'Settings',
    },
    kpis: {
      housesMapped: 'Total Houses Mapped',
      streetsMapped: 'Total Streets Mapped',
      drainagePoints: 'Total Drainage Points',
      floodHotspots: 'Flood Hotspots',
      communityReports: 'Total Community Reports',
      pendingVerification: 'Pending Verification',
    },
    risk: {
      LOW: 'Low Risk',
      MEDIUM: 'Medium Risk',
      HIGH: 'High Risk',
      CRITICAL: 'Critical Risk',
    },
    status: {
      Pending: 'Pending',
      Reviewed: 'Reviewed',
      Verified: 'Verified',
      Rejected: 'Rejected',
    },
    categories: {
      house: 'Houses',
      street: 'Narrow Streets & Lanes',
      drain: 'Drainage Systems',
      blocked_drain: 'Blocked Drains',
      waterlogging: 'Waterlogging Locations',
      flood_zone: 'Flood-Prone Zones',
    },
    reportCategories: {
      'Waterlogging': 'Waterlogging',
      'Blocked Drain': 'Blocked Drain',
      'Overflowing Drain': 'Overflowing Drain',
      'Flooded House': 'Flooded House',
      'Road Flooding': 'Road Flooding',
    },
    common: {
      reportFloodIssue: 'Report Flood Issue',
      startMapping: 'Community Mapping',
      onlineLocalSaved: 'Online · Local IndexedDB Active',
      offlineMode: 'Offline Mode · Saving Locally',
      pendingSync: 'Pending Sync Queue',
      syncNow: 'Process Queue',
      basemapOsm: 'OpenStreetMap',
      basemapSatellite: 'Satellite Imagery',
      locateMe: 'My GPS Location',
      filterRisk: 'Risk Level',
      filterCategory: 'Layer Filter',
      all: 'All',
      save: 'Save Feature',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      viewOnMap: 'Locate on Map',
      latitude: 'Latitude',
      longitude: 'Longitude',
      description: 'Field Observation / Description',
      uploadPhoto: 'Attach Field Photograph',
      submitReport: 'Submit Flood Report',
      findNearestShelter: 'Calculate Safe Evacuation Route',
      downloadGeoJSON: 'Download GeoJSON (.geojson)',
      downloadCSV: 'Download Tabular CSV (.csv)',
      approveVerify: 'Verify & Approve',
      markReviewed: 'Mark Reviewed',
      reject: 'Reject',
      autoSnap: 'Auto-Snap to Lanes',
      undoVertex: 'Undo Point',
      finishShape: 'Complete Shape',
      clearDraft: 'Clear',
      demoRouteNotice: 'DEMO / UNVERIFIED ROUTE — Avoids mapped Critical & High flood segments. Verify street conditions in person.',
      scientificDisclaimer: 'Community Observation Layer: Risk ratings reflect resident-reported monsoon history and local drainage notes, not real-time hydrodynamic sensor predictions.',
    },
  },
  kn: {
    appName: 'ಫ್ಲಡ್‌ಲೇನ್ ಮ್ಯಾಪರ್',
    tagline: 'ಪ್ರತಿ ಓಣಿಯ ನಕ್ಷೆ. ಪ್ರತಿ ಜೀವದ ರಕ್ಷಣೆ.',
    wardSubtitle: 'ವಾರ್ಡ್ 148 · ಈಜಿಪುರ–ಕೋರಮಂಗಲ ತಗ್ಗು ಪ್ರದೇಶ (ಬೆಂಗಳೂರು)',
    demoDisclaimer: 'ಡೆಮೊ ಡೇಟಾ — ಸಮುದಾಯದಿಂದ ಸಂಗ್ರಹಿಸಲಾದ — ಪರಿಶೀಲಿಸದ ಮಾಹಿತಿ',
    nav: {
      'dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
      'live-map': 'ನೇರ ಪ್ರವಾಹ ನಕ್ಷೆ',
      'community-mapping': 'ಸಮುದಾಯ ನಕ್ಷೆ ರಚನೆ',
      'report-issue': 'ಪ್ರವಾಹ ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ',
      'risk-analysis': 'ಪ್ರವಾಹ ಅಪಾಯ ವಿಶ್ಲೇಷಣೆ',
      'safe-shelters': 'ಸುರಕ್ಷಿತ ಆಶ್ರಯ ಕೇಂದ್ರಗಳು',
      'community-reports': 'ಸಮುದಾಯ ವರದಿಗಳು',
      'gis-export': 'GIS ಡೇಟಾ ರಫ್ತು',
      'admin-panel': 'ಆಡಳಿತ ಮಂಡಳಿ (Admin)',
      'settings': 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    },
    kpis: {
      housesMapped: 'ಒಟ್ಟು ಗುರುತಿಸಿದ ಮನೆಗಳು',
      streetsMapped: 'ಒಟ್ಟು ಗುರುತಿಸಿದ ರಸ್ತೆ/ಓಣಿಗಳು',
      drainagePoints: 'ಒಟ್ಟು ಚರಂಡಿ ಬಿಂದುಗಳು',
      floodHotspots: 'ಪ್ರವಾಹ ಅಪಾಯದ ಸ್ಥಳಗಳು',
      communityReports: 'ಒಟ್ಟು ಸಮುದಾಯ ವರದಿಗಳು',
      pendingVerification: 'ಪರಿಶೀಲನೆಗೆ ಬಾಕಿ ಇದೆ',
    },
    risk: {
      LOW: 'ಕಡಿಮೆ ಅಪಾಯ (Low)',
      MEDIUM: 'ಮಧ್ಯಮ ಅಪಾಯ (Medium)',
      HIGH: 'ಹೆಚ್ಚಿನ ಅಪಾಯ (High)',
      CRITICAL: 'ತೀವ್ರ ಅಪಾಯ (Critical)',
    },
    status: {
      Pending: 'ಬಾಕಿ ಇದೆ',
      Reviewed: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
      Verified: 'ದೃಢೀಕರಿಸಲಾಗಿದೆ',
      Rejected: 'ತಿರಸ್ಕರಿಸಲಾಗಿದೆ',
    },
    categories: {
      house: 'ಮನೆಗಳು',
      street: 'ಕಿರಿದಾದ ರಸ್ತೆಗಳು ಮತ್ತು ಓಣಿಗಳು',
      drain: 'ಚರಂಡಿ ವ್ಯವಸ್ಥೆ',
      blocked_drain: 'ಕಟ್ಟಿಕೊಂಡ ಚರಂಡಿಗಳು',
      waterlogging: 'ನೀರು ನಿಲ್ಲುವ ಸ್ಥಳಗಳು',
      flood_zone: 'ಪ್ರವಾಹ ಪೀಡಿತ ವಲಯಗಳು',
    },
    reportCategories: {
      'Waterlogging': 'ನೀರು ನಿಲ್ಲುವಿಕೆ',
      'Blocked Drain': 'ಕಟ್ಟಿಕೊಂಡ ಚರಂಡಿ',
      'Overflowing Drain': 'ಉಕ್ಕಿ ಹರಿಯುವ ರಾಜಕಾಲುವೆ/ಚರಂಡಿ',
      'Flooded House': 'ಮನೆಗೆ ನೀರು ನುಗ್ಗಿದೆ',
      'Road Flooding': 'ರಸ್ತೆ ಜಲಾವೃತ',
    },
    common: {
      reportFloodIssue: 'ಪ್ರವಾಹ ವರದಿ ಸಲ್ಲಿಸಿ',
      startMapping: 'ನಕ್ಷೆ ರಚಿಸಿ',
      onlineLocalSaved: 'ಆನ್‌ಲೈನ್ · ಸ್ಥಳೀಯ ಸಂಗ್ರಹ ಸಕ್ರಿಯ',
      offlineMode: 'ಆಫ್‌ಲೈನ್ ಮೋಡ್ · ಸ್ಥಳೀಯವಾಗಿ ಉಳಿಸಲಾಗುತ್ತಿದೆ',
      pendingSync: 'ಸಿಂಕ್ ಬಾಕಿ ಇದೆ',
      syncNow: 'ಸಿಂಕ್ ಮಾಡಿ',
      basemapOsm: 'ಓಪನ್‌ಸ್ಟ್ರೀಟ್ ನಕ್ಷೆ',
      basemapSatellite: 'ಉಪಗ್ರಹ ಚಿತ್ರಣ',
      locateMe: 'ನನ್ನ ಸ್ಥಳ (GPS)',
      filterRisk: 'ಅಪಾಯದ ಮಟ್ಟ',
      filterCategory: 'ವರ್ಗ ಫಿಲ್ಟರ್',
      all: 'ಎಲ್ಲಾ',
      save: 'ಉಳಿಸಿ (Save)',
      cancel: 'ರದ್ದುಮಾಡಿ',
      delete: 'ಅಳಿಸಿ',
      edit: 'ತಿದ್ದುಪಡಿ',
      viewOnMap: 'ನಕ್ಷೆಯಲ್ಲಿ ನೋಡಿ',
      latitude: 'ಅಕ್ಷಾಂಶ (Latitude)',
      longitude: 'ರೇಖಾಂಶ (Longitude)',
      description: 'ವಿವರಣೆ / ಸ್ಥಳೀಯ ಮಾಹಿತಿ',
      uploadPhoto: 'ಫೋಟೋ ಸೇರಿಸಿ',
      submitReport: 'ವರದಿ ಸಲ್ಲಿಸಿ',
      findNearestShelter: 'ಸುರಕ್ಷಿತ ಮಾರ್ಗ ತೋರಿಸಿ',
      downloadGeoJSON: 'GeoJSON ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
      downloadCSV: 'CSV ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
      approveVerify: 'ದೃಢೀಕರಿಸಿ (Verify)',
      markReviewed: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿ',
      reject: 'ತಿರಸ್ಕರಿಸಿ',
      autoSnap: 'ರಸ್ತೆಗೆ ಸ್ವಯಂ ಜೋಡಿಸಿ',
      undoVertex: 'ಹಿಂದಕ್ಕೆ',
      finishShape: 'ಆಕಾರ ಪೂರ್ಣಗೊಳಿಸಿ',
      clearDraft: 'ತೆರವುಗೊಳಿಸಿ',
      demoRouteNotice: 'ಡೆಮೊ / ಪರಿಶೀಲಿಸದ ಮಾರ್ಗ — ಜಲಾವೃತ ರಸ್ತೆಗಳನ್ನು ತಪ್ಪಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಸ್ಥಳೀಯ ಪರಿಸ್ಥಿತಿ ಗಮನಿಸಿ.',
      scientificDisclaimer: 'ಸಮುದಾಯ ವೀಕ್ಷಣಾ ಪದರ: ಈ ಮಾಹಿತಿಯು ಸ್ಥಳೀಯ ನಿವಾಸಿಗಳ ಅನುಭವವನ್ನು ಆಧರಿಸಿದೆ; ಇದು ಸರ್ಕಾರಿ ವೈಜ್ಞಾನಿಕ ಮುನ್ಸೂಚನೆಯಲ್ಲ.',
    },
  },
  hi: {
    appName: 'फ़्लडलेन मैपर',
    tagline: 'हर गली का नक्शा। हर जीवन की सुरक्षा।',
    wardSubtitle: 'वार्ड 148 · एजीपुरा–कोरमंगला निचली बस्ती (बेंगलुरु)',
    demoDisclaimer: 'डेमो डेटा — समुदाय द्वारा साझा — असत्यापित (UNVERIFIED)',
    nav: {
      'dashboard': 'डैशबोर्ड',
      'live-map': 'लाइव बाढ़ मानचित्र',
      'community-mapping': 'सामुदायिक मैपिंग',
      'report-issue': 'बाढ़ समस्या रिपोर्ट करें',
      'risk-analysis': 'बाढ़ जोखिम विश्लेषण',
      'safe-shelters': 'सुरक्षित आश्रय स्थल',
      'community-reports': 'सामुदायिक रिपोर्ट्स',
      'gis-export': 'GIS डेटा एक्सपोर्ट',
      'admin-panel': 'एडमिन पैनल',
      'settings': 'सेटिंग्स',
    },
    kpis: {
      housesMapped: 'कुल चिन्हित घर',
      streetsMapped: 'कुल चिन्हित गलियाँ',
      drainagePoints: 'कुल नाली बिंदु',
      floodHotspots: 'बाढ़ हॉटस्पॉट',
      communityReports: 'कुल सामुदायिक रिपोर्ट',
      pendingVerification: 'सत्यापन लंबित',
    },
    risk: {
      LOW: 'कम जोखिम (Low)',
      MEDIUM: 'मध्यम जोखिम (Medium)',
      HIGH: 'उच्च जोखिम (High)',
      CRITICAL: 'अति गंभीर (Critical)',
    },
    status: {
      Pending: 'लंबित',
      Reviewed: 'समीक्षित',
      Verified: 'सत्यापित',
      Rejected: 'अस्वीकृत',
    },
    categories: {
      house: 'घर (Houses)',
      street: 'संकरी गलियाँ और सड़कें',
      drain: 'जल निकासी / नालियाँ',
      blocked_drain: 'जाम नालियाँ',
      waterlogging: 'जलभराव स्थान',
      flood_zone: 'बाढ़ संभावित क्षेत्र',
    },
    reportCategories: {
      'Waterlogging': 'जलभराव (Waterlogging)',
      'Blocked Drain': 'जाम नाली (Blocked Drain)',
      'Overflowing Drain': 'उफनता नाला (Overflowing Drain)',
      'Flooded House': 'घर में पानी घुसना',
      'Road Flooding': 'सड़क पर बाढ़',
    },
    common: {
      reportFloodIssue: 'बाढ़ समस्या दर्ज करें',
      startMapping: 'मैपिंग शुरू करें',
      onlineLocalSaved: 'ऑनलाइन · लोकल स्टोरेज सक्रिय',
      offlineMode: 'ऑफ़लाइन मोड · डेटा लोकल सेव हो रहा है',
      pendingSync: 'सिंक कतार में',
      syncNow: 'कतार सिंक करें',
      basemapOsm: 'ओपनस्ट्रीटमैप',
      basemapSatellite: 'सैटेलाइट दृश्य',
      locateMe: 'मेरी GPS लोकेशन',
      filterRisk: 'जोखिम स्तर',
      filterCategory: 'श्रेणी फ़िल्टर',
      all: 'सभी',
      save: 'फ़ीचर सेव करें',
      cancel: 'रद्द करें',
      delete: 'हटाएँ',
      edit: 'संपादित करें',
      viewOnMap: 'नक्शे पर देखें',
      latitude: 'अक्षांश (Latitude)',
      longitude: 'देशांतर (Longitude)',
      description: 'विवरण / स्थानीय टिप्पणी',
      uploadPhoto: 'फ़ोटो अपलोड करें',
      submitReport: 'रिपोर्ट सबमिट करें',
      findNearestShelter: 'सुरक्षित निकासी मार्ग खोजें',
      downloadGeoJSON: 'GeoJSON डाउनलोड करें',
      downloadCSV: 'CSV डाउनलोड करें',
      approveVerify: 'सत्यापित और स्वीकृत करें',
      markReviewed: 'समीक्षित चिन्हित करें',
      reject: 'अस्वीकृत करें',
      autoSnap: 'गली से ऑटो-स्नैप',
      undoVertex: 'पिछला बिंदु हटाएँ',
      finishShape: 'आकृति पूर्ण करें',
      clearDraft: 'साफ़ करें',
      demoRouteNotice: 'डेमो / असत्यापित मार्ग — जलभराव वाली गलियों से बचा गया है। कृपया ज़मीनी स्थिति की पुष्टि करें।',
      scientificDisclaimer: 'सामुदायिक अवलोकन परत: यह जोखिम डेटा निवासियों के मानसून अनुभवों पर आधारित है, सरकारी वैज्ञानिक रियल-टाइम पूर्वानुमान नहीं है।',
    },
  },
};

export const QUICK_ANNOTATIONS: Record<LanguageCode, string[]> = {
  en: [
    'This lane floods during heavy rain.',
    'Drain blocked by garbage and plastic silt.',
    'Water reaches knee level after 30 minutes of rain.',
    'Houses in this area flood first when main nala rises.',
    'Elderly residents live on ground floor; needs priority alert.',
  ],
  kn: [
    'ಭಾರೀ ಮಳೆಯಾದಾಗ ಈ ಓಣಿಯಲ್ಲಿ ನೀರು ತುಂಬುತ್ತದೆ.',
    'ಕಸ ಮತ್ತು ಹೂಳಿನಿಂದ ಚರಂಡಿ ಕಟ್ಟಿಕೊಂಡಿದೆ.',
    '30 ನಿಮಿಷಗಳ ಮಳೆಗೆ ನೀರು ಮೊಣಕಾಲು ಮಟ್ಟ ತಲುಪುತ್ತದೆ.',
    'ರಾಜಕಾಲುವೆ ತುಂಬಿದಾಗ ಈ ಭಾಗದ ಮನೆಗಳಿಗೆ ಮೊದಲು ನೀರು ನುಗ್ಗುತ್ತದೆ.',
    'ನೆಲಮಹಡಿಯಲ್ಲಿ ಹಿರಿಯ ನಾಗರಿಕರಿದ್ದಾರೆ; ತುರ್ತು ಎಚ್ಚರಿಕೆ ಅಗತ್ಯ.',
  ],
  hi: [
    'तेज़ बारिश के दौरान इस गली में पानी भर जाता है।',
    'कचरे और गाद के कारण नाली जाम है।',
    '30 मिनट की बारिश में पानी घुटनों तक पहुँच जाता है।',
    'मुख्य नाला भरने पर इस हिस्से के घरों में सबसे पहले पानी घुसता है।',
    'भूतल पर बुजुर्ग निवासी रहते हैं; प्राथमिकता से सूचना आवश्यक।',
  ],
};
