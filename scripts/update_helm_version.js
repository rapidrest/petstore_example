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

// Also update the example in the README with the correct tag
const versionRegex = /\b\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?\b/g;
const readmePath = path.join(__dirname, "..", "README.md");
const readme = fs.readFileSync(readmePath, { encoding: "utf-8" });
const updated = readme.replace(versionRegex, version);
fs.writeFileSync(readmePath, updated, { encoding: "utf-8" });

console.log(`Updated Helm values.yaml to version ${version}`);