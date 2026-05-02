/** snake_case — from GET /api/admin/demographics/:event_id */
export interface DemographicsData {
  event_id: string;
  age_distribution: Record<string, number>;
  gender_distribution: Record<string, number>;
}
