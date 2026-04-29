import { Seat } from './seat.model';

export type ZoneType = 'ASSIGNED' | 'GENERAL_ADMISSION';

export interface SeatZone {
  id: string;
  eventId: string;
  name: string;
  zoneType?: ZoneType;
  rows: number | null;
  cols: number | null;
  price: number;
  capacity: number;
  color: string;
  seats?: Seat[];
}
