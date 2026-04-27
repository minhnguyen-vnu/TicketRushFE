/** snake_case — from backend queue endpoints */
export interface QueueStatus {
  position: number;
  total_users: number;
  is_in_queue: boolean;
  has_access: boolean;
  access_expires_in: number;
}
