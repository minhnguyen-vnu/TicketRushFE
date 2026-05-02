import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService } from '../../../events/event.service';
import { EventListItem, EventStatus } from '../../../../core/models/event.model';
import { AdminEventService, CreateEventPayload } from '../admin-event.service';
import { ToastService } from '../../../../core/services/toast.service';
import { computeStandLayout } from '../../../../shared/utils/stand-layout';

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
  imports: [ReactiveFormsModule, DatePipe],
})
export class EventFormComponent implements OnInit, OnDestroy {
  readonly step = signal(1);
  readonly isEditMode = signal(false);
  readonly saving = signal(false);
  readonly serverError = signal('');
  readonly selectedTheme = signal('minimal');
  readonly selectedTicketType = signal<'FREE' | 'PAID'>('PAID');
  readonly selectedSeatingType = signal<'ASSIGNED' | 'GENERAL_ADMISSION'>('ASSIGNED');
  readonly zones = signal<ZoneDraft[]>([
    { name: '', rows: 10, cols: 10, price: 0, color: '#6366f1' },
  ]);
  readonly standRows = signal(20);
  readonly standCols = signal(30);

  readonly standLayout = computed(() =>
    computeStandLayout(this.zones(), this.standCols(), this.standRows()),
  );

  private readonly eventService = inject(EventService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminEventService = inject(AdminEventService);
  private readonly toast = inject(ToastService);

  private editingEventId: string | null = null;

  readonly themes: ThemeOption[] = [
    { value: 'minimal',  label: 'Minimal',    bgColor: '#ffffff', textColor: '#18181b', accentColor: '#18181b' },
    { value: 'midnight', label: 'Midnight',   bgColor: '#18181b', textColor: '#ffffff', accentColor: '#6366f1' },
    { value: 'neon',     label: 'Cyber Neon', bgColor: '#1e1b4b', textColor: '#e879f9', accentColor: '#d946ef' },
    { value: 'nature',   label: 'Eco Nature', bgColor: '#ecfdf5', textColor: '#064e3b', accentColor: '#059669' },
  ];

  readonly currentTheme = computed(
    () => this.themes.find(t => t.value === this.selectedTheme()) ?? this.themes[0],
  );

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[a-z0-9-]+$/), Validators.maxLength(100)],
    }),
    startTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    venue: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    bannerUrl: new FormControl('', { nonNullable: true }),
    shortDescription: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    isPrivate: new FormControl(false, { nonNullable: true }),
    status: new FormControl<EventStatus>(EventStatus.DRAFT, { nonNullable: true }),
    theme: new FormControl('minimal', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.isEditMode.set(params['editMode'] === '1');
    });

    const eventId = this.route.snapshot.paramMap.get('id');
    if (eventId) {
      this.editingEventId = eventId;
      this.isEditMode.set(true);
      this.loadEventForEdit(eventId);
    }
  }

  private loadEventForEdit(eventId: string): void {
    const cached = this.eventService.getSelectedEvent();
    if (cached && cached.id === eventId) {
      this.patchFromListItem(cached);
    }
    this.adminEventService.getEvent(eventId).subscribe({
      next: ev => {
        this.form.patchValue({
          title: ev.title,
          slug: ev.slug,
          startTime: this.toDatetimeLocal(ev.startTime),
          endTime: this.toDatetimeLocal(ev.endTime),
          venue: ev.venue,
          bannerUrl: ev.bannerUrl,
          shortDescription: ev.shortDescription,
          description: ev.description,
          isPrivate: ev.isPrivate,
          status: ev.status,
          theme: ev.theme,
        });
        this.selectedTheme.set(ev.theme || 'minimal');
        if (ev.ticketType) this.selectedTicketType.set(ev.ticketType);
        if (ev.seatingType) this.selectedSeatingType.set(ev.seatingType);
        if (ev.zones?.length) {
          this.zones.set(
            ev.zones.map(z => ({
              name: z.name,
              rows: z.rows ?? 10,
              cols: z.cols ?? 10,
              price: z.price,
              color: z.color,
            })),
          );
        }
      },
      error: () => this.toast.error('Failed to load event.'),
    });
  }

  private patchFromListItem(event: EventListItem): void {
    this.form.patchValue({
      title: event.title,
      slug: event.slug,
      startTime: this.toDatetimeLocal(event.start_time),
      endTime: this.toDatetimeLocal(event.end_time),
      venue: event.venue,
      bannerUrl: event.banner_url,
      shortDescription: event.short_description,
      description: event.description,
      isPrivate: event.is_private,
      status: event.status,
      theme: event.theme,
    });
    this.selectedTheme.set(event.theme || 'minimal');
  }

  private toDatetimeLocal(iso: string): string {
    return iso ? iso.substring(0, 16) : '';
  }

  private toIso(localDateTime: string): string {
    if (!localDateTime) return '';
    const d = new Date(localDateTime);
    return isNaN(d.getTime()) ? localDateTime : d.toISOString();
  }

  get f() {
    return this.form.controls;
  }

  isStepValid(step: number): boolean {
    if (step === 1) {
      return ['title', 'slug', 'startTime', 'endTime', 'venue'].every(
        k => this.form.controls[k as keyof typeof this.form.controls].valid,
      );
    }
    if (step === 3) {
      return this.zones().every(
        z => z.name.trim() !== '' && z.rows > 0 && z.cols > 0 && z.price >= 0,
      );
    }
    return true;
  }

  onNext(): void {
    if (this.step() === 1 && !this.isStepValid(1)) {
      Object.values(this.form.controls).forEach(c => c.markAsTouched());
      return;
    }
    if (this.step() < 3) {
      this.step.set(this.step() + 1);
      return;
    }
    this.save();
  }

  onBack(): void {
    if (this.step() > 1) {
      this.step.set(this.step() - 1);
    } else {
      this.router.navigate(['/admin/events']);
    }
  }

  selectTheme(value: string): void {
    this.selectedTheme.set(value);
    this.form.patchValue({ theme: value });
  }

  selectTicketType(value: 'FREE' | 'PAID'): void {
    this.selectedTicketType.set(value);
    if (value === 'FREE') {
      this.zones.update(z => z.map(zone => ({ ...zone, price: 0 })));
    }
  }

  selectSeatingType(value: 'ASSIGNED' | 'GENERAL_ADMISSION'): void {
    this.selectedSeatingType.set(value);
  }

  addZone(): void {
    this.zones.update(z => [
      ...z,
      {
        name: '',
        rows: 10,
        cols: 10,
        price: this.selectedTicketType() === 'FREE' ? 0 : 0,
        color: '#10b981',
      },
    ]);
  }

  setStandRows(value: number): void {
    this.standRows.set(Math.max(1, Math.min(100, value || 1)));
  }

  setStandCols(value: number): void {
    this.standCols.set(Math.max(1, Math.min(100, value || 1)));
  }

  removeZone(index: number): void {
    this.zones.update(z => z.filter((_, i) => i !== index));
  }

  updateZone(index: number, field: keyof ZoneDraft, value: string | number): void {
    this.zones.update(z =>
      z.map((zone, i) => (i === index ? { ...zone, [field]: value } : zone)),
    );
  }

  private buildPayload(): CreateEventPayload {
    const v = this.form.getRawValue();
    return {
      title: v.title,
      slug: v.slug,
      description: v.description,
      short_description: v.shortDescription,
      start_time: this.toIso(v.startTime),
      end_time: this.toIso(v.endTime),
      venue: v.venue,
      banner_url: v.bannerUrl,
      is_private: v.isPrivate,
      theme: v.theme,
      status: v.status,
      categories: [],
      zones: this.zones(),
      seating_type: this.selectedSeatingType(),
      ticket_type: this.selectedTicketType(),
    };
  }

  private save(): void {
    if (!this.isStepValid(3)) {
      this.toast.error('Each zone needs a name, rows, cols and price.');
      return;
    }
    this.saving.set(true);
    this.serverError.set('');
    const payload = this.buildPayload();

    const request$ = this.editingEventId
      ? this.adminEventService.updateEvent(this.editingEventId, payload)
      : this.adminEventService.createEvent(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(this.editingEventId ? 'Event updated.' : 'Event created.');
        this.router.navigate(['/admin/events']);
      },
      error: err => {
        this.saving.set(false);
        const message = err?.error?.error || 'Failed to save event.';
        this.serverError.set(typeof message === 'string' ? message : 'Failed to save event.');
        this.toast.error('Failed to save event.');
      },
    });
  }

  ngOnDestroy(): void {
    this.eventService.resetSelectedEvent();
  }
}
