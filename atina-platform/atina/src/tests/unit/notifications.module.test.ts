import nodemailer from 'nodemailer';
import logger from '../../utils/logger';
import * as db from '../../database/connection';
import { NotificationsModule } from '../../modules/notifications/notifications.module';

// eslint-disable-next-line no-var
var notifSmtp: {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  fromName: string;
};

jest.mock('../../config', () => {
  const actual = jest.requireActual<typeof import('../../config')>('../../config');
  notifSmtp = {
    enabled: true,
    host: 'localhost',
    port: 587,
    secure: false,
    user: '',
    password: '',
    from: 'noreply@test.io',
    fromName: 'ATINA Test',
  };
  return {
    config: {
      ...actual.config,
      smtp: notifSmtp,
      // Keep unit tests offline/deterministic: the Resend fallback must not
      // reach the network based on ambient RESEND_API_KEY in the dev shell.
      resend: { apiKey: '', from: '' },
    },
  };
});

jest.mock('../../database/connection');

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(() => ({
      verify: jest.fn(() => Promise.resolve()),
      sendMail: jest.fn(() => Promise.resolve()),
    })),
  },
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

function transportInstance() {
  const createTransport = nodemailer.createTransport as jest.MockedFunction<typeof nodemailer.createTransport>;
  return createTransport.mock.results[createTransport.mock.results.length - 1]?.value as {
    verify: jest.Mock;
    sendMail: jest.Mock;
  };
}

describe('NotificationsModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    notifSmtp.enabled = true;
    notifSmtp.user = '';
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
  });

  it('initialize does not verify SMTP when user missing', async () => {
    const m = new NotificationsModule();
    await m.initialize();
    await new Promise<void>((r) => setImmediate(r));
    const t = transportInstance();
    expect(t.verify).not.toHaveBeenCalled();
  });

  it('initialize does not verify SMTP when placeholder user configured', async () => {
    notifSmtp.user = 'your_email@gmail.com';
    const m = new NotificationsModule();
    await m.initialize();
    await new Promise<void>((r) => setImmediate(r));
    const t = transportInstance();
    expect(t.verify).not.toHaveBeenCalled();
    notifSmtp.user = '';
  });

  it('initialize verifies SMTP when user configured', async () => {
    notifSmtp.user = 'smtp-user';
    const m = new NotificationsModule();
    await m.initialize();
    await new Promise<void>((r) => setImmediate(r));
    const t = transportInstance();
    expect(t.verify).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('SMTP connection verified');
    notifSmtp.user = '';
  });

  it('initialize does not verify SMTP when disabled with flag', async () => {
    notifSmtp.enabled = false;
    notifSmtp.user = 'smtp-user';
    const m = new NotificationsModule();
    await m.initialize();
    await new Promise<void>((r) => setImmediate(r));
    const t = transportInstance();
    expect(t.verify).not.toHaveBeenCalled();
    notifSmtp.enabled = true;
    notifSmtp.user = '';
  });

  it('initialize warns when verify fails', async () => {
    notifSmtp.user = 'smtp-user';
    const failingVerify = jest.fn(() => Promise.reject(new Error('econnrefused')));
    (nodemailer.createTransport as jest.Mock).mockImplementationOnce(() => ({
      verify: failingVerify,
      sendMail: jest.fn(() => Promise.resolve()),
    }));

    const m = new NotificationsModule();
    await m.initialize();
    await new Promise<void>((r) => setImmediate(r));
    expect(logger.warn).toHaveBeenCalledWith('SMTP not available', { error: 'econnrefused' });
    notifSmtp.user = '';
  });

  it('sendEmail warns when SMTP not configured', async () => {
    const m = new NotificationsModule();
    await m.sendEmail('to@test.com', 'Subj', '<p>x</p>');
    expect(logger.warn).toHaveBeenCalledWith(
      'Email not sent — SMTP not configured',
      expect.objectContaining({ to: 'to@test.com', subject: 'Subj' })
    );
    const t = transportInstance();
    expect(t.sendMail).not.toHaveBeenCalled();
  });

  it('sendEmail sends when SMTP configured', async () => {
    notifSmtp.user = 'u';
    const m = new NotificationsModule();
    await m.sendEmail('to@test.com', 'Hello', '<p>body</p>', 'plain');
    const t = transportInstance();
    expect(t.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'to@test.com',
        subject: 'Hello',
        html: '<p>body</p>',
        text: 'plain',
      })
    );
    expect(logger.info).toHaveBeenCalledWith('Email sent', { to: 'to@test.com', subject: 'Hello', attachments: 0 });
    notifSmtp.user = '';
  });

  it('sendEmail defaults text to subject', async () => {
    notifSmtp.user = 'u';
    const m = new NotificationsModule();
    await m.sendEmail('to@test.com', 'SubjOnly', '<p>h</p>');
    const t = transportInstance();
    expect(t.sendMail.mock.calls[0][0].text).toBe('SubjOnly');
    notifSmtp.user = '';
  });

  it('createNotification inserts in_app row', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'n1', channel: 'in_app' }],
      rowCount: 1,
    } as never);

    const m = new NotificationsModule();
    const row = await m.createNotification({
      userId: 'uid',
      type: 'alert',
      title: 'T',
      message: 'M',
    });

    expect(row.id).toBe('n1');
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('createNotification passes explicit channel and stringified metadata to INSERT', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'n2', channel: 'push' }],
      rowCount: 1,
    } as never);

    const m = new NotificationsModule();
    await m.createNotification({
      userId: 'user-uuid',
      type: 't',
      title: 'T',
      message: 'M',
      channel: 'push',
      metadata: { k: 1, nested: { a: true } },
    });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [, params] = mockQuery.mock.calls[0];
    expect(params).toEqual([
      'user-uuid',
      't',
      'T',
      'M',
      'push',
      null,
      JSON.stringify({ k: 1, nested: { a: true } }),
    ]);
  });

  it('createNotification passes actionUrl to INSERT', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'n3' }],
      rowCount: 1,
    } as never);

    const m = new NotificationsModule();
    await m.createNotification({
      userId: 'uid',
      type: 'invite',
      title: 'Join',
      message: 'You are invited',
      actionUrl: 'https://app.example/invite/abc',
    });

    const [, params] = mockQuery.mock.calls[0];
    expect(params).toEqual([
      'uid',
      'invite',
      'Join',
      'You are invited',
      'in_app',
      'https://app.example/invite/abc',
      '{}',
    ]);
  });

  it('initialize does not verify SMTP when user looks like placeholder (example substring)', async () => {
    notifSmtp.user = 'noreply@example.com';
    const m = new NotificationsModule();
    await m.initialize();
    await new Promise<void>((r) => setImmediate(r));
    const t = transportInstance();
    expect(t.verify).not.toHaveBeenCalled();
    notifSmtp.user = '';
  });

  it('createNotification email channel sends mail when user has email', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 'n1', channel: 'email' }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({
        rows: [{ email: 'user@mail.com' }],
        rowCount: 1,
      } as never);

    notifSmtp.user = 'u';
    const m = new NotificationsModule();
    await m.createNotification({
      userId: 'uid',
      type: 'x',
      title: 'T',
      message: 'M',
      channel: 'email',
      actionUrl: 'https://app.example/o',
    });

    const t = transportInstance();
    expect(t.sendMail).toHaveBeenCalled();
    expect(t.sendMail.mock.calls[0][0].html).toContain('https://app.example/o');
    notifSmtp.user = '';
  });

  it('createNotification email html omits action link when actionUrl missing', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'n2' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ email: 'e@x.com' }], rowCount: 1 } as never);

    notifSmtp.user = 'u';
    const m = new NotificationsModule();
    await m.createNotification({
      userId: 'uid',
      type: 'x',
      title: 'T',
      message: 'Body',
      channel: 'email',
    });

    const t = transportInstance();
    expect(t.sendMail.mock.calls[0][0].html).toBe('<p>Body</p>');
    notifSmtp.user = '';
  });

  it('createNotification email channel skips send when user row missing', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'n1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    notifSmtp.user = 'u';
    const m = new NotificationsModule();
    await m.createNotification({
      userId: 'uid',
      type: 'x',
      title: 'T',
      message: 'M',
      channel: 'email',
    });

    const t = transportInstance();
    expect(t.sendMail).not.toHaveBeenCalled();
    notifSmtp.user = '';
  });
});
