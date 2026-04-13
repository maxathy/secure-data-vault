import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe, JsonPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, tap } from 'rxjs';
import { ApiService, RecordResponse } from '../shared/api.service';

@Component({
  selector: 'app-record-detail',
  imports: [RouterLink, DatePipe, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container" style="max-width: 800px">
      <a routerLink="/records" style="font-size: 0.875rem; color: #64748b">&larr; Back to list</a>

      @if (record(); as r) {
        <div style="margin-top: 1rem">
          <h2>Record Detail</h2>

          <div class="card">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem">
              <div>
                <label>Record ID</label>
                <p>
                  <code>{{ r.id }}</code>
                </p>
              </div>
              <div>
                <label>Tenant ID</label>
                <p>
                  <code>{{ r.tenantId }}</code>
                </p>
              </div>
              <div>
                <label>Owner ID</label>
                <p>
                  <code>{{ r.ownerId }}</code>
                </p>
              </div>
              <div>
                <label>Version</label>
                <p>v{{ r.version }}</p>
              </div>
              <div>
                <label>Created</label>
                <p>{{ r.createdAt | date: 'medium' }}</p>
              </div>
              <div>
                <label>Updated</label>
                <p>{{ r.updatedAt | date: 'medium' }}</p>
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
              r.payload | json
            }}</pre>
          </div>
        </div>
      } @else {
        <div class="card" style="text-align: center; padding: 3rem">
          <p style="color: #64748b">{{ error() || 'Loading...' }}</p>
        </div>
      }
    </div>
  `,
})
export class RecordDetailComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  readonly error = signal('');
  readonly record = toSignal(
    this.api.getRecord(this.route.snapshot.paramMap.get('id')!).pipe(
      tap({
        error: (err) => this.error.set(err?.error?.detail ?? 'Record not found.'),
      }),
      catchError(() => of(null)),
    ),
    { initialValue: null as RecordResponse | null },
  );
}
