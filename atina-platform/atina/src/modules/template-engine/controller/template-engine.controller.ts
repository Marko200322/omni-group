import { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response';
import { renderTemplate } from '../service/template-render.service';
import type { RenderTemplateDtoType } from '../dto/template-engine.dto';

export class TemplateEngineController {
  status = (_req: Request, res: Response): void => {
    sendSuccess(res, { ok: true, slug: 'template-engine' }, 'OK');
  };

  render = (req: Request, res: Response): void => {
    const { template, variables } = req.body as RenderTemplateDtoType;
    const rendered = renderTemplate(template, variables);
    sendSuccess(res, { rendered }, 'Rendered');
  };
}
