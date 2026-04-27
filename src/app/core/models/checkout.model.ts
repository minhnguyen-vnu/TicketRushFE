import { TicketStatus } from './ticket.model';

export interface CheckoutTicket {
  ticketId: string;
  eventId: string;
  seatId: string;
  qrCode: string;
  status: TicketStatus;
  purchasedAt: string;
}

export interface CheckoutResponse {
  orderId: string;
  totalAmount: number;
  tickets: CheckoutTicket[];
}
