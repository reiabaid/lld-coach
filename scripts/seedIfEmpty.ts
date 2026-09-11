import { existsSync } from "fs";
import path from "path";
import { execSync } from "child_process";

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "data", "db.json");

if (existsSync(dbPath)) {
  console.log(`Using existing ${dbPath} (delete it and re-run \`npm run seed\` to reset the demo data)`);
} else {
  console.log("No data/db.json found — seeding the 3 problems + hero demo attempt...");
  execSync("tsx scripts/seed.ts", { stdio: "inherit" });
}
