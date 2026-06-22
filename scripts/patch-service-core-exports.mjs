import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, "..", "node_modules", "@rapidrest", "service-core", "package.json");

let pkg;
try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
} catch {
    // package not installed yet
    process.exit(0);
}

const subpath = "./dist/lib/security/AccessControlListMongo.js";
if (!pkg.exports[subpath]) {
    pkg.exports[subpath] = { import: subpath, default: subpath };
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 4));
    console.log("Patched @rapidrest/service-core: added AccessControlListMongo export");
}