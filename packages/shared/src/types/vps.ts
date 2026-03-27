export type VpsStatus = 'pending' | 'connecting' | 'active' | 'unreachable' | 'error';
export type VpsAuthMethod = 'password' | 'key';

export interface VpsServer {
  id: string;
  userId: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: VpsAuthMethod;
  status: VpsStatus;
  provider: string;
  lastHealthCheck: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VpsHealth {
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  diskUsage: number;
  diskTotal: number;
  uptime: number;
}
