import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Event as EventModel } from '../../../core/models/event.model';
import { Seat } from '../../../core/models/seat.model';
import { SeatMapZone } from '../../../core/models/seat-map.model';
import { EventService } from '../../events/event.service';
import { HoldTimerComponent } from '../../seat-map/hold-timer/hold-timer.component';
import { SeatService } from '../../seat-map/seat.service';
import { CheckoutService } from '../checkout.service';
import { CurrencyVndPipe } from '../../../shared/pipes/currency-vnd.pipe';

interface ZoneRow {
  zone: SeatMapZone;
  seats: Seat[];
}

@Component({
  selector: 'app-checkout',
  imports: [RouterLink, HoldTimerComponent, CurrencyVndPipe],
  template: `
    <div class="min-h-screen bg-[#fafafa] pt-24 pb-12 px-6">
      <div class="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">

        <!-- ── Left column ── -->
        <div class="flex-1 space-y-8 animate-in slide-in-from-left-8">

          <a routerLink="/" class="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Cancel order
          </a>

          @if (seats().length === 0) {
            <div class="py-20 text-center space-y-4">
              <p class="text-zinc-500 font-bold">No seats selected. Please go back and select seats.</p>
              <a routerLink="/" class="inline-block text-sm font-bold text-indigo-600 hover:underline">Browse events →</a>
            </div>
          } @else {
            <app-hold-timer (expired)="onHoldExpired()" />

            @if (error()) {
              <div class="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-600 font-medium">
                {{ error() }}
              </div>
            }

            @if (step() === 1) {
              <!-- Step 1 — Order review -->
              <div class="space-y-8">
                <h2 class="text-4xl font-black tracking-tighter">Review your order</h2>

                <div class="space-y-4">
                  @for (row of zoneRows(); track row.zone.id) {
                    <div class="p-6 rounded-3xl border-2 border-white bg-white shadow-sm flex items-center justify-between">
                      <div class="flex items-center gap-4">
                        <div class="w-3 h-12 rounded-full" [style.background-color]="row.zone.color"></div>
                        <div>
                          <h3 class="font-black text-xl text-zinc-900">{{ row.zone.name }}</h3>
                          <p class="text-xs font-bold text-zinc-400">
                            {{ row.seats.length }} seat{{ row.seats.length > 1 ? 's' : '' }} ·
                            @for (s of row.seats; track s.id) { {{ s.label }}{{ !$last ? ', ' : '' }} }
                          </p>
                        </div>
                      </div>
                      <div class="text-right">
                        <p class="text-2xl font-black text-zinc-900">{{ row.zone.price * row.seats.length | currencyVnd }}</p>
                        <p class="text-[10px] font-black uppercase text-zinc-400">{{ row.zone.price | currencyVnd }} / seat</p>
                      </div>
                    </div>
                  }
                </div>

                <button
                  (click)="isFreeEvent() ? onConfirm() : step.set(2)"
                  class="w-full py-5 bg-zinc-900 text-white rounded-2xl font-black text-lg hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200"
                >
                  {{ isFreeEvent() ? 'Confirm free ticket' : 'Continue to payment' }}
                </button>
              </div>

            } @else {
              <!-- Step 2 — Payment details (simulated) -->
              <div class="space-y-8">
                <h2 class="text-4xl font-black tracking-tighter">Payment details</h2>

                <div class="bg-white border border-zinc-200 rounded-[32px] p-8 space-y-6">
                  <div class="space-y-2">
                    <label class="text-[10px] font-black uppercase tracking-widest text-zinc-400">Card number</label>
                    <div class="flex items-center gap-4 px-5 py-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <svg class="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                      </svg>
                      <input type="text" placeholder="**** **** **** 4242" class="bg-transparent font-bold outline-none flex-1 text-zinc-900" />
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                      <label class="text-[10px] font-black uppercase tracking-widest text-zinc-400">Expiry date</label>
                      <input type="text" placeholder="MM/YY" class="w-full px-5 py-4 bg-zinc-50 rounded-2xl border border-zinc-100 font-bold outline-none text-zinc-900" />
                    </div>
                    <div class="space-y-2">
                      <label class="text-[10px] font-black uppercase tracking-widest text-zinc-400">CVC</label>
                      <input type="text" placeholder="***" class="w-full px-5 py-4 bg-zinc-50 rounded-2xl border border-zinc-100 font-bold outline-none text-zinc-900" />
                    </div>
                  </div>
                </div>

                <button
                  (click)="onConfirm()"
                  [disabled]="loading()"
                  class="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-3"
                >
                  @if (loading()) {
                    <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Processing…
                  } @else {
                    Pay {{ total() | currencyVnd }}
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                    </svg>
                  }
                </button>

                <button (click)="step.set(1)" class="w-full text-center text-sm font-bold text-zinc-400 hover:text-zinc-700 transition-colors">
                  ← Back to order review
                </button>
              </div>
            }
          }
        </div>

        <!-- ── Right column — sticky summary card ── -->
        <div class="w-full md:w-[350px] shrink-0 animate-in slide-in-from-right-8">
          <div class="bg-white border border-zinc-200 rounded-[40px] overflow-hidden sticky top-28 shadow-2xl">
            <!-- Event banner -->
            <div class="h-40 relative">
              @if (event()) {
                <img [src]="event()!.bannerUrl || ('https://picsum.photos/seed/' + event()!.id + '/700/320')"
                     [alt]="event()!.title"
                     class="w-full h-full object-cover" />
              } @else {
                <div class="w-full h-full bg-zinc-100"></div>
              }
              <div class="absolute inset-0 bg-gradient-to-t from-white to-transparent"></div>
            </div>
            <!-- Summary -->
            <div class="p-8 space-y-6">
              <div>
                <h4 class="text-2xl font-black tracking-tight leading-none mb-2 text-zinc-900">
                  {{ event()?.title ?? 'Loading…' }}
                </h4>
                <p class="text-sm font-bold text-zinc-500">
                  {{ event() ? formatDateTime(event()!.startTime) : '' }}
                </p>
              </div>

              <div class="space-y-3 pt-6 border-t border-zinc-100">
                @for (row of zoneRows(); track row.zone.id) {
                  <div class="flex justify-between text-sm font-medium">
                    <span class="text-zinc-400">{{ row.zone.name }} × {{ row.seats.length }}</span>
                    <span class="text-zinc-900">{{ row.zone.price * row.seats.length | currencyVnd }}</span>
                  </div>
                }
                <div class="flex justify-between items-end pt-4 border-t border-zinc-100">
                  <span class="text-xs font-black uppercase text-zinc-400">Total</span>
                  <span class="text-3xl font-black text-indigo-600">{{ total() | currencyVnd }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
})
export class CheckoutComponent implements OnInit {
  private readonly seatService = inject(SeatService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly seats = signal<Seat[]>([]);
  readonly step = signal(1);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly event = signal<EventModel | null>(null);

  private readonly zoneMap = signal<Map<string, SeatMapZone>>(new Map());

  protected readonly zoneRows = computed<ZoneRow[]>(() => {
    const map = new Map<string, ZoneRow>();
    for (const seat of this.seats()) {
      const zone = this.zoneMap().get(seat.zoneId) ?? {
        id: seat.zoneId, eventId: '', name: 'Zone', rows: null, cols: null,
        price: 0, capacity: 0, color: '#6366f1', seats: [],
      };
      const existing = map.get(seat.zoneId);
      if (existing) {
        existing.seats.push(seat);
      } else {
        map.set(seat.zoneId, { zone, seats: [seat] });
      }
    }
    return Array.from(map.values());
  });

  protected readonly total = computed(() =>
    this.zoneRows().reduce((sum, r) => sum + r.zone.price * r.seats.length, 0),
  );

  protected readonly isFreeEvent = computed(() => this.event()?.ticketType === 'FREE');

  ngOnInit(): void {
    this.seatService.selectedSeats$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(seats => this.seats.set(seats));

    const zones = this.seatService.getCachedZones();
    const map = new Map<string, SeatMapZone>();
    zones.forEach(z => map.set(z.id, z));
    this.zoneMap.set(map);

    const eventId = this.seatService.getCachedEventId();
    if (eventId) {
      this.eventService.getEventById(eventId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: e => this.event.set(e) });
    }
  }

  protected formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  protected onHoldExpired(): void {
    this.seatService.clearSelected();
    this.error.set('Your seat holds have expired. Please go back and select seats again.');
  }

  protected onConfirm(): void {
    const seats = this.seats();
    if (!seats.length) return;

    this.loading.set(true);
    this.error.set('');

    this.checkoutService
      .checkout(this.seatService.getCachedEventId(), seats.map(s => s.id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.seatService.clearSelected();
          this.router.navigate(['/checkout/success']);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Checkout failed. Your holds may have expired. Please try again.');
        },
      });
  }
}
