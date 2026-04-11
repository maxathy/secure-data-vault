import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, AuditEntry } from '../shared/api.service';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      <div
        style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem"
      >
        <h2>Audit Trail</h2>
        <a routerLink="/audit/verify" class="btn btn-primary">Verify Chain</a>
      </div>

      <div class="card">
        <table *ngIf="entries.length > 0; else empty">
          <thead>
            <tr>
              <th>Seq</th>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Hash</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let entry of entries">
              <td>{{ entry.sequence }}</td>
              <td>{{ entry.timestamp | date: 'short' }}</td>
              <td>
                <code>{{ entry.actorId | slice: 0 : 8 }}...</code>
              </td>
              <td>
                <span class="badge badge-success">{{ entry.action }}</span>
              </td>
              <td>
                <code *ngIf="entry.resourceId">{{ entry.resourceId | slice: 0 : 8 }}...</code>
                <span *ngIf="!entry.resourceId" style="color: #475569">—</span>
              </td>
              <td>
                <code style="font-size: 0.7rem">{{ entry.entryHash | slice: 0 : 16 }}...</code>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty>
          <p style="color: #64748b; text-align: center; padding: 2rem">
            No audit entries yet. Create or modify a record to generate entries.
          </p>
        </ng-template>
      </div>
    </div>
  `,
})
export class AuditLogComponent implements OnInit {
  entries: AuditEntry[] = [];

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.api.getAuditEntries().subscribe({
      next: (data) => (this.entries = data),
      error: () => (this.entries = []),
    });
  }
}
