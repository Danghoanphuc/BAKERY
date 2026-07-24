import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ADMIN_APP_NAME = "bakery-wholesale-server";

function getServiceAccount(): ServiceAccount | null {
  const serviceAccountJson = process.env.WHOLESALE_FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    return JSON.parse(serviceAccountJson) as ServiceAccount;
  }

  const projectId = process.env.WHOLESALE_FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.WHOLESALE_FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.WHOLESALE_FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  return null;
}

function getAdminApp(): App {
  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  if (existing) return existing;

  const serviceAccount = getServiceAccount();
  const projectId =
    serviceAccount?.projectId ||
    process.env.WHOLESALE_FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_WHOLESALE_FIREBASE_PROJECT_ID;

  return initializeApp(
    {
      credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
      projectId,
    },
    ADMIN_APP_NAME,
  );
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}
