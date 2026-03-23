# PixelByte NIS2 Control Center -- Frontend

Frontend application for the **PixelByte NIS2 Control Center**.\
A modern Angular 21 standalone dashboard for tracking NIS2 compliance
status, controls and audits.

This project is part of the PixelByte ecosystem and focuses on clean
architecture, security-first design and maintainable state management.

------------------------------------------------------------------------

## Tech Stack

-   Angular 21 (Standalone Components)
-   TypeScript (strict mode)
-   Signals (zoneless state management)
-   JWT Authentication (access + refresh tokens)
-   CSRF Protection
-   REST API (NestJS backend)
-   Vite dev server
-   SCSS

------------------------------------------------------------------------

## Features

-   JWT-based authentication with CSRF protection
-   Route protection via `canActivate` guard
-   Automatic token expiry handling
-   Role-based UI (ADMIN / SECURITY / AUDITOR / USER)
-   Secure API communication via HTTP interceptor
-   Modern Angular control flow (`@if`, `@for`)
-   Signal-based UI state (no Zone.js)
-   Controls dashboard with audit timeline
-   Control detail page with evidence management
-   Risk management with create/edit dialog
-   NIS2 readiness scoring dashboard
-   NIS2 information page with official sources
-   Responsive design with mobile navigation
-   Accessible (WCAG AA)

------------------------------------------------------------------------

## Project Structure

    src/
     ├─ app/
     │   ├─ core/
     │   │   ├─ auth/        # AuthService, Guard, Interceptors
     │   │   ├─ api/         # API services (controls, risks, audit, dashboard)
     │   │   └─ layout/      # Header, Footer
     │   ├─ features/
     │   │   ├─ controls/    # Controls list, detail, evidence, audit
     │   │   └─ risks/       # Risk list, detail, create dialog
     │   ├─ pages/
     │   │   ├─ login/       # Login page
     │   │   ├─ dashboard/   # Dashboard page
     │   │   └─ nis2-info/   # NIS2 information page
     │   └─ app.routes.ts
     ├─ environments/
     └─ main.ts

------------------------------------------------------------------------

## Setup

### Requirements

-   Node.js 18+
-   npm 9+

### Install & Run

```bash
npm install
npm start
```

Frontend runs on: `http://localhost:4200`

Backend is expected on: `http://localhost:3000`

API calls are proxied via `/api` (see `proxy.conf.json`).

------------------------------------------------------------------------

## Build

Production build with configured base path:

```bash
ng build --configuration production
```

------------------------------------------------------------------------

## Authentication Flow

-   JWT token is stored in `localStorage`
-   All protected routes use a `canActivate` guard
-   Token expiry is checked using the JWT `exp` claim
-   On invalid or expired token:
    -   User is automatically logged out
    -   Redirected to `/login`
-   HTTP interceptor:
    -   Adds `Authorization: Bearer <token>`
    -   Handles 401 responses globally
-   CSRF token is requested before login

------------------------------------------------------------------------

## Architecture

This frontend uses **Angular Signals** and runs **zoneless** (no `zone.js`).

State updates are handled explicitly via signals:

```ts
state = signal<'loading' | 'ready' | 'error'>('loading');
controls = signal<ControlDto[]>([]);
```

This results in:
- Deterministic rendering
- No hidden change detection
- Full control over UI updates

------------------------------------------------------------------------

## Related Repositories

-   Backend API (NestJS): [pixelbyte-nis2-backend](https://github.com/SvenMichels/pixelbyte-nis2-backend)

------------------------------------------------------------------------

## License

MIT License — free to use, modify and build upon.
