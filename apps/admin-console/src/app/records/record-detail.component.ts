import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService, RecordResponse } from '../shared/api.service';

@Component({
  selector: 'app-record-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container" style="max-width: 800px">
      <a routerLink="/records" style="font-size: 0.875rem; color: #64748b">&larr; Back to list</a>

      <div *ngIf="record; else loading" style="margin-top: 1rem">
        <h2>Record Detail</h2>

        <div class="card">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem">
            <div>
              <label>Record ID</label>
              <p>
                <code>{{ record.id }}</code>
              </p>
            </div>
            <div>
              <label>Tenant ID</label>
              <p>
                <code>{{ record.tenantId }}</code>
              </p>
            </div>
            <div>
              <label>Owner ID</label>
              <p>
                <code>{{ record.ownerId }}</code>
              </p>
            </div>
            <div>
              <label>Version</label>
              <p>v{{ record.version }}</p>
            </div>
            <div>
              <label>Created</label>
              <p>{{ record.createdAt | date: 'medium' }}</p>
            </div>
            <div>
              <label>Updated</label>
              <p>{{ record.updatedAt | date: 'medium' }}</p>
            </div>
          </div>
        </div>

        <h3 style="margin-top: 1.5rem">Decrypted Payload</h3>
        <div class="card" style="background: #0f172a; border-color: #22c55e">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem">
            <span class="badge badge-success">Decrypted</span>
            <span style="font-size: 0.75rem; color: #64748b">
              AES-256-GCM with AAD binding to record + tenant
            </span>
          </div>
          <pre style="margin: 0; white-space: pre-wrap; font-size: 0.875rem; color: #4ade80">{{
            record.payload | json
          }}</pre>
        </div>
      </div>

      <ng-template #loading>
        <div class="card" style="text-align: center; padding: 3rem">
          <p style="color: #64748b">{{ error || 'Loading...' }}</p>
        </div>
      </ng-template>
    </div>
  `,
})
export class RecordDetailComponent implements OnInit {
  record: RecordResponse | null = null;
  error = '';

  constructor(
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getRecord(id).subscribe({
      next: (record) => (this.record = record),
      error: (err) => (this.error = err.error?.detail ?? 'Record not found.'),
    });
  }
}
