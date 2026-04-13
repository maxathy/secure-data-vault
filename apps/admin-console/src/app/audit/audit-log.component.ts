import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiService, AuditEntry } from '../shared/api.service';

@Component({
  selector: 'app-audit-log',
  imports: [RouterLink, DatePipe, SlicePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <div
        style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem"
      >
        <h2>Audit Trail</h2>
        <a routerLink="/audit/verify" class="btn btn-primary">Verify Chain</a>
      </div>

      <div class="card">
        @if (entries().length > 0) {
          <table>
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
              @for (entry of entries(); track entry.sequence) {
                <tr>
                  <td>{{ entry.sequence }}</td>
                  <td>{{ entry.timestamp | date: 'short' }}</td>
                  <td>
                    <code>{{ entry.actorId | slice: 0 : 8 }}...</code>
                  </td>
                  <td>
                    <span class="badge badge-success">{{ entry.action }}</span>
                  </td>
                  <td>
                    @if (entry.resourceId) {
                      <code>{{ entry.resourceId | slice: 0 : 8 }}...</code>
                    } @else {
                      <span style="color: #475569">—</span>
                    }
                  </td>
                  <td>
                    <code style="font-size: 0.7rem">{{ entry.entryHash | slice: 0 : 16 }}...</code>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p style="color: #64748b; text-align: center; padding: 2rem">
            No audit entries yet. Create or modify a record to generate entries.
          </p>
        }
      </div>
    </div>
  `,
})
export class AuditLogComponent {
  private readonly api = inject(ApiService);
  readonly entries = toSignal(
    this.api.getAuditEntries().pipe(catchError(() => of([] as AuditEntry[]))),
    { initialValue: [] as AuditEntry[] },
  );
}
