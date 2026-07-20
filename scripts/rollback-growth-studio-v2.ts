import "dotenv/config";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "../src/lib/firebase/admin";

const apply = process.argv.includes("--apply");
const WORKSPACES = "growth_studio_workspaces";
const MIGRATIONS = "growth_studio_migrations";

async function main() {
  const db = getAdminFirestore();
  const markers = await db.collection(MIGRATIONS).where("migration", "==", "growth-studio-v2").get();
  let rolledBack = 0;
  for (const marker of markers.docs) {
    const data = marker.data();
    if (!data.beforeSnapshot || data.rolledBackAt) continue;
    console.log(`${apply ? "ROLLBACK" : "DRY"} ${marker.id}`);
    if (!apply) continue;
    const workspaceRef = db.collection(WORKSPACES).doc(marker.id);
    const batch = db.batch();
    batch.set(workspaceRef, data.beforeSnapshot);
    if (data.revisionId) batch.delete(workspaceRef.collection("revisions").doc(String(data.revisionId)));
    if (data.checkpointId) batch.delete(workspaceRef.collection("checkpoints").doc(String(data.checkpointId)));
    batch.set(marker.ref, { rolledBackAt: FieldValue.serverTimestamp() }, { merge: true });
    await batch.commit();
    rolledBack += 1;
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", candidates: markers.size, rolledBack }, null, 2));
  if (!apply) console.log("No data changed. Re-run with --apply after reviewing this log.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
