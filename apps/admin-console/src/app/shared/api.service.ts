import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_BASE = '/api/v1';

export interface TenantResponse {
  id: string;
  name: string;
  createdAt: string;
}

export interface UserResponse {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface RecordResponse {
  id: string;
  tenantId: string;
  ownerId: string;
  payload: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  sequence: string;
  timestamp: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  entryHash: string;
  prevHash: string;
  signature: string;
}

export interface VerifyResult {
  status: 'full' | 'partial' | 'failed';
  checkedRows: number;
  firstDivergentSequence: number | null;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  // Tenants
  getTenants(): Observable<TenantResponse[]> {
    return this.http.get<TenantResponse[]>(`${API_BASE}/tenants`);
  }

  createTenant(name: string): Observable<TenantResponse> {
    return this.http.post<TenantResponse>(`${API_BASE}/tenants`, { name });
  }

  // Users
  getUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${API_BASE}/users`);
  }

  // Records
  getRecords(): Observable<RecordResponse[]> {
    return this.http.get<RecordResponse[]>(`${API_BASE}/records`);
  }

  getRecord(id: string): Observable<RecordResponse> {
    return this.http.get<RecordResponse>(`${API_BASE}/records/${id}`);
  }

  createRecord(data: {
    tenantId: string;
    ownerId: string;
    payload: Record<string, unknown>;
  }): Observable<RecordResponse> {
    return this.http.post<RecordResponse>(`${API_BASE}/records`, data);
  }

  // Audit
  getAuditEntries(): Observable<AuditEntry[]> {
    return this.http.get<AuditEntry[]>(`${API_BASE}/audit`);
  }

  verifyAuditChain(): Observable<VerifyResult> {
    return this.http.get<VerifyResult>(`${API_BASE}/audit/verify`);
  }
}
