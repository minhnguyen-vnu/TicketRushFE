import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface ThemeOption {
  value: string;
  label: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

interface ZoneDraft {
  name: string;
  rows: number;
  cols: number;
  price: number;
  color: string;
}

@Component({
  selector: 'app-event-form',
  templateUrl: './event-form.component.html',
  imports: [RouterLink, ReactiveFormsModule, DatePipe],
})
export class EventFormComponent {
  readonly step = signal(1);
  readonly isEditMode = signal(false);
  readonly saving = signal(false);
  readonly serverError = signal('');
  readonly selectedTheme = signal('minimal');
  readonly zones = signal<ZoneDraft[]>([{ name: '', rows: 10, cols: 10, price: 0, color: '#6366f1' }]);

  readonly themes: ThemeOption[] = [
    { value: 'minimal',  label: 'Minimal',    bgColor: '#ffffff', textColor: '#18181b', accentColor: '#18181b' },
    { value: 'midnight', label: 'Midnight',   bgColor: '#18181b', textColor: '#ffffff', accentColor: '#6366f1' },
    { value: 'neon',     label: 'Cyber Neon', bgColor: '#1e1b4b', textColor: '#e879f9', accentColor: '#d946ef' },
    { value: 'nature',   label: 'Eco Nature', bgColor: '#ecfdf5', textColor: '#064e3b', accentColor: '#059669' },
  ];

  readonly currentTheme = computed(() =>
    this.themes.find(t => t.value === this.selectedTheme()) ?? this.themes[0],
  );

  readonly form = new FormGroup({
    title:            new FormControl(''),
    slug:             new FormControl(''),
    startTime:        new FormControl(''),
    endTime:          new FormControl(''),
    venue:            new FormControl(''),
    bannerUrl:        new FormControl(''),
    shortDescription: new FormControl(''),
    description:      new FormControl(''),
    isPrivate:        new FormControl(false),
    status:           new FormControl('DRAFT'),
    theme:            new FormControl('minimal'),
  });

  get f() { return this.form.controls; }

  onNext(): void {}

  selectTheme(value: string): void { this.selectedTheme.set(value); }

  addZone(): void {
    this.zones.update(z => [...z, { name: '', rows: 10, cols: 10, price: 0, color: '#10b981' }]);
  }

  removeZone(index: number): void {
    this.zones.update(z => z.filter((_, i) => i !== index));
  }

  updateZone(index: number, field: keyof ZoneDraft, value: string | number): void {
    this.zones.update(z => z.map((zone, i) => i === index ? { ...zone, [field]: value } : zone));
  }
}
