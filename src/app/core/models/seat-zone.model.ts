import { Seat } from './seat.model';

export interface SeatZone {
  id: string;
  eventId: string;
  name: string;
  rows: number;
  cols: number;
  price: number;
  capacity: number;
  color: string;
  seats?: Seat[];
}
