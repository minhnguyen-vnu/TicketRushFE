import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TicketDetailResponse } from '../../core/models/ticket.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { QrCodeDisplayComponent } from '../../shared/components/qr-code-display/qr-code-display.component';
import { CurrencyVndPipe } from '../../shared/pipes/currency-vnd.pipe';
import { TicketService } from './ticket.service';

interface EventGroup {
  eventId: string;
  eventTitle: string;
  eventVenue: string;
  startTime: string;
  bannerUrl: string;
  tickets: TicketDetailResponse[];
}

@Component({
  selector: 'app-my-tickets',
  imports: [RouterLink, LoadingSpinnerComponent, QrCodeDisplayComponent, CurrencyVndPipe],
  template: `
    <div class="min-h-screen bg-[#fafafa] pt-24 pb-12 px-6">
      <div class="max-w-4xl mx-auto space-y-12">

        <h2 class="text-5xl font-black tracking-tighter text-zinc-900">My Tickets</h2>

        @if (loading()) {
          <app-loading-spinner />
        } @else if (error()) {
          <div class="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-600 font-medium">
            {{ error() }}
          </div>
        } @else if (groups().length === 0) {
          <div class="col-span-full py-20 text-center space-y-4">
            <div class="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-300">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
              </svg>
            </div>
            <p class="text-zinc-500 font-bold">You have no tickets yet. Start exploring!</p>
            <a routerLink="/" class="inline-block text-sm font-black text-indigo-600 hover:underline">Browse events →</a>
          </div>
        } @else {
          @for (group of groups(); track group.eventId) {
            <div class="space-y-6">
              <!-- Event group header -->
              <div class="space-y-1">
                <h3 class="text-2xl font-black tracking-tight text-zinc-900">{{ group.eventTitle }}</h3>
                <p class="text-sm font-bold text-zinc-400">{{ formatDate(group.startTime) }} · {{ group.eventVenue }}</p>
              </div>

              <!-- Ticket cards grid -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                @for (ticket of group.tickets; track ticket.ticketId; let i = $index) {
                  <div class="group perspective-1000 animate-in zoom-in" [style.animation-delay]="i * 100 + 'ms'">
                    <div class="bg-white rounded-[40px] overflow-hidden shadow-xl border border-zinc-100 transition-all hover:rotate-2 hover:scale-105">

                      <!-- Event banner -->
                      <div class="h-32 relative">
                        <img
                          [src]="group.bannerUrl || ('https://picsum.photos/seed/' + group.eventId + '/700/280')"
                          [alt]="group.eventTitle"
                          class="w-full h-full object-cover"
                        />
                        <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
                        <div class="absolute inset-0 p-6 flex items-end">
                          <h3 class="text-xl font-black text-white leading-tight">{{ group.eventTitle }}</h3>
                        </div>
                      </div>

                      <!-- Ticket body with torn-edge effect -->
                      <div class="p-8 space-y-6 ticket-cut">
                        <div class="grid grid-cols-2 gap-4">
                          <div>
                            <p class="text-[10px] font-black uppercase text-zinc-400">Date</p>
                            <p class="font-bold text-zinc-900">{{ formatDate(group.startTime) }}</p>
                          </div>
                          <div>
                            <p class="text-[10px] font-black uppercase text-zinc-400">Seat</p>
                            <p class="font-bold text-zinc-900">{{ ticket.seat?.label ?? 'General admission' }}</p>
                          </div>
                          <div>
                            <p class="text-[10px] font-black uppercase text-zinc-400">Zone</p>
                            <div class="flex items-center gap-1.5">
                              <div class="w-2.5 h-2.5 rounded-sm" [style.background-color]="ticket.zone.color"></div>
                              <p class="font-bold text-zinc-900">{{ ticket.zone.name }}</p>
                            </div>
                          </div>
                          <div>
                            <p class="text-[10px] font-black uppercase text-zinc-400">Price</p>
                            <p class="font-bold text-zinc-900">{{ ticket.zone.price | currencyVnd }}</p>
                          </div>
                        </div>

                        <!-- QR code section below dashed divider -->
                        <div class="pt-6 border-t-2 border-dashed border-zinc-100 flex flex-col items-center gap-4">
                          @if (ticket.qrCode) {
                            <app-qr-code-display [base64Image]="ticket.qrCode" />
                          } @else {
                            <div class="w-32 h-32 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-center text-zinc-200">
                              <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                              </svg>
                            </div>
                          }
                          <p class="text-[10px] font-black uppercase text-zinc-300 tracking-[0.2em]">
                            TICKETRUSH-{{ ticket.ticketId.slice(-8).toUpperCase() }}
                          </p>
                        </div>

                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }

      </div>
    </div>
  `,
})
export class MyTicketsComponent implements OnInit {
  private readonly ticketService = inject(TicketService);

  readonly loading = signal(true);
  readonly error = signal('');
  private readonly tickets = signal<TicketDetailResponse[]>([]);

  protected readonly groups = computed<EventGroup[]>(() => {
    const map = new Map<string, EventGroup>();
    for (const t of this.tickets()) {
      const existing = map.get(t.event.id);
      if (existing) {
        existing.tickets.push(t);
      } else {
        map.set(t.event.id, {
          eventId: t.event.id,
          eventTitle: t.event.title,
          eventVenue: t.event.venue,
          startTime: t.event.startTime,
          bannerUrl: t.event.bannerUrl,
          tickets: [t],
        });
      }
    }
    return Array.from(map.values());
  });

  ngOnInit(): void {
    this.ticketService.getMyTickets().subscribe({
      next: tickets => {
        this.tickets.set(tickets);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load tickets. Please refresh.');
        this.loading.set(false);
      },
    });
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }
}
