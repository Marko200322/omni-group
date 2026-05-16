import { digitalSignatureStubOutput } from '../../../../modules/digital-signature/digital-signature.stub';

describe('digitalSignatureStubOutput', () => {
  it('returns fixed request stub', () => {
    expect(digitalSignatureStubOutput('request', {})).toEqual({
      signature_request_id: 'ds_stub_sigreq_001',
      status: 'pending_signers',
      envelope_id: 'ds_stub_env_001',
      document_ref: 'ds_stub_doc_default',
    });
  });

  it('passes documentRef through on request', () => {
    expect(digitalSignatureStubOutput('request', { documentRef: 'doc-abc' })).toMatchObject({
      document_ref: 'doc-abc',
    });
  });

  it('returns fixed remind stub', () => {
    expect(digitalSignatureStubOutput('remind', {})).toEqual({
      reminder_id: 'ds_stub_remind_001',
      recipients_notified: 2,
      next_reminder_at: '2099-01-01T00:00:00.000Z',
      document_ref: 'ds_stub_doc_default',
    });
  });

  it('returns fixed verify stub', () => {
    expect(digitalSignatureStubOutput('verify', {})).toEqual({
      verified: true,
      signature_valid: true,
      document_hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      signer_count: 1,
      document_ref: 'ds_stub_doc_default',
    });
  });

  it('ignores non-string documentRef and uses default', () => {
    expect(digitalSignatureStubOutput('request', { documentRef: 12345 })).toMatchObject({
      document_ref: 'ds_stub_doc_default',
    });
  });

  it('documentRef propagates for remind and verify when string', () => {
    expect(digitalSignatureStubOutput('remind', { documentRef: 'doc-x' })).toMatchObject({
      document_ref: 'doc-x',
    });
    expect(digitalSignatureStubOutput('verify', { documentRef: 'doc-y' })).toMatchObject({
      document_ref: 'doc-y',
    });
  });

  it('uses default document_ref when documentRef is empty string', () => {
    expect(digitalSignatureStubOutput('request', { documentRef: '' })).toMatchObject({
      document_ref: 'ds_stub_doc_default',
    });
  });

  it('preserves whitespace-only documentRef as provided', () => {
    expect(digitalSignatureStubOutput('verify', { documentRef: '   ' })).toMatchObject({
      document_ref: '   ',
    });
  });

  it('throws on unknown mode at runtime', () => {
    expect(() => digitalSignatureStubOutput('bogus' as any, {})).toThrow(
      /Unknown digital signature mode/i
    );
  });
});
