/**
 * CONNECTION TEST
 *
 *   npm run db:ping
 *
 * Connects, reports what it finds, and disconnects. Nothing is written.
 *
 * Run this before seeding: it separates "the connection string is wrong" from
 * "the seed has a bug", and it turns Atlas's generic errors into the specific
 * thing that is actually misconfigured.
 */
import mongoose from "mongoose";
import { env } from "../src/config/env";

if (!env.MONGODB_URI) {
  console.error(
    "\nMONGODB_URI is not set.\n\n" +
      "Add your Atlas connection string to backend/.env:\n" +
      "  MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority\n",
  );
  process.exit(1);
}

// Never print the password, even on success.
const redacted = env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//$1:********@");
console.log(`\nConnecting to ${redacted}`);
console.log(`Database: ${env.MONGODB_DB_NAME}\n`);

try {
  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME,
    serverSelectionTimeoutMS: 10_000,
  });

  const admin = mongoose.connection.db!.admin();
  const { version } = await admin.serverInfo();
  const collections = await mongoose.connection.db!.listCollections().toArray();

  console.log("  CONNECTED");
  console.log(`  MongoDB server ${version}`);

  // Transactions need a replica set. Atlas always is one; a plain local mongod
  // is not, and that only shows up much later when orders fail to commit.
  const hello = await admin.command({ hello: 1 });
  const isReplicaSet = Boolean(hello.setName);
  console.log(
    `  Replica set: ${isReplicaSet ? `yes (${hello.setName}) — transactions available` : "NO — transactions will fail at the orders step"}`,
  );

  console.log(
    `  Collections in "${env.MONGODB_DB_NAME}": ${collections.length ? collections.map((c) => c.name).join(", ") : "(empty — run npm run seed)"}`,
  );

  await mongoose.disconnect();
  console.log("\nConnection OK.\n");
  process.exit(0);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n  FAILED: ${message}\n`);

  // Atlas errors are generic; map the common ones to the actual fix.
  if (/bad auth|Authentication failed/i.test(message)) {
    console.error("  Wrong username or password.");
    console.error("  If the password contains @ : / ? # [ ] or %, it must be percent-encoded.");
    console.error("  Easiest fix: Atlas > Database Access > Edit > regenerate a password with no symbols.\n");
  } else if (/ENOTFOUND|querySrv/i.test(message)) {
    console.error("  The cluster hostname could not be resolved — check it was copied in full.\n");
  } else if (/IP|whitelist|not allowed/i.test(message)) {
    console.error("  Your IP is not allowed. Atlas > Network Access > Add IP Address.\n");
  } else if (/timed out|ETIMEDOUT/i.test(message)) {
    console.error("  Timed out. Usually Network Access: add your IP, or 0.0.0.0/0 for development.\n");
  }

  await mongoose.disconnect().catch(() => {});
  process.exit(1);
}
