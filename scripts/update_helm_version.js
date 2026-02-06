#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const pkg = require("../package.json");
const version = pkg.version;

const valuesPath = path.join(__dirname, "..", "helm", "values.yaml");

const values = yaml.load(fs.readFileSync(valuesPath, "utf8"));

// Modify whatever fields you want
values.service.image.tag = version;

fs.writeFileSync(valuesPath, yaml.dump(values), "utf8");

console.log(`Updated Helm values.yaml to version ${version}`);