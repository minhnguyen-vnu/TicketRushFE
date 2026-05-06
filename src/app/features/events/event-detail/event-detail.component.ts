import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Event } from '../../../core/models/event.model';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ImgThumbPipe } from '../../../shared/pipes/img-thumb.pipe';
import { SeatMapComponent } from '../../seat-map/seat-map/seat-map.component';
import { SeatService } from '../../seat-map/seat.service';
import { EventService } from '../event.service';

@Component({
  selector: 'app-event-detail',
  imports: [SeatMapComponent, RouterLink, LoadingSpinnerComponent, ErrorBannerComponent, ImgThumbPipe],
  templateUrl: './event-detail.component.html',
})
export class EventDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventService = inject(EventService);
  private readonly seatService = inject(SeatService);
  private readonly destroyRef = inject(DestroyRef);

  readonly event = signal<Event | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    const cachedEventId = this.seatService.getCachedEventId();
    if (cachedEventId && cachedEventId !== id) {
      this.seatService.resetEventContext();
    }
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
