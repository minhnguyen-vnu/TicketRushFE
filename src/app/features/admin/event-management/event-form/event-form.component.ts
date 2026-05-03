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
import {
  CellTool,
  CellValue,
  PaintGrid,
  computeZoneStats,
  isZoneCell,
  loadStandFromStorage,
  makeEmptyGrid,
  resizeGrid,
  saveStandToStorage,
  setCell,
} from '../../../../shared/utils/stand-paint';

interface ThemeOption {
  value: string;
  label: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

interface ZoneDraft {
  key: string;
  name: string;
  price: number;
  color: string;
}

type ToolKey = 'EMPTY' | 'STAGE' | 'BLOCKED' | string; // string = zone key

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

  readonly standRows = signal(12);
  readonly standCols = signal(20);
  readonly grid = signal<PaintGrid>(makeEmptyGrid(12, 20));

  readonly zones = signal<ZoneDraft[]>([
    { key: this.makeKey(), name: 'VIP', price: 500000, color: '#6366f1' },
    { key: this.makeKey(), name: 'Standard', price: 200000, color: '#10b981' },
  ]);

  readonly currentTool = signal<ToolKey>(this.zones()[0].key);
  readonly isPainting = signal(false);

  readonly zoneStats = computed(() =>
    computeZoneStats(
      this.grid(),
      this.zones().map(z => z.key),
    ),
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

  private makeKey(): string {
    return 'z_' + Math.random().toString(36).slice(2, 9);
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
          const drafts = ev.zones.map(z => ({
            key: this.makeKey(),
            name: z.name,
            price: z.price,
            color: z.color,
          }));
          this.zones.set(drafts);
          this.currentTool.set(drafts[0].key);

          const stored = loadStandFromStorage(eventId);
          if (stored) {
            this.standRows.set(stored.length);
            this.standCols.set(stored[0]?.length ?? 0);
            this.grid.set(stored);
          } else {
            // Fallback: paint each zone as a rectangle from its rows×cols.
            this.seedGridFromRectangles(ev.zones, drafts);
          }
        }
      },
      error: () => this.toast.error('Failed to load event.'),
    });
  }

  private seedGridFromRectangles(
    apiZones: { rows: number | null; cols: number | null }[],
    drafts: ZoneDraft[],
  ): void {
    const totalRows = Math.max(
      8,
      apiZones.reduce((m, z) => Math.max(m, z.rows ?? 0), 0) + 2,
    );
    const totalCols = Math.max(
      12,
      apiZones.reduce((sum, z) => sum + (z.cols ?? 0), 0),
    );
    this.standRows.set(totalRows);
    this.standCols.set(totalCols);
    let g = makeEmptyGrid(totalRows, totalCols);

    let cursorCol = 0;
    apiZones.forEach((z, i) => {
      const r = z.rows ?? 0;
      const c = z.cols ?? 0;
      const draft = drafts[i];
      for (let dr = 0; dr < r; dr++) {
        for (let dc = 0; dc < c; dc++) {
          g = setCell(g, dr + 1, cursorCol + dc, { kind: 'ZONE', zoneKey: draft.key });
        }
      }
      cursorCol += c;
    });
    this.grid.set(g);
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
      const drafts = this.zones();
      if (drafts.some(z => z.name.trim() === '' || z.price < 0)) return false;
      const stats = this.zoneStats();
      // Every zone tool must have at least one painted cell.
      return drafts.every(d => (stats.get(d.key)?.cellCount ?? 0) > 0);
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

  // ─── Stand size ──────────────────────────────────────────────
  setStandRows(value: number): void {
    const next = Math.max(1, Math.min(40, value || 1));
    this.standRows.set(next);
    this.grid.update(g => resizeGrid(g, next, this.standCols()));
  }

  setStandCols(value: number): void {
    const next = Math.max(1, Math.min(40, value || 1));
    this.standCols.set(next);
    this.grid.update(g => resizeGrid(g, this.standRows(), next));
  }

  // ─── Zone tools ──────────────────────────────────────────────
  addZone(): void {
    const palette = ['#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#a855f7'];
    const next: ZoneDraft = {
      key: this.makeKey(),
      name: '',
      price: this.selectedTicketType() === 'FREE' ? 0 : 0,
      color: palette[this.zones().length % palette.length],
    };
    this.zones.update(z => [...z, next]);
    this.currentTool.set(next.key);
  }

  removeZone(key: string): void {
    if (this.zones().length <= 1) return;
    // Erase any painted cells belonging to this zone.
    this.grid.update(g =>
      g.map(row =>
        row.map<CellValue>(cell => (isZoneCell(cell, key) ? 'EMPTY' : cell)),
      ),
    );
    this.zones.update(z => z.filter(zone => zone.key !== key));
    if (this.currentTool() === key) {
      this.currentTool.set(this.zones()[0].key);
    }
  }

  updateZone(key: string, field: 'name' | 'price' | 'color', value: string | number): void {
    this.zones.update(z =>
      z.map(zone => (zone.key === key ? { ...zone, [field]: value } : zone)),
    );
  }

  selectTool(tool: ToolKey): void {
    this.currentTool.set(tool);
  }

  // ─── Painting interaction ────────────────────────────────────
  onCellDown(row: number, col: number): void {
    this.isPainting.set(true);
    this.paintCell(row, col);
  }

  onCellEnter(row: number, col: number): void {
    if (this.isPainting()) this.paintCell(row, col);
  }

  onCellUp(): void {
    this.isPainting.set(false);
  }

  private paintCell(row: number, col: number): void {
    const tool = this.currentTool();
    const value = this.toolToCell(tool);
    this.grid.update(g => setCell(g, row, col, value));
  }

  private toolToCell(tool: ToolKey): CellValue {
    if (tool === 'EMPTY' || tool === 'STAGE' || tool === 'BLOCKED') return tool as CellTool;
    return { kind: 'ZONE', zoneKey: tool };
  }

  // Template helpers
  cellColor(cell: CellValue): string {
    if (cell === 'EMPTY') return '#fafafa';
    if (cell === 'STAGE') return '#18181b';
    if (cell === 'BLOCKED') return '#d4d4d8';
    const zone = this.zones().find(z => z.key === cell.zoneKey);
    return zone?.color ?? '#9ca3af';
  }

  cellGlyph(cell: CellValue): 'stage' | 'seat' | 'blocked' | '' {
    if (cell === 'STAGE') return 'stage';
    if (cell === 'BLOCKED') return 'blocked';
    if (cell === 'EMPTY') return '';
    return 'seat';
  }

  isToolActive(tool: ToolKey): boolean {
    return this.currentTool() === tool;
  }

  zoneCellCount(key: string): number {
    return this.zoneStats().get(key)?.cellCount ?? 0;
  }

  // ─── Save ────────────────────────────────────────────────────
  private buildPayload(): CreateEventPayload {
    const v = this.form.getRawValue();
    const stats = this.zoneStats();

    const zonesPayload = this.zones().map(z => {
      const stat = stats.get(z.key);
      const rows = stat?.bboxRows || 1;
      const cols = stat?.bboxCols || 1;
      return {
        name: z.name,
        rows,
        cols,
        price: z.price,
        color: z.color,
      };
    });

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
      zones: zonesPayload,
      seating_type: this.selectedSeatingType(),
      ticket_type: this.selectedTicketType(),
    };
  }

  private save(): void {
    if (!this.isStepValid(3)) {
      this.toast.error('Each zone needs a name and at least one painted cell.');
      return;
    }
    this.saving.set(true);
    this.serverError.set('');
    const payload = this.buildPayload();

    const request$ = this.editingEventId
      ? this.adminEventService.updateEvent(this.editingEventId, payload)
      : this.adminEventService.createEvent(payload);

    request$.subscribe({
      next: created => {
        this.saving.set(false);
        // Persist painted layout against the resulting event id (or slug fallback)
        // so the customer-facing seat map can render the same overview.
        const key = this.editingEventId ?? created?.id ?? payload.slug ?? '';
        if (key) {
          saveStandToStorage(key, this.grid());
          // Also store a slug-keyed copy when creating, in case the id arrives
          // back as a different identifier on first read.
          if (!this.editingEventId && payload.slug) {
            saveStandToStorage(payload.slug, this.grid());
          }
        }
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
