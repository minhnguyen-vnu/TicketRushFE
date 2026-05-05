import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

export interface RecommendationItem {
  event_id: string;
  title: string;
  score: number;
  reasons: string[];
}

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly api = inject(ApiService);

  getMyRecommendations(): Observable<RecommendationItem[]> {
    return this.api.get<RecommendationItem[]>('/api/recommendations/me');
  }
}
