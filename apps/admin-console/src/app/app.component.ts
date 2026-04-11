import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-layout">
      <nav class="sidebar">
        <div class="sidebar-header">
          <h1 class="logo">Vault</h1>
          <span class="logo-sub">Admin Console</span>
        </div>
        <ul class="nav-links">
          <li>
            <a routerLink="/records" routerLinkActive="active">
              <span class="nav-icon">&#128196;</span> Records
            </a>
          </li>
          <li>
            <a routerLink="/audit" routerLinkActive="active">
              <span class="nav-icon">&#128209;</span> Audit Log
            </a>
          </li>
          <li>
            <a routerLink="/audit/verify" routerLinkActive="active">
              <span class="nav-icon">&#9989;</span> Chain Verify
            </a>
          </li>
        </ul>
      </nav>
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .app-layout {
        display: flex;
        min-height: 100vh;
      }
      .sidebar {
        width: 240px;
        background: #1e293b;
        border-right: 1px solid #334155;
        padding: 1.5rem 0;
        flex-shrink: 0;
      }
      .sidebar-header {
        padding: 0 1.5rem 1.5rem;
        border-bottom: 1px solid #334155;
      }
      .logo {
        font-size: 1.5rem;
        font-weight: 700;
        color: #60a5fa;
        margin: 0;
      }
      .logo-sub {
        font-size: 0.75rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .nav-links {
        list-style: none;
        padding: 1rem 0;
        margin: 0;
      }
      .nav-links a {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1.5rem;
        color: #94a3b8;
        text-decoration: none;
        transition: all 0.2s;
      }
      .nav-links a:hover {
        background: rgba(59, 130, 246, 0.1);
        color: #e2e8f0;
        text-decoration: none;
      }
      .nav-links a.active {
        background: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
        border-right: 2px solid #3b82f6;
      }
      .nav-icon {
        font-size: 1.1rem;
      }
      .content {
        flex: 1;
        padding: 2rem;
      }
    `,
  ],
})
export class AppComponent {}
