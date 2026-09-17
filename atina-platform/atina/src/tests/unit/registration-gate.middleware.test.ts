import { registrationGate, isPublicRegistrationOpen } from '../../api/middleware/registration-gate.middleware';

jest.mock('../../config', () => ({
  config: { app: { env: 'production' } },
}));

jest.mock('../../utils/response', () => ({
  sendError: jest.fn(),
}));

const { sendError } = require('../../utils/response') as { sendError: jest.Mock };

describe('registration-gate', () => {
  const prev = process.env.REGISTRATION_ENABLED;

  afterEach(() => {
    if (prev === undefined) delete process.env.REGISTRATION_ENABLED;
    else process.env.REGISTRATION_ENABLED = prev;
    jest.clearAllMocks();
  });

  it('is closed in production when REGISTRATION_ENABLED is unset', () => {
    delete process.env.REGISTRATION_ENABLED;
    expect(isPublicRegistrationOpen()).toBe(false);
  });

  it('is open in production only when explicitly true', () => {
    process.env.REGISTRATION_ENABLED = 'true';
    expect(isPublicRegistrationOpen()).toBe(true);
  });

  it('blocks POST /register when closed', () => {
    delete process.env.REGISTRATION_ENABLED;
    const next = jest.fn();
    registrationGate({} as never, {} as never, next);
    expect(sendError).toHaveBeenCalledWith(
      expect.anything(),
      'Registration is disabled on this instance',
      403,
      'REGISTRATION_DISABLED',
    );
    expect(next).not.toHaveBeenCalled();
  });
});
