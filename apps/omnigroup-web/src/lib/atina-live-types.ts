export type AtinaMeUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  planSlug?: string | null;
};

export type AtinaTaskItem = {
  id: string;
  name: string;
  status: string;
  type: string;
  createdAt?: string;
};

export type AtinaNotificationItem = {
  id: string;
  title: string;
  message?: string;
  isRead: boolean;
  createdAt?: string;
};

export type AtinaDashboardLive = {
  me: AtinaMeUser | null;
  tasks: AtinaTaskItem[];
  tasksTotal: number;
  notifications: AtinaNotificationItem[];
  workflowStats: {
    total: number;
    completed: number;
    failed: number;
    running: number;
  } | null;
  errors: string[];
};

export type AtinaAdminOverview = {
  users?: { total?: number; active?: number };
  subscriptions?: { total?: number; active?: number };
  payments?: { total?: number; totalRevenue?: number };
  tasks?: { total?: number; failed?: number };
  logs?: { last24h?: number };
  workflowTemplatesExecutionSummary?: {
    totalRuns?: number;
    completedRuns?: number;
    failedRuns?: number;
    successRate?: number;
  };
  workflowTemplateAlerts?: {
    total?: number;
    critical?: number;
  };
  modules?: Array<{ name: string; slug: string; version?: string; isCore?: boolean }>;
};

export type AtinaAdminPayment = {
  id: string;
  user_id: string;
  amount: number | string;
  currency: string;
  status: string;
  provider: string;
  description?: string | null;
  metadata?: Record<string, unknown> | string | null;
  email?: string;
  user_name?: string;
  created_at?: string;
  updated_at?: string;
};
