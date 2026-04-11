import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, VerifyResult } from '../shared/api.service';

@Component({
  selector: 'app-audit-verify',
  standalone: true,
  imports: [CommonModule, RouterLink],
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

      <div class="card" *ngIf="result; else loading">
        <div style="text-align: center; padding: 2rem">
          <div style="font-size: 3rem; margin-bottom: 0.5rem">
            {{ result.status === 'full' ? '&#9989;' : '&#10060;' }}
          </div>
          <div>
            <span
              class="badge"
              [class.badge-success]="result.status === 'full'"
              [class.badge-danger]="result.status === 'failed'"
              [class.badge-warning]="result.status === 'partial'"
              style="font-size: 1rem; padding: 0.25rem 1rem"
            >
              {{ result.status | uppercase }}
            </span>
          </div>
          <p style="margin-top: 1rem; color: #94a3b8">
            {{ result.checkedRows }} row{{ result.checkedRows !== 1 ? 's' : '' }} verified
          </p>
          <p
            *ngIf="result.firstDivergentSequence !== null"
            style="color: #f87171; margin-top: 0.5rem"
          >
            Chain broken at sequence {{ result.firstDivergentSequence }}
          </p>
        </div>
      </div>

      <ng-template #loading>
        <div class="card" style="text-align: center; padding: 3rem">
          <p style="color: #64748b">{{ error || 'Verifying chain integrity...' }}</p>
        </div>
      </ng-template>

      <button class="btn btn-primary" style="margin-top: 1rem" (click)="verify()">Re-verify</button>
    </div>
  `,
})
export class AuditVerifyComponent implements OnInit {
  result: VerifyResult | null = null;
  error = '';

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.verify();
  }

  verify() {
    this.result = null;
    this.error = '';
    this.api.verifyAuditChain().subscribe({
      next: (data) => (this.result = data),
      error: () => (this.error = 'Failed to verify audit chain.'),
    });
  }
}
