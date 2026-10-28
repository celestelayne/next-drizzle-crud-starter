#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const SLICES_DIR = "docs/slices";
const REQUIRED_DOCS = ["intent.md", "spec.md", "plan.md"];
const DOC_STATUSES = new Set(["draft", "approved", "implemented", "archived"]);
const VERB_STATUSES = new Set(["planned", "in-progress", "implemented"]);
const APPROVED_OR_HIGHER = new Set(["approved", "implemented"]);
const ACTIVE_VERB_STATUSES = new Set(["in-progress", "implemented"]);

const errors = [];
const warnings = [];

const err = (slice, msg) => errors.push({ slice, msg });
const warn = (slice, msg) => warnings.push({ slice, msg });

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

function parseVerbStatuses(planContent) {
  const statuses = [];
  const lines = planContent.split("\n");
  let inVerbsSection = false;
  for (const line of lines) {
    if (/^#+\s*Verbs\b/i.test(line)) {
      inVerbsSection = true;
      continue;
    }
    if (inVerbsSection && /^#+\s/.test(line)) break;
    if (!inVerbsSection) continue;
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    if (cells.some((c) => /^:?-{3,}:?$/.test(c))) continue;
    if (/^verb$/i.test(cells[1] ?? "")) continue;
    const status = (cells[2] ?? "").toLowerCase();
    if (status) statuses.push(status);
  }
  return statuses;
}

function parseAcIds(specContent) {
  const seen = new Set();
  const dupes = new Set();
  const re = /^\s*-\s*\[[ xX]\]\s*(AC-\d+):/gm;
  let m;
  while ((m = re.exec(specContent))) {
    const id = m[1];
    if (seen.has(id)) dupes.add(id);
    else seen.add(id);
  }
  return { ids: [...seen], dupes: [...dupes] };
}

function acReferenced(id, planContent) {
  return new RegExp(`(^|[^A-Za-z0-9])${id}([^A-Za-z0-9]|$)`).test(planContent);
}

function looksPluralized(name) {
  return /s$/i.test(name);
}

function main() {
  if (!existsSync(SLICES_DIR)) {
    console.log(`No ${SLICES_DIR}/ directory — nothing to validate.`);
    return 0;
  }

  const entities = readdirSync(SLICES_DIR).filter((name) => {
    try {
      return statSync(join(SLICES_DIR, name)).isDirectory();
    } catch {
      return false;
    }
  });

  if (entities.length === 0) {
    console.log(`No slice contracts under ${SLICES_DIR}/ — nothing to validate.`);
    return 0;
  }

  for (const entity of entities) {
    const slicePath = join(SLICES_DIR, entity);
    const slice = relative(process.cwd(), slicePath);

    if (!looksPluralized(entity)) {
      warn(slice, `entity folder "${entity}" does not look pluralized (convention: plural)`);
    }

    const missing = REQUIRED_DOCS.filter((doc) => !existsSync(join(slicePath, doc)));
    if (missing.length) {
      err(slice, `missing required doc(s): ${missing.join(", ")}`);
      continue;
    }

    const intentContent = readFileSync(join(slicePath, "intent.md"), "utf8");
    const specContent = readFileSync(join(slicePath, "spec.md"), "utf8");
    const planContent = readFileSync(join(slicePath, "plan.md"), "utf8");

    const docs = {
      "intent.md": intentContent,
      "spec.md": specContent,
      "plan.md": planContent,
    };
    const docStatuses = {};
    for (const [name, content] of Object.entries(docs)) {
      const fm = parseFrontmatter(content);
      if (!fm) {
        err(slice, `${name} missing frontmatter block`);
        continue;
      }
      if (!fm.status) {
        err(slice, `${name} frontmatter missing "status" field`);
        continue;
      }
      if (!DOC_STATUSES.has(fm.status)) {
        err(
          slice,
          `${name} status "${fm.status}" not recognized (expected: ${[...DOC_STATUSES].join(" | ")})`,
        );
        continue;
      }
      docStatuses[name] = fm.status;
    }

    const verbStatuses = parseVerbStatuses(planContent);
    for (const vs of verbStatuses) {
      if (!VERB_STATUSES.has(vs)) {
        err(
          slice,
          `plan.md Verbs table has unrecognized status "${vs}" (expected: ${[...VERB_STATUSES].join(" | ")})`,
        );
      }
    }

    const { ids: acIds, dupes } = parseAcIds(specContent);
    for (const dup of dupes) {
      err(slice, `spec.md has duplicate acceptance-criterion ID "${dup}"`);
    }
    for (const id of acIds) {
      if (!acReferenced(id, planContent)) {
        err(slice, `spec.md ${id} is not referenced in plan.md`);
      }
    }

    const hasActiveVerb = verbStatuses.some((vs) => ACTIVE_VERB_STATUSES.has(vs));
    if (hasActiveVerb) {
      for (const [name, status] of Object.entries(docStatuses)) {
        if (!APPROVED_OR_HIGHER.has(status)) {
          err(
            slice,
            `${name} is "${status}" but plan.md has an in-progress or implemented verb — all three docs must be "approved" or higher before implementation`,
          );
        }
      }
    }
  }

  const checked = entities.length;

  if (warnings.length) {
    console.error("\nWarnings:");
    for (const { slice, msg } of warnings) {
      console.error(`  ${slice}: ${msg}`);
    }
  }

  if (errors.length) {
    console.error("\nValidation failed:");
    for (const { slice, msg } of errors) {
      console.error(`  ${slice}: ${msg}`);
    }
    console.error(`\n${errors.length} error(s), ${warnings.length} warning(s) across ${checked} slice(s).`);
    return 1;
  }

  console.log(`Validated ${checked} slice contract(s). ${warnings.length} warning(s), 0 errors.`);
  return 0;
}

process.exit(main());
