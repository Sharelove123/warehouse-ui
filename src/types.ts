export type UserRole = 'ADMIN' | 'AUDITOR' | 'TECHNICIAN';

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  date_joined: string;
}

export interface Pallet {
  id: number;
  pallet_number: string;
  barcode: string;
  item_name: string;
  quantity: number;
  status: 'STORED' | 'UNLOADED';
  location_code: string | null;
  loaded_by_username: string | null;
  loaded_at: string;
  unloaded_at: string | null;
}

export interface StorageLocation {
  code: string;
  column: string;
  row: number;
  is_transfer_point: boolean;
  is_occupied: boolean;
  pallet: Pallet | null;
}

export interface WarehouseSummary {
  total_storage: number;
  occupied_count: number;
  free_count: number;
  utilization_pct?: number;
}

export interface WarehouseMapResponse {
  locations: StorageLocation[];
  summary: WarehouseSummary;
  server_time: string;
}

export interface ShuttleStatus {
  identifier: string;
  status: 'IDLE' | 'ACTIVE' | 'CHARGING' | 'MAINTENANCE';
  battery_percentage: number;
  updated_at: string;
}

export interface OccupancySnapshot {
  date: string;
  occupied_count: number;
  free_count: number;
  total_capacity: number;
  note: string;
}

export interface MovementLog {
  id: number;
  action: 'LOAD' | 'UNLOAD';
  pallet_number: string;
  barcode: string;
  item_name: string;
  quantity: number;
  location_code: string;
  performed_by_username: string | null;
  created_at: string;
}

export interface MovementsPagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface MovementsResponse {
  results: MovementLog[];
  pagination: MovementsPagination;
}

export interface AuditorDashboardResponse {
  summary: WarehouseSummary & { utilization_pct: number };
  history_7d: OccupancySnapshot[];
  active_pallets: Pallet[];
  recent_movements: MovementLog[];
  movements_pagination: MovementsPagination;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}
