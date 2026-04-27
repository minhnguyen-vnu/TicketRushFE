import { SeatZone } from './seat-zone.model';

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';

/** camelCase — from APIModel-backed endpoints (GET /api/events/:id) */
export interface Event {
  id: string;
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
  categories: string[];
  tags: string[];
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
  categories: string[];
  tags: string[];
}
