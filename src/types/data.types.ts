export interface DataPoint {
  id: string;
  type: string;
  value: number;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface DataStats {
  total_points: number;
  avg_value: number;
  min_value: number;
  max_value: number;
  data_by_type: Record<string, number>;
}

export interface ProcessDataJob {
  data: DataPoint[];
  batch_id: string;
  priority: number;
}
