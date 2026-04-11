import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, RecordResponse } from '../shared/api.service';

@Component({
  selector: 'app-record-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      <div
        style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem"
      >
        <h2>Encrypted Records</h2>
        <a routerLink="/records/new" class="btn btn-primary">+ Create Record</a>
      </div>

      <div class="card">
        <table *ngIf="records.length > 0; else empty">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tenant</th>
              <th>Version</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let record of records">
              <td>
                <code>{{ record.id | slice: 0 : 8 }}...</code>
              </td>
              <td>
                <code>{{ record.tenantId | slice: 0 : 8 }}...</code>
              </td>
              <td>v{{ record.version }}</td>
              <td>{{ record.createdAt | date: 'short' }}</td>
              <td>
                <a
                  [routerLink]="['/records', record.id]"
                  class="btn btn-primary"
                  style="padding: 0.25rem 0.75rem; font-size: 0.75rem"
                >
                  View
                </a>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty>
          <p style="color: #64748b; text-align: center; padding: 2rem">
            No records found. Create one to see envelope encryption in action.
          </p>
        </ng-template>
      </div>
    </div>
  `,
})
export class RecordListComponent implements OnInit {
  records: RecordResponse[] = [];

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.api.getRecords().subscribe({
      next: (data) => (this.records = data),
      error: () => (this.records = []),
    });
  }
}
