/** Freelance platform taxonomy — Upwork/Fiverr-style (vlasnik lista 2026). */

import type { PricingTier } from '../../billing/lib/category-pricing';

export type FreelanceCategoryMeta = {
  slug: string;
  name: string;
  nameSr: string;
  tier: PricingTier;
};

export const FREELANCE_PLATFORM_CATEGORY_META: FreelanceCategoryMeta[] = [
  { slug: 'admin_support', name: 'Admin Support', nameSr: 'Admin podrška', tier: 'budget' },
  { slug: 'ai_data', name: 'AI & Data', nameSr: 'AI & Data', tier: 'premium' },
  { slug: 'audio_music', name: 'Audio & Music', nameSr: 'Audio & muzika', tier: 'standard' },
  { slug: 'business_consulting', name: 'Business & Consulting', nameSr: 'Biznis konsalting', tier: 'premium' },
  { slug: 'community_moderation', name: 'Community & Moderation', nameSr: 'Community & moderacija', tier: 'budget' },
  { slug: 'creator_services', name: 'Creator Services', nameSr: 'Creator usluge', tier: 'standard' },
  { slug: 'customer_service', name: 'Customer Service', nameSr: 'Korisnička podrška', tier: 'budget' },
  { slug: 'design_creative', name: 'Design & Creative', nameSr: 'Dizajn & kreativa', tier: 'standard' },
  { slug: 'development_it', name: 'Development & IT', nameSr: 'Development & IT', tier: 'premium' },
  { slug: 'ecommerce', name: 'E-commerce', nameSr: 'E-commerce', tier: 'standard' },
  { slug: 'education_training', name: 'Education & Training', nameSr: 'Obrazovanje & trening', tier: 'standard' },
  { slug: 'engineering_architecture', name: 'Engineering & Architecture', nameSr: 'Inženjering & arhitektura', tier: 'premium' },
  { slug: 'engineering_science', name: 'Engineering & Science', nameSr: 'Inženjering & nauka', tier: 'premium' },
  { slug: 'finance_accounting', name: 'Finance & Accounting', nameSr: 'Finansije & računovodstvo', tier: 'premium' },
  { slug: 'hr_recruiting', name: 'HR & Recruiting', nameSr: 'HR & regrutacija', tier: 'standard' },
  { slug: 'legal_services', name: 'Legal Services', nameSr: 'Pravne usluge', tier: 'premium' },
  { slug: 'localization', name: 'Localization', nameSr: 'Lokalizacija', tier: 'standard' },
  { slug: 'marketing', name: 'Marketing', nameSr: 'Marketing', tier: 'standard' },
  { slug: 'photography', name: 'Photography', nameSr: 'Fotografija', tier: 'budget' },
  { slug: 'product_project_management', name: 'Product & Project Management', nameSr: 'Proizvod & projekti', tier: 'premium' },
  { slug: 'real_estate_services', name: 'Real Estate Services', nameSr: 'Nekretnine usluge', tier: 'premium' },
  { slug: 'sales', name: 'Sales', nameSr: 'Prodaja', tier: 'standard' },
  { slug: 'video_animation', name: 'Video & Animation', nameSr: 'Video & animacija', tier: 'standard' },
  { slug: 'web3', name: 'Web3', nameSr: 'Web3', tier: 'premium' },
  { slug: 'writing_translation', name: 'Writing & Translation', nameSr: 'Pisanje & prevod', tier: 'budget' },
];

export const FREELANCE_PLATFORM_SUBTYPES: Record<string, string[]> = {
  admin_support: ['virtual-assistant', 'executive-assistant', 'personal-assistant', 'data-entry', 'data-collection', 'web-research', 'market-research', 'email-management', 'calendar-management', 'travel-management', 'travel-planning', 'project-coordination', 'document-management', 'spreadsheet-management', 'crm-data-management', 'order-processing', 'administrative-support', 'personal-assistance'],
  ai_data: ['artificial-intelligence', 'machine-learning', 'deep-learning', 'natural-language-processing', 'computer-vision', 'generative-ai', 'llm-development', 'ai-agent-development', 'prompt-engineering', 'ai-automation', 'ai-integration', 'chatbot-development', 'data-analysis', 'data-science', 'data-engineering', 'data-mining', 'data-visualization', 'business-intelligence', 'statistical-analysis', 'predictive-analytics', 'big-data', 'ai-content-creation', 'rag-systems', 'fine-tuning-models'],
  audio_music: ['voice-over', 'narration', 'audio-editing', 'audio-cleanup', 'audio-mixing', 'audio-mastering', 'podcast-editing', 'podcast-production', 'music-production', 'beat-production', 'songwriting', 'sound-design', 'jingle-production', 'audiobook-production', 'music-licensing', 'beat-making', 'jingle-creation'],
  business_consulting: ['business-consulting', 'startup-consulting', 'strategy-consulting', 'operations-consulting', 'process-optimization', 'business-planning', 'business-analysis', 'business-coaching', 'change-management', 'digital-transformation', 'market-research', 'competitive-analysis', 'feasibility-studies', 'management-consulting', 'process-improvement'],
  community_moderation: ['community-management', 'discord-management', 'telegram-management', 'forum-moderation'],
  creator_services: ['youtube-management', 'tiktok-management', 'podcast-production', 'newsletter-management'],
  customer_service: ['customer-support', 'customer-success', 'technical-support', 'help-desk-support', 'live-chat-support', 'email-support', 'phone-support', 'ticket-support', 'community-support', 'complaint-handling', 'customer-onboarding', 'customer-retention'],
  design_creative: ['graphic-design', 'logo-design', 'brand-identity', 'brand-guidelines', 'visual-identity', 'web-design', 'mobile-app-design', 'ui-design', 'ux-design', 'ux-research', 'wireframing', 'prototyping', 'illustration', 'digital-art', 'character-design', 'nft-art', 'nft-design', 'packaging-design', 'label-design', 'print-design', 'brochure-design', 'flyer-design', 'poster-design', 'presentation-design', 'infographic-design', 'social-media-design', 'banner-design', 'motion-graphics', '2d-animation', '3d-animation', '3d-modeling', '3d-rendering', 'product-visualization', 'creative-direction'],
  development_it: ['web-development', 'frontend-development', 'backend-development', 'full-stack-development', 'website-maintenance', 'wordpress-development', 'shopify-development', 'woocommerce-development', 'magento-development', 'drupal-development', 'laravel-development', 'react-development', 'vue-js-development', 'angular-development', 'node-js-development', 'php-development', 'python-development', 'java-development', 'c-development', 'net-development', 'ruby-on-rails-development', 'api-development', 'database-development', 'software-development', 'desktop-applications', 'mobile-app-development', 'ios-development', 'android-development', 'cross-platform-development', 'game-development', 'qa-testing', 'automation-testing', 'devops', 'cloud-engineering', 'cloud-computing', 'system-administration', 'network-administration', 'cybersecurity', 'penetration-testing', 'infrastructure-engineering', 'blockchain-development', 'web3-development', 'no-code-development', 'low-code-development', 'ai-development', 'kubernetes', 'docker', 'aws', 'azure', 'google-cloud', 'ci-cd'],
  ecommerce: ['shopify-store-setup', 'woocommerce-store-setup', 'magento-store-setup', 'amazon-fba', 'amazon-store-management', 'amazon-ppc', 'etsy-store-management', 'walmart-marketplace', 'ebay-store-management', 'tiktok-shop', 'product-research', 'product-sourcing', 'product-listing', 'product-listings', 'inventory-management', 'order-fulfillment', 'store-management', 'dropshipping', 'conversion-optimization', 'marketplace-management', 'e-commerce-consulting'],
  education_training: ['online-tutoring', 'academic-tutoring', 'language-tutoring', 'language-teaching', 'stem-tutoring', 'test-preparation', 'course-creation', 'instructional-design', 'curriculum-development', 'corporate-training', 'employee-training', 'coaching', 'business-coaching', 'career-coaching', 'life-coaching', 'mentoring'],
  engineering_architecture: ['architecture', 'interior-design', 'landscape-design', 'urban-planning', 'cad-drafting', 'autocad-design', 'revit-design', 'bim-modeling', 'civil-engineering', 'structural-engineering', 'mechanical-engineering', 'electrical-engineering', 'hvac-design', 'product-design', 'industrial-design', 'manufacturing-design', 'engineering-consulting'],
  engineering_science: ['scientific-research', 'mathematics', 'statistics', 'physics', 'chemistry', 'biotechnology'],
  finance_accounting: ['accounting', 'bookkeeping', 'financial-reporting', 'financial-analysis', 'financial-modeling', 'budgeting', 'forecasting', 'payroll', 'tax-preparation', 'tax-consulting', 'auditing', 'accounts-payable', 'accounts-receivable', 'investment-analysis', 'cfo-services', 'finance-consulting', 'financial-planning'],
  hr_recruiting: ['recruitment', 'talent-acquisition', 'candidate-sourcing', 'linkedin-recruiting', 'executive-search', 'technical-recruiting', 'interview-coordination', 'resume-screening', 'hr-administration', 'hr-consulting', 'employee-onboarding', 'performance-management', 'compensation-analysis', 'workforce-planning', 'talent-sourcing', 'interviewing'],
  legal_services: ['legal-consulting', 'legal-research', 'contract-drafting', 'contract-review', 'corporate-law', 'business-law', 'employment-law', 'intellectual-property', 'trademark-services', 'copyright-services', 'patent-support', 'compliance', 'gdpr-compliance', 'privacy-policies', 'terms-conditions', 'privacy-gdpr'],
  localization: ['multilingual-seo', 'website-localization', 'app-localization', 'game-localization'],
  marketing: ['digital-marketing', 'marketing-strategy', 'growth-marketing', 'performance-marketing', 'seo', 'technical-seo', 'local-seo', 'link-building', 'keyword-research', 'ppc-advertising', 'google-ads', 'youtube-ads', 'meta-ads', 'instagram-ads', 'facebook-ads', 'tiktok-ads', 'linkedin-ads', 'x-ads', 'content-marketing', 'email-marketing', 'sms-marketing', 'affiliate-marketing', 'influencer-marketing', 'brand-marketing', 'product-marketing', 'public-relations', 'market-research', 'competitor-analysis', 'marketing-analytics', 'conversion-rate-optimization'],
  photography: ['photo-editing', 'retouching', 'beauty-retouching', 'product-photo-editing', 'real-estate-photo-editing', 'background-removal', 'color-correction', 'image-restoration', 'photo-manipulation', 'ai-image-enhancement', 'wedding-photo-editing', 'fashion-photo-editing', 'commercial-photo-editing', 'product-photography-editing'],
  product_project_management: ['product-management', 'agile-coaching', 'scrum-master', 'project-management', 'program-management'],
  real_estate_services: ['real-estate-va', 'property-research', 'real-estate-lead-generation', 'real-estate-crm-management'],
  sales: ['lead-generation', 'prospecting', 'cold-calling', 'cold-email-outreach', 'appointment-setting', 'sales-development', 'business-development', 'crm-setup', 'crm-management', 'pipeline-management', 'sales-operations', 'sales-consulting', 'customer-acquisition', 'account-management'],
  video_animation: ['video-editing', 'short-form-video-editing', 'youtube-video-editing', 'tiktok-video-editing', 'instagram-reel-editing', 'motion-graphics', 'explainer-videos', 'whiteboard-animation', '2d-animation', '3d-animation', 'character-animation', 'visual-effects', 'vfx-compositing', 'color-grading', 'video-production', 'video-marketing', 'storyboarding', 'short-form-videos'],
  web3: ['smart-contracts', 'defi', 'nft-development', 'crypto-consulting'],
  writing_translation: ['content-writing', 'blog-writing', 'article-writing', 'seo-writing', 'copywriting', 'sales-copywriting', 'email-copywriting', 'technical-writing', 'business-writing', 'ghostwriting', 'book-writing', 'ebook-writing', 'script-writing', 'screenwriting', 'resume-writing', 'cover-letter-writing', 'proofreading', 'editing', 'copy-editing', 'translation', 'localization', 'transcription', 'captioning', 'subtitling', 'grant-writing'],
};

export const FREELANCE_PLATFORM_CATEGORY_COUNT = FREELANCE_PLATFORM_CATEGORY_META.length;
export const FREELANCE_PLATFORM_SUBTYPE_COUNT = Object.values(FREELANCE_PLATFORM_SUBTYPES).reduce((n, a) => n + a.length, 0);
