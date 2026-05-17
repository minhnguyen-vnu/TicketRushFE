import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly seatService = inject(SeatService);
  private readonly destroyRef = inject(DestroyRef);

  readonly event = signal<Event | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly gaQuantity = signal(1);
  readonly isGeneralAdmission = computed(() => this.event()?.seatingType === 'GENERAL_ADMISSION');
  readonly isFreeEvent = computed(() => this.event()?.ticketType === 'FREE');
  readonly ctaLabel = computed(() =>
    this.event()?.ticketType === 'FREE' ? 'Proceed to checkout' : 'Continue to checkout',
  );

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
        error: (err: HttpErrorResponse) => {
          this.error.set(err.error?.error ?? 'Event not found or unavailable.');
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

  protected decreaseQuantity(): void {
    if (this.isFreeEvent()) return;
    this.gaQuantity.update(value => Math.max(1, value - 1));
  }

  protected increaseQuantity(): void {
    if (this.isFreeEvent()) return;
    const maxCapacity = this.event()?.maxCapacity ?? null;
    this.gaQuantity.update(value => {
      const next = value + 1;
      return maxCapacity ? Math.min(maxCapacity, next) : next;
    });
  }

  protected goToGeneralAdmissionCheckout(): void {
    const event = this.event();
    if (!event) return;
    void this.router.navigate(['/checkout'], {
      queryParams: {
        eventId: event.id,
        quantity: this.isFreeEvent() ? 1 : this.gaQuantity(),
      },
    });
  }
}
