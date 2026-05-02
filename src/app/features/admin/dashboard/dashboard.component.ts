import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { DashboardData } from '../../../core/models/dashboard.model';
import { EventListItem } from '../../../core/models/event.model';
import { CurrencyVndPipe } from '../../../shared/pipes/currency-vnd.pipe';
import { AdminEventService } from '../event-management/admin-event.service';
import { ToastService } from '../../../core/services/toast.service';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [RouterLink, CurrencyVndPipe],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly adminEventService = inject(AdminEventService);
  private readonly dashboardService = inject(DashboardService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly events = signal<EventListItem[]>([]);
  readonly selectedEventId = signal('');
  readonly data = signal<DashboardData | null>(null);
  readonly wsConnected = signal(false);
  readonly serverLoad = signal(0);

  readonly fillRate = computed(() => {
    const d = this.data();
    if (!d) return 0;
    const total = d.sold_count + d.locked_count + d.available_count;
    return total === 0 ? 0 : Math.round((d.sold_count / total) * 100);
  });

  private wsSub: Subscription | null = null;

  ngOnInit(): void {
    this.adminEventService.getEvents().subscribe({
      next: events => this.events.set(events),
      error: () => this.toast.error('Failed to load events.'),
    });
  }

  onEventChange(eventId: string): void {
    this.selectedEventId.set(eventId);
    this.data.set(null);
    this.wsSub?.unsubscribe();
    this.dashboardService.disconnect();
    this.wsConnected.set(false);
    if (!eventId) return;

    this.loading.set(true);
    this.dashboardService.getDashboardSnapshot(eventId).subscribe({
      next: snapshot => {
        this.data.set(snapshot);
        this.loading.set(false);
        this.connectWS(eventId);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load dashboard data.');
      },
    });
  }

  private connectWS(eventId: string): void {
    this.dashboardService.connectDashboardWS(eventId);
    this.wsConnected.set(true);
    this.wsSub = this.dashboardService.dashboardUpdates$.subscribe(update => {
      if (update.event_id === eventId) {
        this.data.set(update);
      }
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.dashboardService.disconnect();
  }
}
