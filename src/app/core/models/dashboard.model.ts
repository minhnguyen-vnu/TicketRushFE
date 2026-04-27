/** snake_case — from backend WebSocket dashboard_update messages */
export interface DashboardData {
  event_id: string;
  sold_count: number;
  locked_count: number;
  available_count: number;
  revenue: number;
}
