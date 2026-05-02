import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventListItem } from '../../../core/models/event.model';
import { DemographicsData } from '../../../core/models/demographics.model';
import { AdminEventService } from '../event-management/admin-event.service';
import { ToastService } from '../../../core/services/toast.service';
import { DemographicsService } from './demographics.service';

interface BarItem {
  label: string;
  count: number;
  percent: number;
}

interface SliceItem {
  label: string;
  count: number;
  percent: number;
  color: string;
  offset: number;
}

const AGE_BUCKETS = ['<18', '18-25', '26-35', '36-50', '50+'];
const GENDER_LABELS: Record<string, string> = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' };
const GENDER_COLORS: Record<string, string> = {
  MALE: '#6366f1',
  FEMALE: '#ec4899',
  OTHER: '#10b981',
};

@Component({
  selector: 'app-demographics',
  templateUrl: './demographics.component.html',
  imports: [RouterLink],
})
export class DemographicsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminEventService = inject(AdminEventService);
  private readonly demographicsService = inject(DemographicsService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly events = signal<EventListItem[]>([]);
  readonly selectedEventId = signal('');
  readonly data = signal<DemographicsData | null>(null);

  readonly totalBuyers = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return Object.values(d.gender_distribution).reduce((a, b) => a + b, 0);
  });

  readonly ageBars = computed<BarItem[]>(() => {
    const d = this.data();
    if (!d) return [];
    const total = Object.values(d.age_distribution).reduce((a, b) => a + b, 0) || 1;
    return AGE_BUCKETS.map(bucket => {
      const count = d.age_distribution[bucket] ?? 0;
      return { label: bucket, count, percent: Math.round((count / total) * 100) };
    });
  });

  readonly genderSlices = computed<SliceItem[]>(() => {
    const d = this.data();
    if (!d) return [];
    const entries = Object.entries(d.gender_distribution);
    const total = entries.reduce((a, [, n]) => a + n, 0) || 1;
    let offset = 0;
    return entries.map(([key, count]) => {
      const percent = Math.round((count / total) * 100);
      const slice: SliceItem = {
        label: GENDER_LABELS[key] ?? key,
        count,
        percent,
        color: GENDER_COLORS[key] ?? '#a1a1aa',
        offset,
      };
      offset += (count / total) * 100;
      return slice;
    });
  });

  buildConicGradient(): string {
    const slices = this.genderSlices();
    if (slices.length === 0) return '#e4e4e7 0% 100%';
    const stops: string[] = [];
    let acc = 0;
    for (const slice of slices) {
      const start = acc;
      const end = acc + slice.percent;
      stops.push(`${slice.color} ${start}% ${end}%`);
      acc = end;
    }
    return stops.join(', ');
  }

  ngOnInit(): void {
    this.adminEventService.getEvents().subscribe({
      next: events => {
        this.events.set(events);
        const routeEventId = this.route.snapshot.paramMap.get('id');
        if (routeEventId) {
          this.onEventChange(routeEventId);
        }
      },
      error: () => this.toast.error('Failed to load events.'),
    });
  }

  onEventChange(eventId: string): void {
    this.selectedEventId.set(eventId);
    this.data.set(null);
    if (!eventId) return;
    this.router.navigate(['/admin/events', eventId, 'demographics']);
    this.loading.set(true);
    this.demographicsService.getDemographics(eventId).subscribe({
      next: result => {
        this.data.set(result);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load demographics.');
      },
    });
  }
}
