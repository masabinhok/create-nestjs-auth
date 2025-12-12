export type HealthServiceStatus = 'healthy' | 'unhealthy';
export type HealthOverallStatus = 'ok' | 'error';

export interface ServiceHealth {
  status: HealthServiceStatus;
  type?: string;
  details?: Record<string, unknown>;
}

export interface HealthResponse {
  status: HealthOverallStatus;
  timestamp: string;
  services: Record<string, ServiceHealth>;
}
