jest.mock('../../core/CoreEngine', () => ({
  CoreEngine: jest.fn(),
}));

import { CoreEngine } from '../../core/CoreEngine';
import { main, maybeStartProcess } from '../../index';
import logger from '../../utils/logger';

function freshEngine() {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    start: jest.fn().mockResolvedValue(undefined),
  };
}

describe('main()', () => {
  let engine: ReturnType<typeof freshEngine>;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = freshEngine();
    (CoreEngine as jest.MockedClass<typeof CoreEngine>).mockImplementation(() => engine as never);
  });

  it('creates CoreEngine, initializes and starts', async () => {
    await main();

    expect(CoreEngine).toHaveBeenCalledTimes(1);
    expect(engine.initialize).toHaveBeenCalledTimes(1);
    expect(engine.start).toHaveBeenCalledTimes(1);
  });

  it('logs error and exits when initialize fails', async () => {
    engine.initialize.mockRejectedValueOnce(new Error('db down'));
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await main();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to start ATINA',
      expect.objectContaining({ error: expect.any(Error) })
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('logs error and exits when start fails', async () => {
    engine.start.mockRejectedValueOnce(new Error('bind failed'));
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await main();

    expect(logger.error).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('maybeStartProcess does nothing when entry is not self', () => {
    maybeStartProcess({} as NodeModule, { id: 'other' } as NodeModule);
    expect(engine.initialize).not.toHaveBeenCalled();
    expect(engine.start).not.toHaveBeenCalled();
  });

  it('maybeStartProcess schedules main when entry equals self', async () => {
    const stub = {} as NodeModule;
    maybeStartProcess(stub, stub);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(engine.initialize).toHaveBeenCalled();
    expect(engine.start).toHaveBeenCalled();
  });
});
