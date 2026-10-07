/**
 * ACCESSIBILITY AND MARKUP AUDIT
 *
 *   npm run audit:pages            (dev server must be running on :3000)
 *   npm run audit:pages -- :3001   (other port)
 *
 * Fetches every route and checks the rendered HTML for the problems that are
 * cheap to catch automatically and expensive to notice by eye: images without
 * alt text, inputs without labels, skipped heading levels, duplicate ids,
 * unlabelled icon buttons, missing landmarks.
 *
 * This is not a replacement for keyboard testing or a screen reader. It is a
 * floor, so regressions do not land silently.
 */

const BASE = process.argv.find((a) => a.startsWith(":")) ?? ":3000";
const ORIGIN = `http://localhost${BASE}`;

const ROUTES = [
  "/",
  "/collections/all",
  "/collections/sneakers",
  "/collections/all?gender=men&onSale=1",
  "/products/court-classic-low",
  "/products/pool-clog",
  "/checkout",
  "/checkout/success?order=QD-ABC234&total=3000000",
  "/design-system",
  "/not-a-real-page",
];

interface Issue {
  route: string;
  level: "error" | "warn";
  rule: string;
  detail: string;
}

const issues: Issue[] = [];
const add = (route: string, level: Issue["level"], rule: string, detail: string) =>
  issues.push({ route, level, rule, detail });

/** Strips comments and script/style bodies so checks do not match code. */
function clean(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return m ? m[1] : null;
}

/** Visible text of an element, for accessible-name checks. */
function textOf(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function auditRoute(route: string, html: string) {
  const doc = clean(html);
  const labelFor = new Set([...doc.matchAll(/<label\b[^>]*for="([^"]+)"/gi)].map((m) => m[1]));

  // --- Document ------------------------------------------------------------
  if (!/<html[^>]*\slang="[a-z-]+"/i.test(html)) add(route, "error", "html-lang", "missing lang");
  if (!/<title>/i.test(html)) add(route, "error", "title", "missing <title>");
  if (!/<main\b/i.test(doc)) add(route, "error", "landmark-main", "no <main>");
  if (!/id="main"/.test(doc))
    add(route, "warn", "skip-link-target", 'no id="main" for the skip link');

  // --- Headings ------------------------------------------------------------
  const headings = [...doc.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({
    level: Number(m[1]),
    text: textOf(m[2]),
  }));
  const h1s = headings.filter((h) => h.level === 1);
  if (h1s.length === 0) add(route, "error", "heading-h1", "no <h1>");
  if (h1s.length > 1) add(route, "error", "heading-h1", `${h1s.length} <h1> elements`);

  let previous = 0;
  for (const h of headings) {
    if (previous && h.level > previous + 1) {
      add(
        route,
        "warn",
        "heading-order",
        `h${previous} jumps to h${h.level} ("${h.text.slice(0, 40)}")`,
      );
    }
    previous = h.level;
    if (!h.text) add(route, "error", "heading-empty", `empty h${h.level}`);
  }

  // --- Images --------------------------------------------------------------
  for (const [tag] of doc.matchAll(/<img\b[^>]*>/gi)) {
    if (attr(tag, "alt") === null) {
      add(route, "error", "img-alt", `<img> without alt: ${tag.slice(0, 90)}`);
    }
    // next/image emits sizes only when asked; without it a fill image downloads
    // at the largest breakpoint on every device.
    if (/fill/.test(tag) && !attr(tag, "sizes")) {
      add(route, "warn", "img-sizes", "fill image without sizes");
    }
  }
  for (const [tag] of doc.matchAll(/<svg\b[^>]*>/gi)) {
    const role = attr(tag, "role");
    const hidden = attr(tag, "aria-hidden");
    if (role === "img" && !attr(tag, "aria-label")) {
      add(route, "error", "svg-label", 'svg role="img" without aria-label');
    }
    if (!role && hidden !== "true") {
      add(route, "warn", "svg-hidden", "decorative svg without aria-hidden");
    }
  }

  // --- Form controls -------------------------------------------------------
  for (const [tag] of doc.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
    const type = attr(tag, "type");
    if (type === "hidden" || type === "submit" || type === "button") continue;
    // Radix mirrors its controls with a hidden native input purely so the value
    // submits with a form. It is aria-hidden and unfocusable, so it is not
    // exposed to assistive tech and needs no label.
    if (attr(tag, "aria-hidden") === "true") continue;
    const id = attr(tag, "id");
    const labelled =
      (id && labelFor.has(id)) || attr(tag, "aria-label") || attr(tag, "aria-labelledby");
    if (!labelled) add(route, "error", "input-label", `unlabelled control: ${tag.slice(0, 80)}`);
  }

  // --- Buttons and links ---------------------------------------------------
  for (const m of doc.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const open = `<b ${m[1]}>`;
    const id = attr(open, "id");
    // <button> is a labelable element, so `<label for>` gives it a name — this
    // is exactly the shadcn/Radix Checkbox pattern.
    const name =
      textOf(m[2]) ||
      attr(open, "aria-label") ||
      attr(open, "aria-labelledby") ||
      (id && labelFor.has(id) ? id : null);
    if (!name)
      add(route, "error", "button-name", `button with no accessible name: ${m[1].slice(0, 70)}`);
  }
  for (const m of doc.matchAll(/<a\b([^>]*href="[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi)) {
    const name = textOf(m[2]) || attr(`<b ${m[1]}>`, "aria-label");
    if (!name)
      add(route, "error", "link-name", `link with no accessible name: ${m[1].slice(0, 70)}`);
  }

  // --- Landmarks and uniqueness -------------------------------------------
  const navs = [...doc.matchAll(/<nav\b([^>]*)>/gi)];
  if (navs.length > 1) {
    const unlabelled = navs.filter(
      (m) => !attr(`<b ${m[1]}>`, "aria-label") && !attr(`<b ${m[1]}>`, "aria-labelledby"),
    );
    if (unlabelled.length) {
      add(
        route,
        "warn",
        "nav-label",
        `${unlabelled.length} of ${navs.length} <nav> without a label`,
      );
    }
  }

  const ids = [...doc.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  if (dupes.size) add(route, "error", "duplicate-id", [...dupes].join(", "));
}

/* -------------------------------------------------------------------------- */

let checked = 0;
for (const route of ROUTES) {
  let res: Response;
  try {
    res = await fetch(ORIGIN + route);
  } catch {
    console.error(`\nCannot reach ${ORIGIN}. Start the dev server first.\n`);
    process.exit(1);
  }
  const html = await res.text();
  auditRoute(route, html);
  checked++;
}

const errors = issues.filter((i) => i.level === "error");
const warnings = issues.filter((i) => i.level === "warn");

for (const route of ROUTES) {
  const mine = issues.filter((i) => i.route === route);
  console.log(`\n${route}  ${mine.length ? `${mine.length} issue(s)` : "clean"}`);
  for (const i of mine) {
    console.log(`  ${i.level === "error" ? "ERROR" : "warn "}  [${i.rule}] ${i.detail}`);
  }
}

console.log(`\n${checked} routes · ${errors.length} errors · ${warnings.length} warnings\n`);
if (errors.length) process.exit(1);
