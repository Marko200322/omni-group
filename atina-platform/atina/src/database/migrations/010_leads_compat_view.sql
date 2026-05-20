-- Kompatibilnost sa Master Spec imenom tabele `leads` (izvor: crm_contacts sa statusom lead/prospect).
CREATE OR REPLACE VIEW leads AS
SELECT
  id,
  user_id,
  email,
  phone,
  status,
  company,
  first_name,
  last_name,
  source,
  created_at,
  updated_at
FROM crm_contacts
WHERE status IN ('lead', 'prospect');

COMMENT ON VIEW leads IS 'Master Spec alias; podaci u crm_contacts.';
