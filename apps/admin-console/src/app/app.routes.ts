import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'records', pathMatch: 'full' },
  {
    path: 'records',
    loadComponent: () =>
      import('./records/record-list.component').then((m) => m.RecordListComponent),
  },
  {
    path: 'records/new',
    loadComponent: () =>
      import('./records/record-create.component').then((m) => m.RecordCreateComponent),
  },
  {
    path: 'records/:id',
    loadComponent: () =>
      import('./records/record-detail.component').then((m) => m.RecordDetailComponent),
  },
  {
    path: 'audit',
    loadComponent: () => import('./audit/audit-log.component').then((m) => m.AuditLogComponent),
  },
  {
    path: 'audit/verify',
    loadComponent: () =>
      import('./audit/audit-verify.component').then((m) => m.AuditVerifyComponent),
  },
];
