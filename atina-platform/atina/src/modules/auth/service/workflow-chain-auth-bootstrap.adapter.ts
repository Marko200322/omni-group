import { WorkflowChainService } from '../../workflow-chain/service/workflow-chain.service';
import type { AuthBootstrapTemplatesReport, AuthPostLoginBootstrap } from './auth-post-login-bootstrap';

class WorkflowChainAuthBootstrapAdapter implements AuthPostLoginBootstrap {
  private readonly chain = new WorkflowChainService();

  async bootstrapTemplates(
    userId: string,
    overwrite = false,
    namePrefix?: string
  ): Promise<AuthBootstrapTemplatesReport> {
    return (await this.chain.bootstrapTemplates(userId, overwrite, namePrefix)) as AuthBootstrapTemplatesReport;
  }
}

export function createWorkflowChainAuthBootstrapAdapter(): AuthPostLoginBootstrap {
  return new WorkflowChainAuthBootstrapAdapter();
}
