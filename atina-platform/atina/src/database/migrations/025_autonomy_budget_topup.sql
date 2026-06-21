BEGIN;

ALTER TABLE autonomy_budget_ledger
  DROP CONSTRAINT IF EXISTS autonomy_budget_ledger_entry_type_check;

ALTER TABLE autonomy_budget_ledger
  ADD CONSTRAINT autonomy_budget_ledger_entry_type_check
  CHECK (entry_type IN ('seed', 'spend', 'revenue', 'adjust', 'topup'));

COMMIT;
