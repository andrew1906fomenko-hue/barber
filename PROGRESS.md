# Progress

Date: 2026-08-20

## Task

Continue forensic recovery work for `app/dashboard/page.tsx`, targeting the state at the end of rollout `17-25-01`, immediately before the prompt about "Аккаунт".

## What Was Done

- Identified rollout `17-25-01`:
  `C:\Users\Пользователь\.codex\sessions\2026\08\20\rollout-2026-08-20T17-25-01-01a01f8f-a030-70d3-8f26-b3a6b23ac800.jsonl`
- Confirmed its event range:
  `2026-08-20T14:25:49.282Z` to `2026-08-20T14:38:02.966Z`.
- Confirmed the critical later prompt about "Аккаунт" was after this rollout, around:
  `2026-08-20T14:42:51.009Z`.
- Extracted the relevant pre-prompt mutations for `app/dashboard/page.tsx`:
  - `call_F8e0tfJbtzcUiwv3dUBt7a2j`
  - `call_ngIB91W3wqC21KwV01cQQfeP`
- Confirmed the last needed pre-prompt mutation:
  `2026-08-20T14:36:53.225Z`, `call_ngIB91W3wqC21KwV01cQQfeP`.
- Verified that these two patches add:
  - `deleteBlockedTimeTarget`
  - confirm UI for deleting schedule exceptions with `Удалить` / `Отмена`.
- Checked that the pre-prompt schedule feature set was present in history:
  - `По дням недели`
  - `Индивидуальный график`
  - `schedulePanel`
  - fullscreen schedule screens
  - autosave-related schedule/booking handlers
  - `Отмена` buttons
  - renamed save labels.
- Created a checkpoint of the current `app/dashboard/page.tsx` outside the project:
  `C:\Users\Пользователь\.codex\recovery-backups\dashboard-page-before-replay-20260820-201217.tsx`

## Decisions

- No recovery was applied.
- `app/dashboard/page.tsx` was not replaced because the confirmed recovery chain did not include a full base snapshot/content for the base point after `2026-08-20T14:23:46.274Z`.
- A reverse-patch attempt from the current file was tested only on a temporary copy and rejected because several post-prompt patches no longer apply cleanly; later edits had already removed or changed some of those areas.
- A forward replay attempt from `git HEAD:app/dashboard/page.tsx` was also tested only on a temporary copy and rejected because the earliest 2026-08-20 dashboard patch expected an already-modified base.
- Temporary recovery folders were removed.

## Files Changed By This Step

- Added `PROGRESS.md`.
- No project source files were intentionally changed by the recovery attempt.
- A backup file was created outside the project under `.codex\recovery-backups`.

## Existing Dirty Files Observed

The worktree already had many modified/untracked files, including:

- `app/dashboard/page.tsx`
- `app/globals.css`
- `components/BookingExperience.tsx`
- many API/lib/db/config files
- `.codex-next-dev.*` and `.next-dev.*` logs
- multiple untracked app/API/lib/test/public files.

These were not cleaned up or reverted.

## Tests / Checks

- During the recovery attempt, no source recovery was applied, so requested post-recovery checks were not run.
- `npm.cmd run lint`: not run in the final recovery attempt.
- `npm.cmd run build`: not run in the final recovery attempt.
- Earlier history showed previous successful lint/build outputs, but those were historical and not treated as validation of a newly restored file.

## Remaining Work

Closed in the follow-up step:

- Reapplied the confirmed pre-prompt schedule exception delete confirmation behavior to the current `app/dashboard/page.tsx` without replacing the whole file.
- Kept the already-present CSS for:
  - `exceptions-blocked-card-confirming`
  - `exceptions-delete-confirm`
- Verified markers in `ScheduleSection`:
  - `deleteBlockedTimeTarget`
  - `setDeleteBlockedTimeTarget(item)`
  - inline confirm UI with `Удалить` / `Отмена`
- Ran:
  - `npm.cmd run lint`: passed.
  - `npm.cmd run build`: passed.

No remaining recovery work is currently known for the `17-25-01` pre-prompt replay target.
