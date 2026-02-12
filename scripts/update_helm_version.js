#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const pkg = require("../package.json");
const version = pkg.version;

// Update the values.yaml file with the correct image tag
const valuesPath = path.join(__dirname, "..", "helm", "values.yaml");
const values = yaml.load(fs.readFileSync(valuesPath, "utf8"));
values.service.image.tag = version;
fs.writeFileSync(valuesPath, yaml.dump(values), "utf8");

// Update the version in the single_node_install.sh script
const scriptRegex = /VERSION="?\b\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?\b"?/g;
const scriptPath = path.join(__dirname, "..", "single_node_install.sh");
const script = fs.readFileSync(scriptPath, { encoding: "utf-8" });
let updated = script.replace(scriptRegex, `VERSION="${version}"`);
fs.writeFileSync(scriptPath, updated, { encoding: "utf-8" });

// Also update the example in the README with the correct tag
const readmeRegex = /\b\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?\b/g;
const readmePath = path.join(__dirname, "..", "README.md");
const readme = fs.readFileSync(readmePath, { encoding: "utf-8" });
updated = readme.replace(readmeRegex, version);
fs.writeFileSync(readmePath, updated, { encoding: "utf-8" });

console.log(`Updated Helm values.yaml to version ${version}`);