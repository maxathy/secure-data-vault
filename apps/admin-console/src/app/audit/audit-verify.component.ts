import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, VerifyResult } from '../shared/api.service';

@Component({
  selector: 'app-audit-verify',
  imports: [RouterLink, UpperCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container" style="max-width: 600px">
      <a routerLink="/audit" style="font-size: 0.875rem; color: #64748b"
        >&larr; Back to audit log</a
      >

      <h2 style="margin-top: 1rem">Audit Chain Verification</h2>
      <p style="color: #64748b; margin-bottom: 1.5rem">
        Walks every audit log entry and verifies hash linkage, entry hashes, sequence continuity,
        and HMAC signatures.
      </p>

      @if (result(); as r) {
        <div class="card">
          <div style="text-align: center; padding: 2rem">
            <div style="font-size: 3rem; margin-bottom: 0.5rem">
              {{ r.status === 'full' ? '&#9989;' : '&#10060;' }}
            </div>
            <div>
              <span
                class="badge"
                [class.badge-success]="r.status === 'full'"
                [class.badge-danger]="r.status === 'failed'"
                [class.badge-warning]="r.status === 'partial'"
                style="font-size: 1rem; padding: 0.25rem 1rem"
              >
                {{ r.status | uppercase }}
              </span>
            </div>
            <p style="margin-top: 1rem; color: #94a3b8">
              {{ r.checkedRows }} row{{ r.checkedRows !== 1 ? 's' : '' }} verified
            </p>
            @if (r.firstDivergentSequence !== null) {
              <p style="color: #f87171; margin-top: 0.5rem">
                Chain broken at sequence {{ r.firstDivergentSequence }}
              </p>
            }
          </div>
        </div>
      } @else {
        <div class="card" style="text-align: center; padding: 3rem">
          <p style="color: #64748b">{{ error() || 'Verifying chain integrity...' }}</p>
        </div>
      }

      <button class="btn btn-primary" style="margin-top: 1rem" (click)="verify()">Re-verify</button>
    </div>
  `,
})
export class AuditVerifyComponent {
  private readonly api = inject(ApiService);

  readonly result = signal<VerifyResult | null>(null);
  readonly error = signal('');

  constructor() {
    this.verify();
  }

  verify() {
    this.result.set(null);
    this.error.set('');
    this.api.verifyAuditChain().subscribe({
      next: (data) => this.result.set(data),
      error: () => this.error.set('Failed to verify audit chain.'),
    });
  }
}
