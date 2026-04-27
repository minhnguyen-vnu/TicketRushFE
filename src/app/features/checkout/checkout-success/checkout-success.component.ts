import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CheckoutResponse } from '../../../core/models/checkout.model';
import { QrCodeDisplayComponent } from '../../../shared/components/qr-code-display/qr-code-display.component';
import { CurrencyVndPipe } from '../../../shared/pipes/currency-vnd.pipe';
import { CheckoutService } from '../checkout.service';

@Component({
  selector: 'app-checkout-success',
  imports: [RouterLink, QrCodeDisplayComponent, CurrencyVndPipe],
  template: `
    <div class="min-h-screen bg-[#fafafa] pt-24 pb-12 px-6">
      <div class="max-w-2xl mx-auto space-y-12 animate-in zoom-in">

        <!-- Header -->
        <div class="text-center space-y-4">
          <div class="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
            <svg class="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 class="text-5xl font-black tracking-tighter text-zinc-900">Payment confirmed!</h1>
          @if (result()) {
            <p class="text-zinc-500 font-medium">
              Order #{{ result()!.orderId.slice(0, 8).toUpperCase() }} ·
              Total <span class="font-black text-zinc-900">{{ result()!.totalAmount | currencyVnd }}</span>
            </p>
          }
        </div>

        @if (result()) {
          <!-- Ticket cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
            @for (ticket of result()!.tickets; track ticket.ticketId; let i = $index) {
              <div class="group perspective-1000 animate-in zoom-in" [style.animation-delay]="i * 100 + 'ms'">
                <div class="bg-white rounded-[40px] overflow-hidden shadow-xl border border-zinc-100 transition-all hover:rotate-2 hover:scale-105">

                  <!-- Banner placeholder (no event image at this level) -->
                  <div class="h-20 bg-gradient-to-br from-indigo-500 to-violet-600 relative">
                    <div class="absolute inset-0 p-5 flex items-end">
                      <p class="text-xs font-black uppercase tracking-widest text-white/80">Your ticket</p>
                    </div>
                  </div>

                  <!-- Body with ticket-cut notch -->
                  <div class="p-8 space-y-6 ticket-cut">
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <p class="text-[10px] font-black uppercase text-zinc-400">Ticket ID</p>
                        <p class="font-bold text-zinc-900 text-sm">{{ ticket.ticketId.slice(0, 8).toUpperCase() }}</p>
                      </div>
                      <div>
                        <p class="text-[10px] font-black uppercase text-zinc-400">Status</p>
                        <p class="font-bold text-emerald-600 text-sm">{{ ticket.status }}</p>
                      </div>
                    </div>

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

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row gap-4 pt-4">
            <a
              routerLink="/my-tickets"
              class="flex-1 text-center py-4 bg-zinc-900 text-white rounded-2xl font-black text-base hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200"
            >
              View all my tickets
            </a>
            <a
              routerLink="/"
              class="flex-1 text-center py-4 bg-zinc-100 text-zinc-900 rounded-2xl font-black text-base hover:bg-zinc-200 transition-all"
            >
              Browse more events
            </a>
          </div>

        } @else {
          <div class="py-20 text-center space-y-4">
            <p class="text-zinc-500 font-bold">No order data found.</p>
            <a routerLink="/" class="inline-block text-sm font-bold text-indigo-600 hover:underline">← Back to events</a>
          </div>
        }

      </div>
    </div>
  `,
})
export class CheckoutSuccessComponent implements OnInit {
  private readonly checkoutService = inject(CheckoutService);
  private readonly router = inject(Router);

  readonly result = signal<CheckoutResponse | null>(null);

  ngOnInit(): void {
    const res = this.checkoutService.getLastResult();
    if (!res) {
      this.router.navigate(['/my-tickets']);
      return;
    }
    this.result.set(res);
    this.checkoutService.clearResult();
  }
}
