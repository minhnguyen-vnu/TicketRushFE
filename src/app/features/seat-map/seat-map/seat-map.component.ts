import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Seat } from '../../../core/models/seat.model';
import { SeatMapZone } from '../../../core/models/seat-map.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { CurrencyVndPipe } from '../../../shared/pipes/currency-vnd.pipe';
import { HoldTimerComponent } from '../hold-timer/hold-timer.component';
import { SeatGridComponent } from '../seat-grid/seat-grid.component';
import { SeatLegendComponent } from '../seat-legend/seat-legend.component';
import { SeatService } from '../seat.service';
import { computeStandLayout } from '../../../shared/utils/stand-layout';

@Component({
  selector: 'app-seat-map',
  imports: [
    SeatGridComponent,
    HoldTimerComponent,
    SeatLegendComponent,
    LoadingSpinnerComponent,
    ErrorBannerComponent,
    CurrencyVndPipe,
  ],
  template: `
    @if (loading()) {
      <app-loading-spinner />
    } @else if (error()) {
      <app-error-banner [message]="error()" />
    } @else {
      @if (hasSelection()) {
        <app-hold-timer (expired)="onHoldExpired()" />
      }
      <app-seat-legend [zones]="zones()" />

      <!-- Stand overview -->
      @if (zones().length > 0) {
        <div class="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mt-5">
          <p class="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 text-center">Stand Overview</p>
          <div class="bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-widest text-center py-2 rounded-lg mb-3">
            Stage
          </div>
          <div class="relative w-full bg-zinc-950 rounded-lg overflow-hidden"
               [style.aspect-ratio]="standLayout().standCols + ' / ' + (standLayout().standRows || 1)">
            @for (placed of standLayout().zones; track placed.zone.id) {
              <button type="button"
                      (click)="scrollToZone(placed.zone.id)"
                      class="absolute flex items-center justify-center text-[11px] font-bold text-white border border-black/30 rounded-sm overflow-hidden hover:ring-2 hover:ring-white/60 transition-all"
                      [style.left.%]="(placed.startCol / standLayout().standCols) * 100"
                      [style.top.%]="(placed.startRow / (standLayout().standRows || 1)) * 100"
                      [style.width.%]="(placed.cols / standLayout().standCols) * 100"
                      [style.height.%]="(placed.rows / (standLayout().standRows || 1)) * 100"
                      [style.background-color]="placed.zone.color"
                      [title]="placed.zone.name + ' · ' + (placed.zone.price | currencyVnd)">
                <span class="truncate px-1">{{ placed.zone.name }}</span>
              </button>
            }
          </div>
          <p class="text-[10px] text-zinc-500 text-center mt-3">Click a zone to pick seats below.</p>
        </div>
      }

      <div class="flex flex-wrap gap-6 mt-5">
        @for (zone of zones(); track zone.id) {
          <div [id]="'zone-' + zone.id"
               class="bg-zinc-900 rounded-xl p-4 border border-zinc-800 scroll-mt-24">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-sm" [style.background-color]="zone.color"></div>
                <h3 class="font-semibold text-white text-sm">{{ zone.name }}</h3>
              </div>
              <span class="text-xs text-zinc-400">{{ zone.price | currencyVnd }}</span>
            </div>
            <app-seat-grid
              [zone]="zone"
              [currentUserId]="currentUserId()"
              (holdRequest)="onHoldRequest($event)"
              (releaseRequest)="onReleaseRequest($event)"
            />
          </div>
        }
      </div>
    }
  `,
})
export class SeatMapComponent implements OnInit {
  private readonly seatService = inject(SeatService);
  private readonly wsService = inject(WebSocketService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly eventId = input.required<string>();

  readonly zones = signal<SeatMapZone[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  protected readonly currentUserId = computed(() => this.authService.getCurrentUser()?.id ?? null);
  protected readonly hasSelection = signal(false);

  protected readonly standLayout = computed(() => {
    const zs = this.zones();
    const totalCols = zs.reduce((sum, z) => sum + Math.max(1, z.cols ?? 1), 0);
    const standCols = Math.max(10, Math.min(60, totalCols));
    return computeStandLayout(zs, standCols);
  });

  protected scrollToZone(zoneId: string): void {
    document.getElementById(`zone-${zoneId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngOnInit(): void {
    this.seatService.selectedSeats$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(seats => this.hasSelection.set(seats.length > 0));

    this.loadSeatMap();
    this.connectWS();
  }

  private loadSeatMap(): void {
    this.seatService
      .getSeatMap(this.eventId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.zones.set(data.zones);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load seat map. Please refresh.');
          this.loading.set(false);
        },
      });
  }

  private connectWS(): void {
    this.wsService.connectSeatMap(this.eventId());
    this.destroyRef.onDestroy(() => this.wsService.disconnect());

    this.wsService.seatUpdates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(msg => {
        this.zones.update(zones =>
          zones.map(zone => ({
            ...zone,
            seats: zone.seats.map(s =>
              s.id === msg.seat_id
                ? {
                    ...s,
                    status: msg.status,
                    lockedBy: msg.locked_by ?? undefined,
                    lockedUntil: msg.locked_until ?? undefined,
                  }
                : s,
            ),
          })),
        );
        // Remove from selection if no longer held by current user
        if (msg.status !== 'LOCKED' || msg.locked_by !== this.currentUserId()) {
          this.seatService.removeSelected(msg.seat_id);
        }
      });
  }

  protected onHoldRequest(seat: Seat): void {
    // Optimistic update — immediately show as my held seat
    const userId = this.currentUserId();
    const optimistic: Seat = { ...seat, status: 'LOCKED', lockedBy: userId ?? undefined };
    this.updateLocalSeat(optimistic);

    this.seatService.holdSeat(seat.id, this.eventId()).subscribe({
      next: response => {
        const confirmed: Seat = { ...optimistic, lockedUntil: response.locked_until };
        this.seatService.addSelected(confirmed);
        this.updateLocalSeat(confirmed);
      },
      error: () => {
        this.updateLocalSeat(seat); // revert on failure
        this.toast.error('Could not hold this seat. Please try again.');
      },
    });
  }

  protected onReleaseRequest(seat: Seat): void {
    // Optimistic update — immediately show as available
    const optimistic: Seat = { ...seat, status: 'AVAILABLE', lockedBy: undefined, lockedUntil: undefined };
    this.seatService.removeSelected(seat.id);
    this.updateLocalSeat(optimistic);

    this.seatService.releaseSeat(seat.id, this.eventId()).subscribe({
      error: () => {
        this.seatService.addSelected(seat); // revert on failure
        this.updateLocalSeat(seat);
        this.toast.error('Could not release this seat. Please try again.');
      },
    });
  }

  protected onHoldExpired(): void {
    this.seatService.clearSelected();
    this.zones.update(zones =>
      zones.map(zone => ({
        ...zone,
        seats: zone.seats.map(s =>
          s.lockedBy === this.currentUserId()
            ? { ...s, status: 'AVAILABLE' as const, lockedBy: undefined, lockedUntil: undefined }
            : s,
        ),
      })),
    );
  }

  private updateLocalSeat(updated: Seat): void {
    this.zones.update(zones =>
      zones.map(zone => ({
        ...zone,
        seats: zone.seats.map(s => (s.id === updated.id ? updated : s)),
      })),
    );
  }
}
