export type TicketStatus = 'VALID' | 'USED' | 'REFUNDED';

export interface TicketDetailResponse {
  ticketId: string;
  qrCode: string;
  status: TicketStatus;
  purchasedAt: string;
  seat: {
    id: string;
    label: string;
    rowIndex: number;
    colIndex: number;
    status: string;
  } | null;
  zone: {
    id: string;
    name: string;
    color: string;
    price: number;
  };
  event: {
    id: string;
    title: string;
    slug: string;
    venue: string;
    startTime: string;
    endTime: string;
    bannerUrl: string;
  };
}
