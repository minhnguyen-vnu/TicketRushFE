import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { Event } from '../../../core/models/event.model';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { SeatMapComponent } from '../../seat-map/seat-map/seat-map.component';
import { SeatService } from '../../seat-map/seat.service';
import { EventService } from '../event.service';

@Component({
  selector: 'app-event-detail',
  imports: [SeatMapComponent, RouterLink, LoadingSpinnerComponent, ErrorBannerComponent],
  templateUrl: './event-detail.component.html',
})
export class EventDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly seatService = inject(SeatService);
  private readonly destroyRef = inject(DestroyRef);

  readonly event = signal<Event | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly selectedCount = toSignal(
    this.seatService.selectedSeats$.pipe(map(seats => seats.length)),
    { initialValue: 0 },
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.eventService
      .getEventById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: evt => {
          this.event.set(evt);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Event not found or unavailable.');
          this.loading.set(false);
        },
      });
  }

  protected onCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  protected formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
