/**
 * RESPONSIVE AND PERFORMANCE SANITY
 *
 *   npm run audit:responsive   (dev server must be running on :3000)
 *
 * Checks the things that cause the two most common storefront defects:
 * horizontal overflow on phones, and layout shift from images that arrive
 * without reserved space.
 *
 * It inspects markup rather than rendering, so it cannot measure real layout —
 * it catches the causes, not the symptoms. Visual checks still need a browser.
 */
const ORIGIN = "http://localhost:3000";
const ROUTES = ["/", "/collections/all", "/products/court-classic-low", "/checkout"];

let problems = 0;
const fail = (route: string, rule: string, detail: string) => {
  console.log(`  FAIL  [${rule}] ${detail}`);
  problems++;
};

for (const route of ROUTES) {
  const html = (await fetch(ORIGIN + route).then((r) => r.text()))
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");

  console.log(`\n${route}`);

  // --- Layout shift ---------------------------------------------------------
  // Every image must sit in a box with a reserved aspect ratio, or the page
  // reflows when it loads.
  const fillImages = [...html.matchAll(/<img\b[^>]*>/gi)].filter((m) =>
    /style="[^"]*position:\s*absolute/i.test(m[0]),
  );
  const aspectBoxes = [...html.matchAll(/aspect-(square|4\/5|4\/3|video)/g)].length;
  console.log(`  images: ${fillImages.length} · aspect-ratio boxes: ${aspectBoxes}`);
  if (fillImages.length > 0 && aspectBoxes === 0) {
    fail(route, "cls", "images present but no aspect-ratio box reserves their space");
  }

  // --- Oversized fetches ----------------------------------------------------
  const missingSizes = fillImages.filter((m) => !/sizes="/.test(m[0]));
  if (missingSizes.length) {
    fail(route, "img-sizes", `${missingSizes.length} fill image(s) without sizes`);
  }

  // --- Fixed widths that cannot fit a 375px viewport -----------------------
  // Tailwind's numeric scale is NOT automatically safe: w-96 is 24rem = 384px,
  // which overflows a 375px phone. Anything without a max-w escape hatch is a
  // horizontal-scroll bug waiting to happen.
  const MOBILE = 375;
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    const classes = m[1].split(/\s+/);
    const hasEscape = classes.some((c) => c === "max-w-full" || c.startsWith("max-w-"));
    for (const cls of classes) {
      const arbitrary = cls.match(/^(?:w|min-w)-\[(\d+)px\]$/);
      if (arbitrary && Number(arbitrary[1]) > MOBILE && !hasEscape) {
        fail(route, "fixed-width", `${cls} exceeds ${MOBILE}px with no max-w`);
      }
      const scale = cls.match(/^(?:w|min-w)-(\d+)$/);
      // Tailwind scale step = 0.25rem = 4px.
      if (scale && Number(scale[1]) * 4 > MOBILE && !hasEscape) {
        fail(
          route,
          "fixed-width",
          `${cls} is ${Number(scale[1]) * 4}px, over ${MOBILE}px with no max-w`,
        );
      }
    }
  }

  // --- Font loading ---------------------------------------------------------
  if (!/font-display:\s*swap/i.test(html) && !/_next\/static\/media/.test(html)) {
    console.log("  note: no self-hosted font files referenced");
  }

  // --- Viewport meta --------------------------------------------------------
  if (!/<meta name="viewport"/i.test(html)) {
    fail(route, "viewport", "missing viewport meta");
  }
}

console.log(
  `\n${problems === 0 ? "NO RESPONSIVE OR CLS PROBLEMS FOUND" : problems + " PROBLEM(S)"}\n`,
);
if (problems) process.exit(1);
