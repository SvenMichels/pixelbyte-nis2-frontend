# PixelByte NIS2 Control Center -- Frontend

Frontend application for the **PixelByte NIS2 Control Center**.\
A modern Angular 21 standalone dashboard for tracking NIS2 compliance
status, controls and audits.

This project is part of the PixelByte ecosystem and focuses on clean
architecture, security-first design and maintainable state management.

------------------------------------------------------------------------

## Tech Stack

-   Angular 21 (Standalone Components)
-   TypeScript
-   Signals (zoneless state management)
-   JWT Authentication
-   REST API (NestJS backend)
-   Vite dev server

------------------------------------------------------------------------

## Features

-   JWT-based authentication
-   Route protection via `canActivate` guard
-   Automatic token expiry handling
-   Secure API communication via HTTP interceptor
-   Modern Angular control flow (`@if`, `@for`)
-   Signal-based UI state (no Zone.js)
-   Controls dashboard with audit timeline

------------------------------------------------------------------------

## Project Structure (simplified)

    src/
     ├─ app/
     │   ├─ core/
     │   │   ├─ auth/        # AuthService, Guard, Interceptor
     │   │   └─ api/         # API services
     │   ├─ features/
     │   │   └─ controls/    # NIS2 Controls UI
     │   ├─ pages/
     │   │   └─ login/       # Login page
     │   └─ app.routes.ts
     └─ main.ts

------------------------------------------------------------------------

## Setup

### Requirements

-   Node.js 18+
-   npm 9+

### Install & Run

``` bash
npm install
npm start
```

Frontend runs on:

    http://localhost:4200

Backend is expected on:

    http://localhost:3000

API calls are proxied via `/api` (see `proxy.conf.json`).

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

------------------------------------------------------------------------

## Architecture Notes

This frontend uses **Angular Signals** and runs **zoneless** (no
`zone.js`).

State updates are handled explicitly via signals:

``` ts
state = signal<'loading' | 'ready' | 'error'>('loading');
controls = signal<ControlDto[]>([]);
```

This results in: - Deterministic rendering - No hidden change
detection - Full control over UI updates

------------------------------------------------------------------------

## Related Repositories

-   Backend API (NestJS):\
    https://github.com/SvenMichels/pixelbyte-nis2-backend

------------------------------------------------------------------------

## Project Status

Early development preview.\
Core authentication, routing and control dashboard are implemented.

Planned next steps: - Audit timeline improvements - Role-based UI (ADMIN
/ SECURITY / AUDITOR) - Export & reporting views - NIS2 readiness
scoring UI

------------------------------------------------------------------------

## About PixelByte

PixelByte is a personal engineering project focused on:

-   Cybersecurity
-   DevSecOps
-   Secure web architectures
-   Learning-by-building real systems

The NIS2 Control Center is designed as a technical showcase and learning
platform for security engineering concepts.

------------------------------------------------------------------------

## License

MIT License\
Free to use, modify and build upon.
