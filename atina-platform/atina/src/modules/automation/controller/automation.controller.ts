import { Request, Response } from 'express';
import type { StrictPaginationQuery } from '../../../api/dto/pagination-query.dto';
import { paginate, sendCreated, sendSuccess } from '../../../utils/response';
import type { CreateWorkflowDtoType, ExecuteWorkflowDtoType } from '../dto/automation.dto';
import { AutomationService } from '../service/automation.service';

export class AutomationController {
  constructor(private readonly service: AutomationService) {}

  listWorkflows = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as unknown as StrictPaginationQuery;
    const { rows, total, page, limit } = await this.service.listWorkflows(req.user!.userId, q);
    paginate(res, rows, total, page, limit);
  };

  createWorkflow = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.createWorkflow(req.user!.userId, req.body as CreateWorkflowDtoType);
    sendCreated(res, data, 'Workflow created');
  };

  executeWorkflow = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.executeWorkflow(
      req.params.id,
      req.user!.userId,
      req.body as ExecuteWorkflowDtoType
    );
    sendSuccess(res, data, 'Workflow execution started');
  };

  getExecution = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getExecution(req.params.id, req.user!.userId);
    sendSuccess(res, data);
  };

  deleteWorkflow = async (req: Request, res: Response): Promise<void> => {
    await this.service.deleteWorkflow(req.params.id, req.user!.userId);
    sendSuccess(res, null, 'Workflow deleted');
  };

  listExecutions = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as unknown as StrictPaginationQuery;
    const rows = await this.service.listExecutions(req.user!.userId, q);
    sendSuccess(res, rows);
  };
}
