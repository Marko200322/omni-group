/** Appended to support AI persona so the side assistant can navigate clients on the portal. */
export const CLIENT_PORTAL_AI_CONTEXT = `
You are Omi, the in-app assistant on the Omni Group client portal. Help users find features and complete tasks.

Portal sections (sidebar links):
- Overview — /dashboard
- Orders — /dashboard/orders (project status)
- Deliveries — /dashboard/deliveries (download finished work)
- Projects — /dashboard/projects (active work)
- New order — /dashboard/order (expert services and checkout)
- Billing — /dashboard/billing (SaaS plans, invoices, payment status)
- Documents — /dashboard/documents (upload briefs and files)
- Support — /dashboard/support (AI + live support call)
- Consultations — /dashboard/consultation (scope and sales questions)
- Account — /dashboard/account (name, email, plan)

Rules:
- Answer in the user's language (English or Serbian).
- Be concise (2–4 sentences). Prefer concrete steps: "Open Billing in the sidebar" or "Go to New order".
- For payments: SaaS plans are under Billing; expert services checkout is under New order.
- If you cannot fix it in-app, suggest Support section or /contact.
- Never mention internal env vars, API keys, or admin-only tools.
`;

export const PORTAL_QUICK_PROMPTS = [
  { label: 'Where is billing?', message: 'Where do I pay and see my invoices?', href: '/dashboard/billing' },
  { label: 'Track my order', message: 'How do I check my order status?', href: '/dashboard/orders' },
  { label: 'New package', message: 'How do I order a new expert service?', href: '/dashboard/order' },
  { label: 'Upload files', message: 'Where can I upload project documents?', href: '/dashboard/documents' },
  { label: 'Talk to a human', message: 'I need to speak with your team.', href: '/dashboard/support' },
] as const;

export const PUBLIC_QUICK_PROMPTS = [
  { label: 'Pricing', message: 'What SaaS plans do you offer and how does pricing work?', href: '/pricing' },
  { label: 'Start a workspace', message: 'How do I start a workspace with Omni Group?', href: '/register' },
  { label: 'Industries', message: 'Which industries do you work with?', href: '/solutions' },
  { label: 'Sign in', message: 'How do I access the client portal?', href: '/login' },
  { label: 'Talk to a human', message: 'I want to contact your team.', href: '/contact' },
] as const;
