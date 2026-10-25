import { TasksService } from '../../tasks/service/tasks.service';

const TICKET_TYPES = ['support_ticket', 'support_automation', 'ai_support_ops'] as const;

export class SupportTicketsService {
  private readonly tasks = new TasksService();

  async listTickets(
    userId: string,
    opts: { page: number; limit: number; status?: string },
  ) {
    // Tasks API filters a single type — fetch support_ticket primary queue.
    const { tasks, total } = await this.tasks.listTasks(userId, {
      page: opts.page,
      limit: opts.limit,
      status: opts.status,
      type: 'support_ticket',
    });
    const tickets = tasks.map((t) => {
      const payload = (t.payload && typeof t.payload === 'object' ? t.payload : {}) as Record<
        string,
        unknown
      >;
      return {
        id: t.id,
        subject: t.name,
        description: t.description ?? null,
        status: typeof payload.status === 'string' ? payload.status : t.status,
        category: typeof payload.category === 'string' ? payload.category : 'general',
        deliverableId: typeof payload.deliverableId === 'string' ? payload.deliverableId : null,
        slaHours: typeof payload.slaHours === 'number' ? payload.slaHours : null,
        createdAt: t.created_at ? new Date(t.created_at).toISOString() : null,
        taskStatus: t.status,
        type: t.type,
      };
    });
    return { tickets, total, types: TICKET_TYPES };
  }

  async createTicket(
    userId: string,
    input: { subject: string; message: string; category?: string },
  ) {
    const task = await this.tasks.createTask(userId, {
      type: 'support_ticket',
      name: input.subject,
      description: input.message,
      payload: {
        category: input.category?.trim() || 'general',
        status: 'open',
        clientVisible: true,
        source: 'portal',
      },
    });
    return {
      id: (task as { id?: string }).id,
      subject: input.subject,
      status: 'open',
      category: input.category?.trim() || 'general',
    };
  }
}
