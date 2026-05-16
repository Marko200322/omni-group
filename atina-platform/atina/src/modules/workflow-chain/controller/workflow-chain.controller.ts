import { Request, Response } from 'express';
import { z } from 'zod';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { WorkflowChainService } from '../service/workflow-chain.service';
import {
  WorkflowExecutionQueryDto,
  WorkflowExecutionStatsQueryDto,
  WorkflowStepAnalyticsQueryDto,
} from '../dto/workflow-chain.dto';

export class WorkflowChainController {
  private readonly service = new WorkflowChainService();

  create = async (req: Request, res: Response): Promise<void> => {
    const d = req.body;
    const row = await this.service.create(req.user!.userId, d.name, d.steps);
    sendCreated(res, row, 'Workflow chain created');
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const rows = await this.service.list(req.user!.userId);
    sendSuccess(res, rows);
  };

  listTemplates = async (_req: Request, res: Response): Promise<void> => {
    const rows = this.service.listTemplates();
    sendSuccess(res, rows);
  };

  previewTemplate = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.previewTemplate(req.params.templateKey);
    sendSuccess(res, row);
  };

  createFromTemplate = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.createFromTemplate(req.user!.userId, req.params.templateKey, req.body.name);
    sendCreated(res, row, 'Workflow chain created from template');
  };

  createAndRunFromTemplate = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.createFromTemplateAndRun(
      req.user!.userId,
      req.params.templateKey,
      req.body.name,
      req.body.input,
      Boolean(req.body.force)
    );
    sendCreated(res, row, 'Workflow chain created and executed from template');
  };

  bootstrapTemplates = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.bootstrapTemplates(
      req.user!.userId,
      Boolean(req.body.overwrite),
      req.body.namePrefix ? String(req.body.namePrefix) : undefined
    );
    sendCreated(res, row, 'Workflow templates bootstrapped');
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.get(req.user!.userId, req.params.id);
    sendSuccess(res, row);
  };

  validate = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.validate(req.user!.userId, req.params.id);
    sendSuccess(res, data);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.update(req.user!.userId, req.params.id, req.body);
    sendSuccess(res, row, 'Workflow chain updated');
  };

  clone = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.clone(req.user!.userId, req.params.id, req.body.name);
    sendCreated(res, row, 'Workflow chain cloned');
  };

  pause = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.pause(req.user!.userId, req.params.id);
    sendSuccess(res, row, 'Workflow chain paused');
  };

  activate = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.activate(req.user!.userId, req.params.id);
    sendSuccess(res, row, 'Workflow chain activated');
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.delete(req.user!.userId, req.params.id);
    sendSuccess(res, result, 'Workflow chain deleted');
  };

  listExecutions = async (req: Request, res: Response): Promise<void> => {
    const { page, limit, workflowId } = req.query as unknown as z.infer<typeof WorkflowExecutionQueryDto>;
    const data = await this.service.listExecutions(req.user!.userId, page, limit, workflowId);
    sendSuccess(res, data);
  };

  executionStats = async (req: Request, res: Response): Promise<void> => {
    const { workflowId } = req.query as unknown as z.infer<typeof WorkflowExecutionStatsQueryDto>;
    const data = await this.service.executionStats(req.user!.userId, workflowId);
    sendSuccess(res, data);
  };

  stepAnalytics = async (req: Request, res: Response): Promise<void> => {
    const { workflowId, days } = req.query as unknown as z.infer<typeof WorkflowStepAnalyticsQueryDto>;
    const data = await this.service.stepAnalytics(req.user!.userId, days, workflowId);
    sendSuccess(res, data);
  };

  getExecution = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getExecution(req.user!.userId, req.params.executionTaskId);
    sendSuccess(res, data);
  };

  rerunExecution = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.rerunExecution(req.user!.userId, req.params.executionTaskId, req.body.input);
    sendSuccess(res, data, 'Workflow execution rerun started');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.run(req.user!.userId, req.params.id, req.body.input, Boolean(req.body.force));
    sendSuccess(res, data, 'Workflow chain executed');
  };
}
