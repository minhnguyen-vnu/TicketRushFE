import { Component, input } from '@angular/core';

@Component({
  selector: 'app-qr-code-display',
  template: `
    <img [src]="'data:image/png;base64,' + base64Image()"
         alt="QR Code"
         class="w-40 h-40 object-contain rounded-lg border border-zinc-200" />
  `,
})
export class QrCodeDisplayComponent {
  readonly base64Image = input.required<string>();
}
