import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { DemographicsData } from '../../../core/models/demographics.model';

@Injectable({ providedIn: 'root' })
export class DemographicsService {
  private readonly api = inject(ApiService);

  getDemographics(eventId: string): Observable<DemographicsData> {
    return this.api.get<DemographicsData>(`/api/admin/demographics/${eventId}`);
  }
}
