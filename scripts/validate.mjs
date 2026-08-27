#!/usr/bin/env node
// Structural validation for the dsh-suite bundle.
import { readdirSync, readFileSync, existsSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

let failures = 0;
const fail = (msg) => { console.error("FAIL:", msg); failures++; };

if (!pkg.dsh?.bundle?.patch) fail("package.json missing dsh.bundle.patch");
const patchPath = new URL(`../${pkg.dsh.bundle.patch}`, import.meta.url);
if (!existsSync(patchPath)) fail(`bundle patch not found: ${pkg.dsh.bundle.patch}`);
else {
  const patch = readFileSync(patchPath, "utf8");
  if (!patch.includes("dsh-skill-filesystem")) fail("patch does not insert a skill-filesystem row");
  if (!patch.includes("skills/'") && !patch.includes('skills/"')) fail("patch does not point at skills/ directory");
}

const expected = ["dex", "dex-plan", "ponytail", "ponytail-audit", "ponytail-debt", "ponytail-gain", "ponytail-help", "ponytail-review", "strong-orchestrator"];
const found = [];
for (const dir of readdirSync(new URL("../skills", import.meta.url))) {
  const fm = (() => { try { return readFileSync(new URL(`../skills/${dir}/SKILL.md`, import.meta.url), "utf8").slice(0, 600); } catch { return ""; } })();
  const m = fm.match(/^name:\s*(\S+)/m);
  if (!m) { fail(`skills/${dir}/SKILL.md missing name:`); continue; }
  if (m[1] !== dir) fail(`skill name "${m[1]}" != folder "${dir}"`);
  if (!SKILL_NAME.test(dir)) fail(`folder "${dir}" violates skill-name pattern`);
  if (!/^description:/m.test(fm)) fail(`skills/${dir}/SKILL.md missing description:`);
  found.push(dir);
}
for (const want of expected) if (!found.includes(want)) fail(`expected skill missing: ${want}`);

console.log(found.length === expected.length
  ? `OK: ${found.length}/${expected.length} skills valid, bundle wired`
  : `skill count mismatch: ${found.length}/${expected.length}`);
if (found.length !== expected.length || failures > 0) process.exit(1);
