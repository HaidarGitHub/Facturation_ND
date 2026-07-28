# TODO - Admin access (frontend wiring)

- [x] Inspect existing backend auth + admin endpoints (already present).
- [x] Add admin gating in UI (partial).
- [ ] Rewrite `front-end/src/App.jsx` to fix React hook rule violations.
- [ ] Load admin data in `App.jsx`:
  - [ ] fetch `/api/services`
  - [ ] fetch `/api/users` (admin only)
- [ ] Wire `AdminPanel` with real props:
  - [ ] `users` from `/api/users`
  - [ ] `onCreateUser` -> POST `/api/users`
  - [ ] `onUpdateUser` -> PUT `/api/users/:id`
- [ ] Ensure only admin can open `/admin` and `/dashboard` in UI.
- [ ] Run `npm run lint` and `npm run build` in `front-end/`.

