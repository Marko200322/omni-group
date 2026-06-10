/** Legacy SMB verticals (25 × ~20) — zadržano za postojeće autonomy vertikale. */

export const LEGACY_SMB_SUBTYPES: Record<string, string[]> = {
  healthcare: [
    'dental', 'pharmacy', 'clinic', 'physiotherapy', 'veterinary', 'optometry', 'dermatology',
    'pediatrics', 'home-care', 'medical-lab', 'mental-health', 'chiropractic', 'radiology',
    'surgery-center', 'nursing', 'telemedicine', 'rehab', 'dietitian', 'midwife', 'hospice',
  ],
  legal: [
    'law-firm', 'notary', 'immigration', 'corporate-law', 'family-law', 'criminal-defense',
    'ip-law', 'real-estate-law', 'tax-law', 'mediation', 'paralegal', 'compliance-legal',
    'employment-law', 'bankruptcy', 'contract-review', 'legal-tech', 'court-filing', 'arbitration',
    'estate-planning', 'startup-legal',
  ],
  retail: [
    'fashion', 'electronics', 'grocery', 'furniture', 'jewelry', 'sports-goods', 'bookstore',
    'pet-store', 'hardware', 'cosmetics', 'toys', 'automotive-parts', 'florist', 'gift-shop',
    'thrift', 'luxury', 'outlet', 'ecommerce', 'marketplace', 'pop-up',
  ],
  hospitality: [
    'hotel', 'restaurant', 'cafe', 'bar', 'catering', 'food-truck', 'bakery', 'fast-food',
    'fine-dining', 'hostel', 'resort', 'event-venue', 'nightclub', 'brewery', 'winery',
    'food-delivery', 'ghost-kitchen', 'banquet', 'bbq', 'vegan',
  ],
  construction: [
    'general-contractor', 'electrician', 'plumber', 'hvac', 'roofing', 'painting', 'landscaping',
    'architecture', 'interior-design', 'civil-engineering', 'demolition', 'flooring', 'windows',
    'solar-install', 'pool-builder', 'scaffolding', 'surveying', 'insulation', 'concrete', 'renovation',
  ],
  education: [
    'language-school', 'tutoring', 'university', 'vocational', 'online-course', 'music-school',
    'driving-school', 'preschool', 'coding-bootcamp', 'exam-prep', 'corporate-training',
    'special-ed', 'art-school', 'dance-studio', 'sports-academy', 'library', 'research-lab',
    'edtech', 'certification', 'mentorship',
  ],
  finance: [
    'accounting', 'bookkeeping', 'tax-advisory', 'insurance', 'mortgage', 'investment', 'fintech',
    'payroll', 'audit', 'wealth-management', 'crypto-advisory', 'factoring', 'leasing',
    'credit-union', 'microfinance', 'financial-planning', 'collections', 'treasury', 'compliance-finance',
    'payment-processing',
  ],
  logistics: [
    'freight', 'courier', 'warehouse', 'last-mile', 'customs-broker', 'fleet-management',
    'cold-chain', 'moving-company', '3pl', 'port-services', 'rail-logistics', 'air-cargo',
    'packaging', 'inventory', 'supply-chain', 'dispatch', 'trucking', 'maritime', 'fulfillment',
    'reverse-logistics',
  ],
  beauty: [
    'salon', 'barbershop', 'spa', 'nail-studio', 'makeup', 'tattoo', 'cosmetology', 'wellness',
    'massage', 'skincare', 'hair-extensions', 'laser-clinic', 'med-spa', 'tanning', 'brow-lash',
    'perfume', 'organic-beauty', 'mobile-beauty', 'bridal-beauty', 'barber-academy',
  ],
  fitness: [
    'gym', 'yoga', 'pilates', 'crossfit', 'martial-arts', 'personal-trainer', 'swim-school',
    'dance-fitness', 'climbing', 'cycling-studio', 'sports-club', 'nutrition-coach', 'rehab-fitness',
    'corporate-wellness', 'outdoor-adventure', 'tennis', 'golf', 'boxing', 'running-club', 'kids-sports',
  ],
  agriculture: [
    'farm', 'vineyard', 'greenhouse', 'livestock', 'organic-farm', 'aquaculture', 'forestry',
    'seed-supplier', 'fertilizer', 'farm-equipment', 'crop-consulting', 'dairy', 'apiary',
    'hydroponics', 'agritech', 'cooperative', 'farm-to-table', 'irrigation', 'soil-testing', 'agri-insurance',
  ],
  automotive: [
    'dealership', 'auto-repair', 'body-shop', 'tire-shop', 'car-wash', 'detailing', 'towing',
    'rental', 'parts-supplier', 'ev-charging', 'fleet-service', 'motorcycle', 'truck-service',
    'inspection', 'customs-auto', 'driving-instructor', 'car-sharing', 'auto-finance', 'recycling-auto',
    'classic-cars',
  ],
  'real-estate': [
    'agency', 'property-management', 'development', 'commercial-re', 'vacation-rental', 'appraisal',
    'brokerage', 'coworking', 'storage-units', 'hoa-management', 'staging', 'mortgage-broker-re',
    'land-sales', 'industrial-re', 'reit', 'property-tech', 'tenant-screening', 'facilities', 'cleaning-re',
    'smart-building',
  ],
  manufacturing: [
    'metal-fab', 'plastic-molding', 'textile', 'food-processing', 'electronics-mfg', 'packaging-mfg',
    'chemical', 'pharma-mfg', 'automotive-mfg', 'aerospace', '3d-printing', 'cnc-machining',
    'assembly', 'quality-control', 'tooling', 'industrial-design', 'prototyping', 'recycling-mfg',
    'furniture-mfg', 'custom-manufacturing',
  ],
  technology: [
    'saas', 'msp', 'cybersecurity', 'cloud-consulting', 'dev-agency', 'data-analytics', 'ai-consulting',
    'iot', 'blockchain', 'game-dev', 'mobile-apps', 'web-agency', 'qa-services', 'it-support',
    'networking', 'erp-implementation', 'crm-implementation', 'hosting', 'devops', 'tech-training',
  ],
  media: [
    'production', 'photography', 'video-agency', 'podcast', 'publishing', 'influencer', 'pr-agency',
    'advertising', 'graphic-design', 'animation', 'streaming', 'news', 'music-production', 'event-media',
    'social-media', 'content-marketing', 'translation', 'voice-over', 'stock-media', 'creative-studio',
  ],
  nonprofit: [
    'charity', 'foundation', 'ngo', 'religious-org', 'community-center', 'advocacy', 'humanitarian',
    'environmental', 'animal-rescue', 'youth-program', 'senior-care-npo', 'arts-npo', 'education-npo',
    'health-npo', 'disaster-relief', 'micro-grant', 'volunteer-network', 'cultural-heritage', 'sports-npo',
    'research-npo',
  ],
  government: [
    'municipal', 'public-health', 'licensing', 'procurement', 'citizen-services', 'transport-authority',
    'utilities-public', 'education-public', 'social-services', 'tax-office', 'customs', 'immigration-gov',
    'defense-contractor', 'smart-city', 'public-safety', 'environment-agency', 'housing-authority',
    'workforce-agency', 'tourism-board', 'digital-gov',
  ],
  energy: [
    'solar', 'wind', 'oil-gas', 'utilities', 'energy-audit', 'battery-storage', 'ev-infrastructure',
    'grid-services', 'carbon-credits', 'energy-trading', 'nuclear-services', 'hydro', 'biomass',
    'geothermal', 'energy-consulting', 'smart-meter', 'microgrid', 'fuel-supply', 'pipeline', 'energy-insurance',
  ],
  travel: [
    'travel-agency', 'tour-operator', 'airline-services', 'cruise', 'adventure-travel', 'business-travel',
    'visa-services', 'travel-insurance', 'destination-mgmt', 'eco-tourism', 'luxury-travel', 'group-travel',
    'travel-tech', 'concierge', 'airport-services', 'rail-travel', 'car-rental-travel', 'host-agency',
    'travel-content', 'medical-tourism',
  ],
  professional: [
    'consulting', 'coaching', 'recruitment', 'hr-services', 'marketing-agency', 'seo-agency', 'research-firm',
    'translation-pro', 'virtual-assistant-pro', 'project-management', 'business-broker', 'franchise',
    'coworking-pro', 'event-planning', 'security-services', 'cleaning-services', 'facility-mgmt', 'call-center',
    'data-entry', 'executive-search',
  ],
  entertainment: [
    'gaming-studio', 'casino', 'theme-park', 'cinema', 'live-events', 'ticketing', 'esports', 'arcade',
    'escape-room', 'comedy-club', 'sports-venue', 'museum', 'zoo', 'amusement', 'talent-agency', 'casting',
    'streaming-ent', 'vr-experience', 'board-games', 'nightlife-ent',
  ],
  home_services: [
    'cleaning-home', 'pest-control', 'locksmith', 'handyman', 'moving-home', 'junk-removal', 'pool-service',
    'lawn-care', 'home-security', 'smart-home', 'appliance-repair', 'chimney', 'gutter', 'pressure-washing',
    'organizing', 'home-staging', 'inspection-home', 'warranty', 'home-automation', 'decluttering',
  ],
  pets: [
    'pet-grooming', 'pet-boarding', 'pet-training', 'pet-daycare', 'pet-supplies', 'pet-insurance',
    'pet-transport', 'pet-photography', 'pet-walking', 'exotic-pets', 'pet-breeding', 'pet-rescue',
    'aquarium-services', 'pet-tech', 'pet-nutrition', 'mobile-vet', 'pet-events', 'pet-funeral', 'pet-rental',
    'pet-sitting',
  ],
  industrial: [
    'mining', 'oilfield-services', 'industrial-cleaning', 'heavy-machinery', 'industrial-safety',
    'waste-management', 'recycling-industrial', 'water-treatment', 'environmental-services', 'inspection-industrial',
    'maintenance-industrial', 'automation-industrial', 'robotics', 'industrial-iot', 'plant-management',
    'supply-industrial', 'logistics-industrial', 'energy-industrial', 'construction-industrial', 'consulting-industrial',
  ],
};

export const LEGACY_SMB_CATEGORY_SLUGS = Object.keys(LEGACY_SMB_SUBTYPES);
