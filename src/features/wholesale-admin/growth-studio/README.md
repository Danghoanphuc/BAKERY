# Growth Studio v2

Growth Studio is an AI-assisted workbench that turns approved customer understanding into product, creative and social-preview decisions. React Flow renders the graph; the domain modules own workspace state, context, lineage, invalidation and version rules.

## Architecture

- `GrowthStudio.tsx` coordinates UI state and server calls. It does not define persistence or history rules.
- `growth-studio-domain.ts` normalizes legacy documents, validates context, gates releases and creates semantic diffs.
- `growth-studio-node-run-service.ts` builds immutable run inputs and canonical SHA-256 hashes.
- `growth-studio-dependency-graph-service.ts` and `growth-studio-invalidation-service.ts` traverse dependencies and attach recursive stale reasons without deleting old output.
- `growth-studio-layout-service.ts` is the only automatic positioning boundary. It runs only after an explicit Auto layout action.
- `growth-studio-models.ts` is the central model registry.
- `growth-studio-repository.ts` persists canonical snapshots and immutable history.
- `growth-studio-knowledge-service.ts` keeps knowledge proposals and evidence outside React Flow. AI proposals start as hypotheses and require explicit approval.

## Firestore schema

```text
growth_studio_workspaces/{workspaceId}       canonical editable snapshot (schemaVersion 2)
  revisions/{revisionId}                    immutable autosave/manual/restore/migration snapshot
  runs/{runId}                              immutable AI run input, hash, model, output and error
  output_revisions/{outputRevisionId}       immutable node output plus lineage
  checkpoints/{checkpointId}                named immutable workspace snapshot
  releases/{releaseId}                      immutable approved release snapshot

growth_studio_knowledge_objects/{objectId}  shared living knowledge object
  revisions/{revisionId}                    immutable knowledge revision
growth_studio_evidence/{evidenceId}          evidence with source and reliability
growth_studio_migrations/{workspaceId}       migration before-snapshot and rollback marker
```

The workspace document retains embedded node/edge/artifact caches so legacy workspaces load in one read and existing data remains intact. History is split into subcollections to keep audit records immutable and prevent workspace list reads from loading every revision.

Workspace CRUD is connected to the canonical Firestore document: create from a selected template, read/search from the sidebar, update title and description with a manual revision, and soft-delete by setting `archivedAt`. Archived workspaces remain recoverable with their revisions, runs, checkpoints and releases intact.

## Data flow

1. The client edits a canonical workspace and debounced autosave creates an `autosave` revision.
2. The product can only be selected in `product_plan`; `context.productId` must match the persisted product ID.
3. Before an AI request, the server normalizes and validates context, persists the latest snapshot, then builds a `NodeRun` with context IDs, approved upstream revision IDs, model config, prompt version, input snapshot and SHA-256 input hash.
4. The completed run creates an output revision and updates only the node’s current draft pointer/cache.
5. Human approval promotes the draft revision pointer. A changed input recursively marks descendants stale and records why; it never deletes their old output.
6. Restore copies an old snapshot into a new `restore` revision. Releases can only be created from approved, non-stale, context-consistent workspaces and are written with Firestore `create`, never merge/update.

## Migration and rollback

Both commands are dry-run by default and use the normal Firebase Admin environment configuration. No credentials are stored in the scripts.

```powershell
npm run migrate:growth-studio:v2
npm run migrate:growth-studio:v2 -- --apply
npm run rollback:growth-studio:v2
npm run rollback:growth-studio:v2 -- --apply
```

Migration preserves workspace IDs, node IDs, edges, artifacts and positions. It creates the checkpoint `Imported from legacy workspace`. It copies a product ID only when present on the embedded product and never guesses a missing segment; unresolved context is marked for confirmation. Workspaces are never merged by title. Rollback restores the exact before-snapshot recorded in `growth_studio_migrations` and removes only the revision/checkpoint created by that migration.

## Verification

Run the focused suite while iterating:

```powershell
npx vitest run src/features/admin/growth-studio
npx tsc --noEmit
npm run build
```

The repository currently has unrelated TypeScript failures in older cart/worker test fixtures; distinguish those from paths under `src/features/admin/growth-studio` when evaluating this feature.
