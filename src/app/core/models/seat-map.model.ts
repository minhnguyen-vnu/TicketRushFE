import { Seat } from './seat.model';
import { SeatZone } from './seat-zone.model';

export interface SeatMapZone extends SeatZone {
  seats: Seat[];
}

export interface SeatMapResponse {
  eventId: string;
  zones: SeatMapZone[];
}
