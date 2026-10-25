import { redirect } from 'next/navigation';

/** Legacy notification deep-link — tasks live under Projects. */
export default function DashboardTasksRedirectPage() {
  redirect('/dashboard/projects');
}
