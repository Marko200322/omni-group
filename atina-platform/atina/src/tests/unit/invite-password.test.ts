import { generateInvitePassword } from '../../modules/admin/lib/invite-password';

describe('generateInvitePassword', () => {
  it('returns password matching auth register rules', () => {
    const pwd = generateInvitePassword();
    expect(pwd.length).toBeGreaterThanOrEqual(11);
    expect(pwd).toMatch(/[a-z]/);
    expect(pwd).toMatch(/[A-Z]/);
    expect(pwd).toMatch(/\d/);
  });

  it('generates unique values', () => {
    const a = generateInvitePassword();
    const b = generateInvitePassword();
    expect(a).not.toBe(b);
  });
});
