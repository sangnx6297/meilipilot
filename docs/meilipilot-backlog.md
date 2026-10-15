# MeiliPilot — việc để sau

Các mục này **không** làm trong vòng hiện tại. App giữ stack Wails v2 + Svelte 5 + Go.

## Không làm (chiến lược)

- Rewrite Tauri 2 + React + Rust.
- Licensing / billing / signed license / Team seats.
- SSH tunnel.
- Multi-tab editor kiểu DBeaver.
- Collaboration realtime / multi-tenant SaaS.
- Tự copy documents DEV → PROD.

## P1 kỹ thuật

- Snapshot target trước migrate để restore tay. Không quảng bá rollback atomic.
- Disable từng SearchQuery option theo version; matrix Docker 1.48 / 1.53 / 1.55.
- **Virtualized** document/hit table khi freeze.
- **Cancel in-flight HTTP** (AbortController xuyên Wails Forward).
- **E2E Playwright** + Docker fixture indexes.
- Code signing + auto-updater (MSI WiX đã có).

## P2

- macOS / Linux builds.
- CLI / VS Code extension reuse `compareSettings`.
- Offline license / policy templates.
- Query builder visual.

North star giữ nguyên: hiểu search nhanh hơn, đổi cấu hình an toàn hơn — không cạnh tranh bằng CRUD.
