# Pet action controls implementation plan

> Execute inline with superpowers:executing-plans. The user selected action controls from the scoped proposal.

**Goal:** Let a visitor direct their newly added pet using five shared actions.
**Architecture:** Private cookie ownership; atomic database ownership/action RPCs; selected-pet controls built from current world state.
**Tech stack:** Node, Postgres/Supabase, existing Three.js UI.
**Spec:** ../specs/2026-11-01-pet-controls.md

## Constraints

Keep ten-second uncapped decisions, no signup, no direct movement, no takeover of existing pets. Preserve scene and camera work.

## Review focus

Cross-browser authorization, duplicate retries, simultaneous owner/AI writes, cookie survival across deploys, stale UI availability.

## Tasks

- [x] Add ownership cookie helpers and strict command validation in pet-control.mjs. Test malformed cookies, independent browsers, restart persistence and payload allowlists.
- [x] Add a migration with private island_pet_owners, create_owned_pet, action source/request IDs, per-pet reservations and save_owner_action. Wrap existing save_pet_turn with ordered locks and reservation checks; retain atomic needs/inventory writes. Test forbidden roles, wrong owner, duplicates, rollback, expiry and racing AI commands in disposable Postgres.
- [x] Update both import routes to create owned pets atomically. Return only canControl and busy_until with world pets. Add POST /api/pet-command; map validation/ownership/busy failures to 400/403/409. Filter reserved pets in the AI runner without changing the schedule. Include module in Docker.
- [x] Add public/pet-commands.mjs for availability explanations and UI creation. Add five buttons to owned-pet cards and a small choice dialog. Preserve dialog selections during polling; select newly imported pet automatically. Check mobile and camera/pet click behavior.
- [ ] Run Node and SQL checks, apply reviewed migration, verify shared ownership/action behavior, commit/push/deploy and verify hosted files and command journey. Document cookie limitations and migration setup.

Validation: 45 Node tests pass; disposable Postgres controls script passes. Reviewed migration applied to the shared database; live SQL verified ownership, idempotency, private permissions and atomic needs/inventory updates. Review found and fixed request-ID loss on ambiguous failures; the regression test covers 503 and 429 retries. Browser verification passed: gallery import selected the owned pet; Explore updated the shared activity and needs, controls resumed after the reservation, and choosing Printer → Pink dot added one item. A racing AI action correctly returned a busy message. Deployment verification pending.
