import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Seat } from '../../../core/models/seat.model';
import { SeatMapZone } from '../../../core/models/seat-map.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { HoldTimerComponent } from '../hold-timer/hold-timer.component';
import { SeatLegendComponent } from '../seat-legend/seat-legend.component';
import { SeatService } from '../seat.service';
import { QueueService } from '../../queue/queue.service';
import { QueueStatus } from '../../../core/models/queue.model';
import { computeStandLayout } from '../../../shared/utils/stand-layout';
import { CellValue, PaintGrid, loadStandFromStorage, makeEmptyGrid, setCell } from '../../../shared/utils/stand-paint';

interface ZonePaintMeta {
  zoneId: string;
  zoneKey: string;
  minRow: number;
  minCol: number;
}

@Component({
  selector: 'app-seat-map',
  imports: [
    HoldTimerComponent,
    SeatLegendComponent,
    LoadingSpinnerComponent,
    ErrorBannerComponent,
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

      @let g = panorama();
      @if (g && g.length > 0) {
        <div class="group relative bg-zinc-900 rounded-2xl p-5 border border-zinc-800 mt-5 overflow-hidden">
          <div
            class="absolute right-4 top-4 z-20 min-w-10 rounded-xl bg-white px-3 py-2 text-center text-sm font-black text-zinc-900 shadow-lg"
            title="Active users"
          >
            @if (roomAccess()) {
              <span>You are active</span>
              @if (sessionCountdown() > 0) {
                <span class="ml-2 rounded-lg bg-zinc-900 px-2 py-1 text-xs text-white">{{ sessionTimeLabel() }}</span>
              }
            } @else {
              {{ activeUsers() }}
            }
          </div>
          <div class="bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-widest text-center py-2 rounded-lg mb-4">
            Stage
          </div>
          <div class="overflow-x-auto">
            <div class="inline-grid gap-[3px] mx-auto"
                 [style.grid-template-columns]="'repeat(' + g[0].length + ', minmax(20px, 1fr))'">
              @for (row of g; track $index; let r = $index) {
                @for (cell of row; track $index; let c = $index) {
                  @let seat = panoramaSeat(r, c);
                  <button type="button"
                          [disabled]="panoramaDisabled(cell, seat)"
                          (click)="onPanoramaClick(seat)"
                          class="aspect-square rounded-[3px] border transition-transform"
                          [style.background-color]="panoramaBg(cell, seat)"
                          [style.border-color]="panoramaBorder(cell, seat)"
                          [class.cursor-pointer]="seat && !panoramaDisabled(cell, seat)"
                          [class.cursor-not-allowed]="panoramaDisabled(cell, seat)"
                          [class.hover:scale-110]="seat && !panoramaDisabled(cell, seat)"
                          [title]="panoramaTooltip(cell, seat)">
                  </button>
                }
              }
            </div>
          </div>
          <div class="flex flex-wrap items-center justify-center gap-4 mt-5 text-[10px] font-bold text-zinc-400">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-green-700"></span> Available</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-violet-600"></span> Your hold</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-zinc-600"></span> Held</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-red-800"></span> Sold</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-zinc-700"></span> Aisle</span>
          </div>

          @if (hasSelection()) {
            <div class="mt-6 flex flex-col gap-4 border-t border-zinc-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-sm font-bold text-zinc-300">
                <span class="text-white font-black">{{ selectedCount() }} seat{{ selectedCount() > 1 ? 's' : '' }}</span> selected
              </p>
              <button
                type="button"
                (click)="goToCheckout()"
                class="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-zinc-900 shadow-lg transition-all hover:bg-zinc-100"
              >
                Proceed to Checkout
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                </svg>
              </button>
            </div>
          }

          @if (!roomAccess()) {
            <button
              type="button"
              (click)="startSeatChoosing()"
              [disabled]="joiningRoom()"
              class="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-900 opacity-0 shadow-lg transition-all duration-200 ease-out group-hover:opacity-100 hover:-translate-y-[52%] hover:scale-[1.03] hover:bg-zinc-100 hover:shadow-xl active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 cursor-pointer"
            >
              {{ joiningRoom() ? 'Đang kiểm tra...' : 'Bắt đầu đặt ghế' }}
            </button>
          }
        </div>
      }
    }
  `,
})
export class SeatMapComponent implements OnInit {
  private readonly seatService = inject(SeatService);
  private readonly wsService = inject(WebSocketService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly queueService = inject(QueueService);

  readonly eventId = input.required<string>();

  readonly zones = signal<SeatMapZone[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  protected readonly currentUserId = computed(() => this.authService.getCurrentUser()?.id ?? null);
  protected readonly hasSelection = signal(false);
  protected readonly selectedCount = signal(0);
  protected readonly roomAccess = signal(false);
  protected readonly joiningRoom = signal(false);
  protected readonly activeUsers = signal(0);
  protected readonly maxActiveUsers = signal(0);
  protected readonly sessionCountdown = signal(0);
  protected readonly sessionTimeLabel = computed(() => {
    const seconds = this.sessionCountdown();
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${rest.toString().padStart(2, '0')}`;
  });

  /** Painted layout from admin localStorage (preferred when present). */
  private readonly storedGrid = signal<PaintGrid | null>(null);
  private storedKeyOrder: string[] = [];
  private sessionTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Panoramic grid + per-zone bbox metadata. Always computed: prefers the
   * admin's painted layout when found, else synthesises a panorama from
   * backend zones using auto-layout so every event gets the same UX.
   */
  private readonly panoramaState = computed<{ grid: PaintGrid; meta: Map<string, ZonePaintMeta> }>(
    () => {
      const zs = this.zones();
      if (zs.length === 0) return { grid: [], meta: new Map() };

      const stored = this.storedGrid();
      if (stored && this.storedKeyOrder.length > 0) {
        return this.buildFromStored(stored);
      }
      return this.buildFromZones(zs);
    },
  );

  protected readonly panorama = computed(() => this.panoramaState().grid);

  protected panoramaSeat(row: number, col: number): Seat | null {
    const grid = this.panorama();
    const cell = grid?.[row]?.[col];
    if (!cell || typeof cell === 'string' || cell.kind !== 'ZONE') return null;
    const meta = this.panoramaState().meta.get(cell.zoneKey);
    if (!meta) return null;
    const zone = this.zones().find(z => z.id === meta.zoneId);
    if (!zone) return null;
    const relRow = row - meta.minRow;
    const relCol = col - meta.minCol;
    return zone.seats.find(s => s.rowIndex === relRow && s.colIndex === relCol) ?? null;
  }

  protected panoramaBg(cell: CellValue, seat: Seat | null): string {
    if (cell === 'STAGE') return '#18181b';
    if (cell === 'BLOCKED') return '#3f3f46';
    if (cell === 'EMPTY') return 'transparent';
    if (!seat) return '#27272a';
    if (seat.status === 'SOLD') return '#7f1d1d';
    if (seat.status === 'LOCKED') {
      return seat.lockedBy === this.currentUserId() ? '#7c3aed' : '#52525b';
    }
    return '#15803d';
  }

  protected panoramaBorder(cell: CellValue, seat: Seat | null): string {
    if (typeof cell === 'string') return 'transparent';
    if (!seat) return 'rgba(0,0,0,0.4)';
    const meta = this.panoramaState().meta.get(cell.zoneKey);
    const zone = meta ? this.zones().find(z => z.id === meta.zoneId) : undefined;
    return zone?.color ?? 'rgba(0,0,0,0.4)';
  }

  protected panoramaDisabled(cell: CellValue, seat: Seat | null): boolean {
    if (!this.roomAccess()) return true;
    if (typeof cell === 'string') return true;
    if (!seat) return true;
    if (seat.status === 'SOLD') return true;
    if (seat.status === 'LOCKED' && seat.lockedBy !== this.currentUserId()) return true;
    return false;
  }

  protected panoramaTooltip(cell: CellValue, seat: Seat | null): string {
    if (cell === 'STAGE') return 'Stage';
    if (cell === 'BLOCKED') return 'Aisle';
    if (cell === 'EMPTY' || !seat || typeof cell === 'string') return '';
    const meta = this.panoramaState().meta.get(cell.zoneKey);
    const zone = meta ? this.zones().find(z => z.id === meta.zoneId) : undefined;
    const price = zone ? ` · ${zone.price.toLocaleString('vi-VN')} ₫` : '';
    if (seat.status === 'SOLD') return `${seat.label} — Sold`;
    if (seat.status === 'LOCKED') {
      return seat.lockedBy === this.currentUserId()
        ? `${seat.label} — Your hold (click to release)`
        : `${seat.label} — Held`;
    }
    return `${zone?.name ?? ''} ${seat.label}${price}`.trim();
  }

  protected onPanoramaClick(seat: Seat | null): void {
    if (!seat) return;
    if (seat.status === 'LOCKED' && seat.lockedBy === this.currentUserId()) {
      this.onReleaseRequest(seat);
    } else if (seat.status === 'AVAILABLE') {
      this.onHoldRequest(seat);
    }
  }

  protected goToCheckout(): void {
    void this.router.navigate(['/checkout']);
  }

  protected startSeatChoosing(): void {
    this.joiningRoom.set(true);
    this.queueService.joinQueue(this.eventId()).subscribe({
      next: status => {
        this.applyRoomStatus(status);
        this.joiningRoom.set(false);
        if (!status.has_access) {
          this.toast.show(status.notice || 'Phòng đặt ghế đang đầy, vui lòng đợi.', 'info');
        }
      },
      error: (err: HttpErrorResponse) => {
        this.joiningRoom.set(false);
        this.toast.error(err.error?.error ?? 'Không thể vào phòng đặt ghế.');
      },
    });
  }

  // ─── Panorama builders ───────────────────────────────────────
  private buildFromStored(grid: PaintGrid) {
    const meta = new Map<string, ZonePaintMeta>();
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (typeof cell === 'string' || cell.kind !== 'ZONE') continue;
        const idx = this.storedKeyOrder.indexOf(cell.zoneKey);
        const zone = this.zones()[idx];
        if (!zone) continue;
        const existing = meta.get(cell.zoneKey);
        if (!existing) {
          meta.set(cell.zoneKey, { zoneId: zone.id, zoneKey: cell.zoneKey, minRow: r, minCol: c });
        } else {
          if (r < existing.minRow) existing.minRow = r;
          if (c < existing.minCol) existing.minCol = c;
        }
      }
    }
    return { grid, meta };
  }

  private buildFromZones(zones: SeatMapZone[]) {
    // Auto-layout each zone as a rectangle, then paint the entire bbox.
    const totalCols = zones.reduce((sum, z) => sum + Math.max(1, z.cols ?? 1), 0);
    const standCols = Math.max(8, Math.min(50, totalCols));
    const layout = computeStandLayout(
      zones.map(z => ({ rows: z.rows, cols: z.cols })),
      standCols,
    );
    // +2 rows of decorative empty space so the stage banner has air above the seats.
    const standRows = layout.standRows;
    let grid: PaintGrid = makeEmptyGrid(standRows, standCols);
    const meta = new Map<string, ZonePaintMeta>();

    layout.zones.forEach((placed, i) => {
      const zone = zones[i];
      const key = zone.id; // Use backend id as zoneKey for synthesised grid.
      meta.set(key, {
        zoneId: zone.id,
        zoneKey: key,
        minRow: placed.startRow,
        minCol: placed.startCol,
      });
      for (let dr = 0; dr < placed.rows; dr++) {
        for (let dc = 0; dc < placed.cols; dc++) {
          grid = setCell(grid, placed.startRow + dr, placed.startCol + dc, {
            kind: 'ZONE',
            zoneKey: key,
          });
        }
      }
    });

    return { grid, meta };
  }

  private loadPaintedLayout(): void {
    const id = this.eventId();
    const grid = loadStandFromStorage(id);
    if (!grid) return;
    const seen = new Set<string>();
    const order: string[] = [];
    for (const row of grid) {
      for (const cell of row) {
        if (typeof cell !== 'string' && cell.kind === 'ZONE' && !seen.has(cell.zoneKey)) {
          seen.add(cell.zoneKey);
          order.push(cell.zoneKey);
        }
      }
    }
    this.storedKeyOrder = order;
    this.storedGrid.set(grid);
  }

  ngOnInit(): void {
    this.seatService.selectedSeats$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(seats => {
        this.hasSelection.set(seats.length > 0);
        this.selectedCount.set(seats.length);
      });

    this.loadSeatMap();
    this.loadRoomStatus();
    this.connectWS();
    this.destroyRef.onDestroy(() => this.stopSessionCountdown());
  }

  private loadRoomStatus(): void {
    this.queueService
      .getQueueStatus(this.eventId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: status => this.applyRoomStatus(status),
        error: () => {
          this.roomAccess.set(false);
        },
      });
  }

  private applyRoomStatus(status: QueueStatus): void {
    this.activeUsers.set(status.active_users);
    this.maxActiveUsers.set(status.max_active_users);
    this.roomAccess.set(status.has_access);
    if (status.has_access && status.session_expires_in != null) {
      this.startSessionCountdown(status.session_expires_in);
    } else {
      this.stopSessionCountdown();
    }
  }

  private startSessionCountdown(seconds: number): void {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    this.sessionCountdown.set(safeSeconds);
    if (this.sessionTimer) clearInterval(this.sessionTimer);

    if (safeSeconds <= 0) {
      this.reloadOnSessionExpired();
      return;
    }

    this.sessionTimer = setInterval(() => {
      const next = this.sessionCountdown() - 1;
      this.sessionCountdown.set(Math.max(0, next));
      if (next <= 0) {
        this.stopSessionCountdown();
        this.reloadOnSessionExpired();
      }
    }, 1000);
  }

  private stopSessionCountdown(): void {
    this.sessionCountdown.set(0);
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  private reloadOnSessionExpired(): void {
    window.location.reload();
  }

  private loadSeatMap(): void {
    this.seatService
      .getSeatMap(this.eventId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          const normalised = data.zones.map(z => ({
            ...z,
            seats: z.seats.map(s => this.normaliseSeat({ ...s, zoneId: z.id })),
          }));
          this.zones.set(normalised);
          this.loadPaintedLayout();
          this.restoreOwnHolds(normalised);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load seat map. Please refresh.');
          this.loading.set(false);
        },
      });
  }

  /**
   * Backend may report a seat as LOCKED while its `lockedUntil` is already
   * in the past (Redis hold expired before the DB row was reconciled).
   * Treat such seats as AVAILABLE on the client.
   */
  private normaliseSeat(seat: Seat): Seat {
    if (seat.status !== 'LOCKED') return seat;
    const until = seat.lockedUntil ? new Date(seat.lockedUntil).getTime() : NaN;
    if (!Number.isFinite(until) || until <= Date.now()) {
      return { ...seat, status: 'AVAILABLE', lockedBy: undefined, lockedUntil: undefined };
    }
    return seat;
  }

  private restoreOwnHolds(zones: SeatMapZone[]): void {
    const userId = this.currentUserId();
    if (!userId) return;
    this.seatService.clearSelected();
    for (const zone of zones) {
      for (const seat of zone.seats) {
        if (seat.status === 'LOCKED' && seat.lockedBy === userId) {
          this.seatService.addSelected(seat);
        }
      }
    }
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
        if (msg.status !== 'LOCKED' || msg.locked_by !== this.currentUserId()) {
          this.seatService.removeSelected(msg.seat_id);
        }
      });
  }

  protected onHoldRequest(seat: Seat): void {
    const userId = this.currentUserId();
    const optimistic: Seat = { ...seat, status: 'LOCKED', lockedBy: userId ?? undefined };
    this.updateLocalSeat(optimistic);

    this.seatService.holdSeat(seat.id, this.eventId()).subscribe({
      next: response => {
        const confirmed: Seat = { ...optimistic, lockedUntil: response.locked_until };
        this.seatService.addSelected(confirmed);
        this.updateLocalSeat(confirmed);
      },
      error: (err: HttpErrorResponse) => {
        this.updateLocalSeat(seat);
        const message = err.error?.error ?? '';
        if (err.status === 409 && message.toLowerCase().includes('queue')) {
          this.roomAccess.set(false);
          this.toast.show('Bạn cần bắt đầu đặt ghế trước.', 'info');
          return;
        }
        this.toast.error(message || 'Could not hold this seat. Please try again.');
      },
    });
  }

  protected onReleaseRequest(seat: Seat): void {
    const optimistic: Seat = { ...seat, status: 'AVAILABLE', lockedBy: undefined, lockedUntil: undefined };
    this.seatService.removeSelected(seat.id);
    this.updateLocalSeat(optimistic);

    this.seatService.releaseSeat(seat.id, this.eventId()).subscribe({
      error: () => {
        this.seatService.addSelected(seat);
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
