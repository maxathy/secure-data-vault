import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, TenantResponse, UserResponse } from '../shared/api.service';

@Component({
  selector: 'app-record-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container" style="max-width: 600px">
      <h2>Create Encrypted Record</h2>
      <p style="color: #64748b; margin-bottom: 1.5rem">
        The payload will be encrypted at the application layer using AES-256-GCM before being stored
        in the database.
      </p>

      <div class="card">
        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="tenant">Tenant</label>
            <select id="tenant" [(ngModel)]="tenantId" name="tenantId" required>
              <option value="" disabled>Select a tenant</option>
              <option *ngFor="let t of tenants" [value]="t.id">{{ t.name }}</option>
            </select>
          </div>

          <div class="form-group">
            <label for="owner">Owner</label>
            <select id="owner" [(ngModel)]="ownerId" name="ownerId" required>
              <option value="" disabled>Select a user</option>
              <option *ngFor="let u of users" [value]="u.id">{{ u.email }}</option>
            </select>
          </div>

          <div class="form-group">
            <label for="payload">Payload (JSON)</label>
            <textarea
              id="payload"
              [(ngModel)]="payloadJson"
              name="payload"
              rows="6"
              placeholder='{ "notes": "Sensitive data here" }'
              required
            ></textarea>
          </div>

          <div *ngIf="error" style="color: #f87171; margin-bottom: 1rem; font-size: 0.875rem">
            {{ error }}
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="submitting">
            {{ submitting ? 'Encrypting...' : 'Encrypt & Store' }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class RecordCreateComponent implements OnInit {
  tenants: TenantResponse[] = [];
  users: UserResponse[] = [];
  tenantId = '';
  ownerId = '';
  payloadJson = '';
  error = '';
  submitting = false;

  constructor(
    private readonly api: ApiService,
    private readonly router: Router,
  ) {}

  ngOnInit() {
    this.api.getTenants().subscribe((t) => (this.tenants = t));
    this.api.getUsers().subscribe((u) => (this.users = u));
  }

  onSubmit() {
    this.error = '';
    let payload: Record<string, unknown>;

    try {
      payload = JSON.parse(this.payloadJson);
    } catch {
      this.error = 'Invalid JSON payload.';
      return;
    }

    this.submitting = true;
    this.api.createRecord({ tenantId: this.tenantId, ownerId: this.ownerId, payload }).subscribe({
      next: (record) => {
        this.router.navigate(['/records', record.id]);
      },
      error: (err) => {
        this.submitting = false;
        this.error = err.error?.detail ?? 'Failed to create record.';
      },
    });
  }
}
