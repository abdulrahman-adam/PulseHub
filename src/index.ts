import { startHubServer } from './hub/server';
import { startDashboardLoop } from './dashboard/dashboard';

const { receiver, summary, config } = startHubServer();

startDashboardLoop(() => summary.snapshot(receiver.getStats()), config.dashboardRefreshMs);
