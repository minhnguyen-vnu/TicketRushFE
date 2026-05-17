/** snake_case — from backend queue endpoints */
export interface QueueStatus {
  active_users: number;
  max_active_users: number;
  has_access: boolean;
  notice: string | null;
  session_expires_in: number | null;
}
