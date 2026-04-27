import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardData } from '../../../core/models/dashboard.model';
import { EventListItem } from '../../../core/models/event.model';
import { CurrencyVndPipe } from '../../../shared/pipes/currency-vnd.pipe';

interface SaleFeedItem {
  ticketId: string;
  buyerName: string;
  seatLabel: string;
  zoneName: string;
  price: number;
  purchasedAt: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [RouterLink, CurrencyVndPipe, DatePipe],
})
export class DashboardComponent {
  readonly loading = signal(false);
  readonly events = signal<EventListItem[]>([]);
  readonly selectedEventId = signal('');
  readonly data = signal<DashboardData | null>(null);
  readonly recentSales = signal<SaleFeedItem[]>([]);
  readonly serverLoad = signal(0);
  readonly fillRate = signal(0);
  readonly wsConnected = signal(false);

  onEventChange(eventId: string): void {}
}
