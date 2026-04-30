import { SeatZone } from './seat-zone.model';

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
export type TicketType = 'FREE' | 'PAID';
export type SeatingType = 'ASSIGNED' | 'GENERAL_ADMISSION';

export interface EventCategory {
  id: string;
  name: string;
}

/** camelCase — from APIModel-backed endpoints (GET /api/events/:id) */
export interface Event {
  id: string;
  hostId: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  startTime: string;
  endTime: string;
  venue: string;
  bannerUrl: string;
  isPrivate: boolean;
  theme: string;
  status: EventStatus;
  ticketType: TicketType;
  seatingType: SeatingType;
  maxCapacity: number | null;
  categories: EventCategory[];
  zones: SeatZone[];
}

/** snake_case — from raw dict list endpoint (GET /api/events) */
export interface EventListItem {
  id: string;
  title: string;
  slug: string;
  start_time: string;
  end_time: string;
  venue: string;
  banner_url: string;
  lowest_price: number;
  status: EventStatus;
  ticketType: TicketType;
  seatingType: SeatingType;
  maxCapacity: number | null;
  categories: EventCategory[];
}
