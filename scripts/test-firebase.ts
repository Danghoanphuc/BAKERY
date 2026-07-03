/**
 * Script test kết nối Firebase đơn giản
 */

import { doc, setDoc } from "firebase/firestore";
import { db } from "../src/lib/firebase/config";

async function testConnection() {
  try {
    console.log("🔥 Testing Firebase connection...");

    // Test write một document đơn giản
    const testDoc = doc(db, "test", "test-doc");
    await setDoc(testDoc, {
      message: "Hello Firebase!",
      timestamp: new Date().toISOString(),
    });

    console.log("✅ Firebase connection successful!");
    console.log("✅ Test document created in 'test' collection");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
}

testConnection();
