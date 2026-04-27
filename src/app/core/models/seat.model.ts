export type SeatStatus = 'AVAILABLE' | 'LOCKED' | 'SOLD';

export interface Seat {
  id: string;
  zoneId: string;
  rowIndex: number;
  colIndex: number;
  label: string;
  status: SeatStatus;
  lockedBy?: string;
  lockedUntil?: string;
}

/** snake_case — from hold/release response */
export interface SeatHoldResponse {
  seat_id: string;
  status: SeatStatus;
  locked_until: string;
}

/** snake_case — from WebSocket seat_status_changed message */
export interface SeatStatusEvent {
  type: 'seat_status_changed';
  seat_id: string;
  status: SeatStatus;
  locked_by: string | null;
  locked_until: string | null;
}
