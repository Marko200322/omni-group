export type DigitalSignatureMode = 'request' | 'remind' | 'verify';

/** Deterministic stub outputs for ecosystem runs (no external providers). */
export function digitalSignatureStubOutput(
  mode: DigitalSignatureMode,
  input: Record<string, unknown>
): Record<string, unknown> {
  const ref = typeof input.documentRef === 'string' ? input.documentRef : '';

  switch (mode) {
    case 'request':
      return {
        signature_request_id: 'ds_stub_sigreq_001',
        status: 'pending_signers',
        envelope_id: 'ds_stub_env_001',
        document_ref: ref || 'ds_stub_doc_default',
      };
    case 'remind':
      return {
        reminder_id: 'ds_stub_remind_001',
        recipients_notified: 2,
        next_reminder_at: '2099-01-01T00:00:00.000Z',
        document_ref: ref || 'ds_stub_doc_default',
      };
    case 'verify':
      return {
        verified: true,
        signature_valid: true,
        document_hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
        signer_count: 1,
        document_ref: ref || 'ds_stub_doc_default',
      };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown digital signature mode: ${String(_exhaustive)}`);
    }
  }
}
