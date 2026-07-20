import "dotenv/config";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "../src/lib/firebase/admin";
import type { GrowthStudioWorkspace } from "../src/features/admin/growth-studio/growth-studio-contract";
import { migrateLegacyGrowthWorkspace } from "../src/features/admin/growth-studio/growth-studio-migration";

const apply = process.argv.includes("--apply");
const WORKSPACES = "growth_studio_workspaces";
const MIGRATIONS = "growth_studio_migrations";

async function main() {
  const db = getAdminFirestore();
  const snapshot = await db.collection(WORKSPACES).get();
  const totals = { scanned: snapshot.size, migrated: 0, skipped: 0, nodes: 0, revisions: 0 };
  for (const doc of snapshot.docs) {
    const source = { ...doc.data(), id: doc.id } as GrowthStudioWorkspace;
    if (source.schemaVersion === 2) {
      totals.skipped += 1;
      continue;
    }
    const migrated = migrateLegacyGrowthWorkspace(source);
    totals.migrated += 1;
    totals.nodes += migrated.counts.nodes;
    totals.revisions += migrated.counts.revisions;
    console.log(`${apply ? "APPLY" : "DRY"} ${doc.id}: ${migrated.counts.nodes} nodes, context=${migrated.workspace.context?.status}`);
    if (!apply) continue;
    const workspaceRef = db.collection(WORKSPACES).doc(doc.id);
    const markerRef = db.collection(MIGRATIONS).doc(doc.id);
    const batch = db.batch();
    batch.create(markerRef, {
      migration: "growth-studio-v2",
      beforeSnapshot: migrated.beforeSnapshot,
      revisionId: migrated.revision.id,
      checkpointId: migrated.checkpoint.id,
      appliedAt: FieldValue.serverTimestamp(),
    });
    batch.set(workspaceRef, { ...migrated.workspace, updatedAt: FieldValue.serverTimestamp() });
    batch.create(workspaceRef.collection("revisions").doc(migrated.revision.id), { ...migrated.revision, createdAt: FieldValue.serverTimestamp() });
    batch.create(workspaceRef.collection("checkpoints").doc(migrated.checkpoint.id), { ...migrated.checkpoint, createdAt: FieldValue.serverTimestamp() });
    await batch.commit();
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...totals }, null, 2));
  if (!apply) console.log("No data changed. Re-run with --apply after reviewing this log.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
