jest.unmock('../../utils/logger');

import fs from 'fs';
import path from 'path';
import os from 'os';
import type winston from 'winston';

const origLogFile = process.env.LOG_FILE;
const origLogLevel = process.env.LOG_LEVEL;

function loadLoggerModule(): { default: winston.Logger; logger: winston.Logger } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../utils/logger');
}

function tearDownLogger(logger: winston.Logger, logFile: string): void {
  logger.close();
  const errFile = logFile.replace(/\.log$/i, '-error.log');
  for (const f of [logFile, errFile]) {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    } catch {
      /* ignore */
    }
  }
}

describe('utils/logger (real winston)', () => {
  beforeEach(() => {
    jest.spyOn(process.stdout, 'write').mockImplementation((() => true) as typeof process.stdout.write);
    jest.spyOn(process.stderr, 'write').mockImplementation((() => true) as typeof process.stderr.write);
    const c = console as Console & { _stdout?: NodeJS.WriteStream; _stderr?: NodeJS.WriteStream };
    if (c._stdout?.write) {
      jest.spyOn(c._stdout, 'write').mockImplementation((() => true) as typeof process.stdout.write);
    }
    if (c._stderr?.write) {
      jest.spyOn(c._stderr, 'write').mockImplementation((() => true) as typeof process.stderr.write);
    }
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (origLogFile === undefined) delete process.env.LOG_FILE;
    else process.env.LOG_FILE = origLogFile;
    if (origLogLevel === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = origLogLevel;
    jest.restoreAllMocks();
  });

  it('creates log directory when missing', () => {
    const logFile = path.join(os.tmpdir(), `atina-logger-mkdir-${Date.now()}`, 'app.log');
    process.env.LOG_FILE = logFile;
    const logsDir = path.dirname(logFile);

    jest.spyOn(fs, 'existsSync').mockImplementation((p) => String(p) !== logsDir);
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);

    jest.resetModules();
    const { default: logger } = loadLoggerModule();

    expect(mkdirSpy).toHaveBeenCalledWith(logsDir, { recursive: true });
    tearDownLogger(logger, logFile);
  });

  it('skips mkdir when log directory already exists', () => {
    const logFile = path.join(os.tmpdir(), `atina-logger-exists-${Date.now()}.log`);
    process.env.LOG_FILE = logFile;

    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync');

    jest.resetModules();
    const { default: logger } = loadLoggerModule();

    expect(mkdirSpy).not.toHaveBeenCalled();
    tearDownLogger(logger, logFile);
  });

  it('formats console output with and without extra meta', () => {
    const logFile = path.join(os.tmpdir(), `atina-logger-fmt-${Date.now()}.log`);
    process.env.LOG_FILE = logFile;

    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    jest.resetModules();
    const { default: logger } = loadLoggerModule();

    logger.info('plain');
    logger.info('with-meta', { requestId: 'r1' });
    logger.error(new Error('boom'));

    tearDownLogger(logger, logFile);
  });

  it('uses LOG_LEVEL from env when the module loads', () => {
    const logFile = path.join(os.tmpdir(), `atina-logger-level-${Date.now()}.log`);
    process.env.LOG_FILE = logFile;
    process.env.LOG_LEVEL = 'warn';

    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    jest.resetModules();
    const { default: logger } = loadLoggerModule();

    expect(logger.level).toBe('warn');
    expect(logger.isLevelEnabled('info')).toBe(false);
    expect(logger.isLevelEnabled('warn')).toBe(true);

    tearDownLogger(logger, logFile);
  });
});
