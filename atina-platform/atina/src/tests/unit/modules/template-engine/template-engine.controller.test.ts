import { Request, Response } from 'express';
import { TemplateEngineController } from '../../../../modules/template-engine/controller/template-engine.controller';
import * as response from '../../../../utils/response';

describe('TemplateEngineController', () => {
  let controller: TemplateEngineController;
  let sendSuccessSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TemplateEngineController();
    sendSuccessSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
  });

  afterEach(() => {
    sendSuccessSpy.mockRestore();
  });

  const mockRes = (): Response => {
    const json = jest.fn().mockReturnThis();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as unknown as Response;
  };

  it('status forwards ok payload without logging', () => {
    const res = mockRes();
    controller.status({} as Request, res);
    expect(sendSuccessSpy).toHaveBeenCalledTimes(1);
    expect(sendSuccessSpy).toHaveBeenCalledWith(res, { ok: true, slug: 'template-engine' }, 'OK');
  });

  it('render passes body through renderTemplate and returns rendered', () => {
    const res = mockRes();
    controller.render(
      { body: { template: 'a{{k}}b', variables: { k: '2' } } } as Request,
      res
    );
    expect(sendSuccessSpy).toHaveBeenCalledWith(res, { rendered: 'a2b' }, 'Rendered');
  });

  it('render matches validated body shape (variables default from Zod)', () => {
    const res = mockRes();
    controller.render({ body: { template: 'plain', variables: {} } } as Request, res);
    expect(sendSuccessSpy).toHaveBeenCalledWith(res, { rendered: 'plain' }, 'Rendered');
  });
});
