import { TicketStatus } from './ticket.model';

export interface CheckoutTicket {
  ticketId: string;
  eventId: string;
  zoneId?: string;
  seatId: string | null;
  qrCode: string;
  status: TicketStatus;
  purchasedAt: string;
}

export interface CheckoutResponse {
  orderId: string;
  totalAmount: number;
  tickets: CheckoutTicket[];
}
