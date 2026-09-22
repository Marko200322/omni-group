# Single source for prod fulfillment matrix package IDs (keep in sync with deliverable-catalog.ts).
$script:FulfillmentCatalogPackages = @(
  'setup-quick', 'setup-full', 'setup-custom', 'audit', 'integration', 'workflow-design',
  'support-priority', 'support-dedicated', 'landing', 'website-business', 'website-ecommerce',
  'white-label-setup', 'sales-enablement', 'vertical-package', 'lead-gen-retainer',
  'ai-support-retainer', 'custom-software',
  'bundle-portal-presence', 'bundle-sales-launch', 'bundle-ops-clarity'
)
$script:FulfillmentSlowPackageIds = @(
  'website-business', 'website-ecommerce', 'white-label-setup', 'custom-software', 'setup-custom',
  'bundle-sales-launch', 'bundle-portal-presence'
)
$script:FulfillmentCatalogPackageCount = $script:FulfillmentCatalogPackages.Count
