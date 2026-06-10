#!/usr/bin/env python3
"""Generate freelance-platform-taxonomy.ts from Marko's category lists."""
import re
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "src/modules/autonomy-loop/data/freelance-platform-taxonomy.ts"


def slug(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return re.sub(r"-+", "-", s)


categories: dict[str, list[str]] = {}


def add_phrases(cat: str, phrases: list[str]) -> None:
    categories.setdefault(cat, [])
    seen = set(categories[cat])
    for phrase in phrases:
        s = slug(phrase)
        if s and s not in seen:
            categories[cat].append(s)
            seen.add(s)


add_phrases("development_it", [
    "Web Development", "Frontend Development", "Backend Development", "Full Stack Development",
    "Website Maintenance", "WordPress Development", "Shopify Development", "WooCommerce Development",
    "Magento Development", "Drupal Development", "Laravel Development", "React Development",
    "Vue.js Development", "Angular Development", "Node.js Development", "PHP Development",
    "Python Development", "Java Development", "C# Development", ".NET Development",
    "Ruby on Rails Development", "API Development", "Database Development", "Software Development",
    "Desktop Applications", "Mobile App Development", "iOS Development", "Android Development",
    "Cross Platform Development", "Game Development", "QA Testing", "Automation Testing", "DevOps",
    "Cloud Engineering", "Cloud Computing", "System Administration", "Network Administration",
    "Cybersecurity", "Penetration Testing", "Infrastructure Engineering", "Blockchain Development",
    "Web3 Development", "No-Code Development", "Low-Code Development", "AI Development",
    "Kubernetes", "Docker", "AWS", "Azure", "Google Cloud", "CI/CD",
])
add_phrases("ai_data", [
    "Artificial Intelligence", "Machine Learning", "Deep Learning", "Natural Language Processing",
    "Computer Vision", "Generative AI", "LLM Development", "AI Agent Development", "Prompt Engineering",
    "AI Automation", "AI Integration", "Chatbot Development", "Data Analysis", "Data Science",
    "Data Engineering", "Data Mining", "Data Visualization", "Business Intelligence",
    "Statistical Analysis", "Predictive Analytics", "Big Data", "AI Content Creation",
    "RAG Systems", "Fine-tuning Models",
])
add_phrases("design_creative", [
    "Graphic Design", "Logo Design", "Brand Identity", "Brand Guidelines", "Visual Identity",
    "Web Design", "Mobile App Design", "UI Design", "UX Design", "UX Research", "Wireframing",
    "Prototyping", "Illustration", "Digital Art", "Character Design", "NFT Art", "NFT Design",
    "Packaging Design", "Label Design", "Print Design", "Brochure Design", "Flyer Design",
    "Poster Design", "Presentation Design", "Infographic Design", "Social Media Design",
    "Banner Design", "Motion Graphics", "2D Animation", "3D Animation", "3D Modeling",
    "3D Rendering", "Product Visualization", "Creative Direction",
])
add_phrases("writing_translation", [
    "Content Writing", "Blog Writing", "Article Writing", "SEO Writing", "Copywriting",
    "Sales Copywriting", "Email Copywriting", "Technical Writing", "Business Writing", "Ghostwriting",
    "Book Writing", "eBook Writing", "Script Writing", "Screenwriting", "Resume Writing",
    "Cover Letter Writing", "Proofreading", "Editing", "Copy Editing", "Translation", "Localization",
    "Transcription", "Captioning", "Subtitling", "Grant Writing",
])
add_phrases("marketing", [
    "Digital Marketing", "Marketing Strategy", "Growth Marketing", "Performance Marketing", "SEO",
    "Technical SEO", "Local SEO", "Link Building", "Keyword Research", "PPC Advertising", "Google Ads",
    "YouTube Ads", "Meta Ads", "Instagram Ads", "Facebook Ads", "TikTok Ads", "LinkedIn Ads", "X Ads",
    "Content Marketing", "Email Marketing", "SMS Marketing", "Affiliate Marketing",
    "Influencer Marketing", "Brand Marketing", "Product Marketing", "Public Relations",
    "Market Research", "Competitor Analysis", "Marketing Analytics", "Conversion Rate Optimization",
])
add_phrases("sales", [
    "Lead Generation", "Prospecting", "Cold Calling", "Cold Email Outreach", "Appointment Setting",
    "Sales Development", "Business Development", "CRM Setup", "CRM Management", "Pipeline Management",
    "Sales Operations", "Sales Consulting", "Customer Acquisition", "Account Management",
])
add_phrases("admin_support", [
    "Virtual Assistant", "Executive Assistant", "Personal Assistant", "Data Entry", "Data Collection",
    "Web Research", "Market Research", "Email Management", "Calendar Management", "Travel Management",
    "Travel Planning", "Project Coordination", "Document Management", "Spreadsheet Management",
    "CRM Data Management", "Order Processing", "Administrative Support", "Personal Assistance",
])
add_phrases("customer_service", [
    "Customer Support", "Customer Success", "Technical Support", "Help Desk Support", "Live Chat Support",
    "Email Support", "Phone Support", "Ticket Support", "Community Support", "Complaint Handling",
    "Customer Onboarding", "Customer Retention",
])
add_phrases("business_consulting", [
    "Business Consulting", "Startup Consulting", "Strategy Consulting", "Operations Consulting",
    "Process Optimization", "Business Planning", "Business Analysis", "Business Coaching",
    "Change Management", "Digital Transformation", "Market Research", "Competitive Analysis",
    "Feasibility Studies", "Management Consulting", "Process Improvement",
])
add_phrases("finance_accounting", [
    "Accounting", "Bookkeeping", "Financial Reporting", "Financial Analysis", "Financial Modeling",
    "Budgeting", "Forecasting", "Payroll", "Tax Preparation", "Tax Consulting", "Auditing",
    "Accounts Payable", "Accounts Receivable", "Investment Analysis", "CFO Services",
    "Finance Consulting", "Financial Planning",
])
add_phrases("legal_services", [
    "Legal Consulting", "Legal Research", "Contract Drafting", "Contract Review", "Corporate Law",
    "Business Law", "Employment Law", "Intellectual Property", "Trademark Services", "Copyright Services",
    "Patent Support", "Compliance", "GDPR Compliance", "Privacy Policies", "Terms & Conditions",
    "Privacy & GDPR",
])
add_phrases("ecommerce", [
    "Shopify Store Setup", "WooCommerce Store Setup", "Magento Store Setup", "Amazon FBA",
    "Amazon Store Management", "Amazon PPC", "Etsy Store Management", "Walmart Marketplace",
    "eBay Store Management", "TikTok Shop", "Product Research", "Product Sourcing", "Product Listing",
    "Product Listings", "Inventory Management", "Order Fulfillment", "Store Management", "Dropshipping",
    "Conversion Optimization", "Marketplace Management", "E-commerce Consulting",
])
add_phrases("engineering_architecture", [
    "Architecture", "Interior Design", "Landscape Design", "Urban Planning", "CAD Drafting",
    "AutoCAD Design", "Revit Design", "BIM Modeling", "Civil Engineering", "Structural Engineering",
    "Mechanical Engineering", "Electrical Engineering", "HVAC Design", "Product Design",
    "Industrial Design", "Manufacturing Design", "Engineering Consulting",
])
add_phrases("video_animation", [
    "Video Editing", "Short Form Video Editing", "YouTube Video Editing", "TikTok Video Editing",
    "Instagram Reel Editing", "Motion Graphics", "Explainer Videos", "Whiteboard Animation",
    "2D Animation", "3D Animation", "Character Animation", "Visual Effects", "VFX Compositing",
    "Color Grading", "Video Production", "Video Marketing", "Storyboarding", "Short Form Videos",
])
add_phrases("audio_music", [
    "Voice Over", "Narration", "Audio Editing", "Audio Cleanup", "Audio Mixing", "Audio Mastering",
    "Podcast Editing", "Podcast Production", "Music Production", "Beat Production", "Songwriting",
    "Sound Design", "Jingle Production", "Audiobook Production", "Music Licensing", "Beat Making",
    "Jingle Creation",
])
add_phrases("education_training", [
    "Online Tutoring", "Academic Tutoring", "Language Tutoring", "Language Teaching", "STEM Tutoring",
    "Test Preparation", "Course Creation", "Instructional Design", "Curriculum Development",
    "Corporate Training", "Employee Training", "Coaching", "Business Coaching", "Career Coaching",
    "Life Coaching", "Mentoring",
])
add_phrases("hr_recruiting", [
    "Recruitment", "Talent Acquisition", "Candidate Sourcing", "LinkedIn Recruiting", "Executive Search",
    "Technical Recruiting", "Interview Coordination", "Resume Screening", "HR Administration",
    "HR Consulting", "Employee Onboarding", "Performance Management", "Compensation Analysis",
    "Workforce Planning", "Talent Sourcing", "Interviewing",
])
add_phrases("photography", [
    "Photo Editing", "Retouching", "Beauty Retouching", "Product Photo Editing",
    "Real Estate Photo Editing", "Background Removal", "Color Correction", "Image Restoration",
    "Photo Manipulation", "AI Image Enhancement", "Wedding Photo Editing", "Fashion Photo Editing",
    "Commercial Photo Editing", "Product Photography Editing",
])
add_phrases("product_project_management", [
    "Product Management", "Agile Coaching", "Scrum Master", "Project Management", "Program Management",
])
add_phrases("engineering_science", [
    "Scientific Research", "Mathematics", "Statistics", "Physics", "Chemistry", "Biotechnology",
])
add_phrases("web3", ["Smart Contracts", "DeFi", "NFT Development", "Crypto Consulting"])
add_phrases("localization", [
    "Multilingual SEO", "Website Localization", "App Localization", "Game Localization",
])
add_phrases("community_moderation", [
    "Community Management", "Discord Management", "Telegram Management", "Forum Moderation",
])
add_phrases("creator_services", [
    "YouTube Management", "TikTok Management", "Podcast Production", "Newsletter Management",
])
add_phrases("real_estate_services", [
    "Real Estate VA", "Property Research", "Real Estate Lead Generation", "Real Estate CRM Management",
])

META = {
    "development_it": ("Development & IT", "Development & IT", "premium"),
    "ai_data": ("AI & Data", "AI & Data", "premium"),
    "design_creative": ("Design & Creative", "Dizajn & kreativa", "standard"),
    "writing_translation": ("Writing & Translation", "Pisanje & prevod", "budget"),
    "marketing": ("Marketing", "Marketing", "standard"),
    "sales": ("Sales", "Prodaja", "standard"),
    "admin_support": ("Admin Support", "Admin podrška", "budget"),
    "customer_service": ("Customer Service", "Korisnička podrška", "budget"),
    "business_consulting": ("Business & Consulting", "Biznis konsalting", "premium"),
    "finance_accounting": ("Finance & Accounting", "Finansije & računovodstvo", "premium"),
    "legal_services": ("Legal Services", "Pravne usluge", "premium"),
    "ecommerce": ("E-commerce", "E-commerce", "standard"),
    "engineering_architecture": ("Engineering & Architecture", "Inženjering & arhitektura", "premium"),
    "video_animation": ("Video & Animation", "Video & animacija", "standard"),
    "audio_music": ("Audio & Music", "Audio & muzika", "standard"),
    "education_training": ("Education & Training", "Obrazovanje & trening", "standard"),
    "hr_recruiting": ("HR & Recruiting", "HR & regrutacija", "standard"),
    "photography": ("Photography", "Fotografija", "budget"),
    "product_project_management": ("Product & Project Management", "Proizvod & projekti", "premium"),
    "engineering_science": ("Engineering & Science", "Inženjering & nauka", "premium"),
    "web3": ("Web3", "Web3", "premium"),
    "localization": ("Localization", "Lokalizacija", "standard"),
    "community_moderation": ("Community & Moderation", "Community & moderacija", "budget"),
    "creator_services": ("Creator Services", "Creator usluge", "standard"),
    "real_estate_services": ("Real Estate Services", "Nekretnine usluge", "premium"),
}

lines = [
    "/** Freelance platform taxonomy — Upwork/Fiverr-style (vlasnik lista 2026). */",
    "",
    "import type { PricingTier } from '../../billing/lib/category-pricing';",
    "",
    "export type FreelanceCategoryMeta = {",
    "  slug: string;",
    "  name: string;",
    "  nameSr: string;",
    "  tier: PricingTier;",
    "};",
    "",
    "export const FREELANCE_PLATFORM_CATEGORY_META: FreelanceCategoryMeta[] = [",
]
for k in sorted(categories.keys()):
    n, sr, t = META[k]
    lines.append(f"  {{ slug: '{k}', name: '{n}', nameSr: '{sr}', tier: '{t}' }},")
lines.append("];")
lines.append("")
lines.append("export const FREELANCE_PLATFORM_SUBTYPES: Record<string, string[]> = {")
for k in sorted(categories.keys()):
    items = ", ".join(f"'{x}'" for x in categories[k])
    lines.append(f"  {k}: [{items}],")
lines.append("};")
lines.append("")
lines.append(
    "export const FREELANCE_PLATFORM_CATEGORY_COUNT = FREELANCE_PLATFORM_CATEGORY_META.length;"
)
lines.append(
    "export const FREELANCE_PLATFORM_SUBTYPE_COUNT = Object.values(FREELANCE_PLATFORM_SUBTYPES)"
    ".reduce((n, a) => n + a.length, 0);"
)

OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
total = sum(len(v) for v in categories.values())
print(f"Wrote {OUT.name}: {len(categories)} categories, {total} subtypes")
