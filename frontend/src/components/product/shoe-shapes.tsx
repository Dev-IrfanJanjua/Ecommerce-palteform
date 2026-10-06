/**
 * SHOE SILHOUETTES
 *
 * One drawing per collection, as a side profile facing right.
 *
 * GEOMETRY RULES (these are what make it read as a shoe rather than a helmet):
 *  - The body is LONG and LOW: roughly 310 wide by 130 tall, never a dome.
 *  - The topline is a WEDGE — high at the heel collar (y~245), sloping down
 *    through the throat (y~290) to the toe (y~310). A smooth arch from heel to
 *    toe looks like a cap, which is exactly how the first attempt failed.
 *  - There is a visible collar opening, a tongue and a heel counter. Without
 *    those three the shape has no "front" or "back" and reads as a blob.
 *  - Ground sits at y=370, outsole top at y=342, midsole top at y=324.
 *
 * Stylised on purpose: a clean illustration reads as intentional, whereas a
 * near-photo that is slightly wrong reads as broken.
 */

export type ShoeCollection = "sneakers" | "running" | "boots" | "formal" | "sandals" | "training";

export interface ShoePaint {
  upper: string;
  sole: string;
  midsole: string;
  panel: string;
  line: string;
  gradientId: string;
}

/* -------------------------------------------------------------------------- */
/* Shared parts                                                                */
/* -------------------------------------------------------------------------- */

function Stitch({ d, line, width = 2 }: { d: string; line: string; width?: number }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={line}
      strokeWidth={width}
      strokeDasharray="5 7"
      strokeLinecap="round"
      opacity="0.5"
    />
  );
}

/** The padded rim around the ankle opening. */
function Collar({ d, paint }: { d: string; paint: ShoePaint }) {
  return (
    <>
      <path d={d} fill="none" stroke={paint.panel} strokeWidth="13" strokeLinecap="round" />
      <path d={d} fill="none" stroke={paint.line} strokeWidth="2" opacity="0.45" />
    </>
  );
}

function Laces({ points, line }: { points: [number, number, number, number][]; line: string }) {
  return (
    <g stroke={line} strokeWidth="4" strokeLinecap="round" opacity="0.55">
      {points.map(([x1, y1, x2, y2]) => (
        <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} />
      ))}
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* Sneakers — low-top court shoe                                               */
/* -------------------------------------------------------------------------- */

function Sneaker({ paint: p }: { paint: ShoePaint }) {
  return (
    <>
      {/* Outsole */}
      <path
        d="M44 342 C120 348 300 346 360 336 L362 352 C362 364 349 370 334 370 L76 370 C58 370 44 361 44 350 Z"
        fill={p.sole}
      />
      {/* Midsole (cupsole) */}
      <path
        d="M44 324 C120 330 300 328 358 318 L360 338 C300 348 120 350 44 344 Z"
        fill={p.midsole}
      />
      {/* Upper */}
      <path
        d="M46 324 C42 288 54 260 78 248 C88 243 100 242 108 245 C136 256 158 272 180 290 C224 302 276 308 318 306 C338 305 352 310 358 318 C300 326 120 328 46 324 Z"
        fill={`url(#${p.gradientId})`}
        stroke={p.line}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Heel counter */}
      <path
        d="M46 324 C42 288 54 260 78 248 C88 243 100 242 108 245 L116 318 C88 320 64 322 46 324 Z"
        fill={p.panel}
      />
      {/* Toe cap */}
      <path d="M300 307 C326 305 346 309 358 318 C340 322 318 324 296 325 Z" fill={p.panel} />
      {/* Side stripe */}
      <path
        d="M150 300 C190 310 240 316 288 316 L288 325 C238 326 188 320 148 310 Z"
        fill={p.panel}
        opacity="0.85"
      />
      <Collar d="M108 245 C136 256 158 272 180 290" paint={p} />
      <Laces
        points={[
          [196, 300, 220, 294],
          [214, 306, 238, 300],
          [232, 311, 256, 305],
        ]}
        line={p.line}
      />
      <Stitch d="M44 334 C120 340 300 338 360 328" line={p.line} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Running — thick rocker foam midsole                                         */
/* -------------------------------------------------------------------------- */

function Runner({ paint: p }: { paint: ShoePaint }) {
  return (
    <>
      {/* Outsole, lifted at the toe (rocker) */}
      <path
        d="M40 340 C120 348 300 344 364 326 L368 342 C366 358 350 368 332 368 L74 368 C54 368 40 358 40 346 Z"
        fill={p.sole}
      />
      {/* Thick foam midsole — deep at the heel, tapering forward */}
      <path
        d="M40 300 C60 292 100 290 150 292 C230 296 310 302 360 306 L364 330 C300 348 120 352 40 344 Z"
        fill={p.midsole}
      />
      {/* Upper */}
      <path
        d="M44 298 C44 264 58 242 82 232 C92 227 104 226 112 229 C138 240 160 258 182 278 C224 284 274 286 314 282 C334 280 352 288 360 298 C300 304 150 296 44 298 Z"
        fill={`url(#${p.gradientId})`}
        stroke={p.line}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Heel counter */}
      <path
        d="M44 298 C44 264 58 242 82 232 C92 227 104 226 112 229 L120 292 C92 294 66 296 44 298 Z"
        fill={p.panel}
      />
      {/* Mesh vents */}
      <g fill={p.line} opacity="0.3">
        {[
          [216, 292],
          [240, 291],
          [264, 290],
          [288, 290],
          [228, 299],
          [252, 298],
          [276, 297],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4.5" />
        ))}
      </g>
      <Collar d="M112 229 C138 240 160 258 182 278" paint={p} />
      <Laces
        points={[
          [196, 288, 220, 284],
          [214, 294, 238, 290],
        ]}
        line={p.line}
      />
      <Stitch d="M40 318 C120 330 300 326 364 312" line={p.line} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Boots — the sneaker foot plus a tall shaft                                  */
/* -------------------------------------------------------------------------- */

function Boot({ paint: p }: { paint: ShoePaint }) {
  return (
    <>
      {/* Lug outsole */}
      <path
        d="M46 340 C120 346 300 344 358 334 L360 352 C360 364 348 370 334 370 L78 370 C60 370 46 361 46 350 Z"
        fill={p.sole}
      />
      <g fill={p.midsole} opacity="0.45">
        {[70, 106, 142, 178, 214, 250, 286, 318].map((x) => (
          <rect key={x} x={x} y="354" width="18" height="11" rx="3" />
        ))}
      </g>
      {/* Welt */}
      <path
        d="M46 326 C120 332 300 330 356 320 L358 340 C300 350 120 352 46 346 Z"
        fill={p.midsole}
      />
      {/* Shaft + foot, one outline */}
      <path
        d="M58 326 C54 300 56 262 60 206 C61 188 70 178 86 178 L148 178 C164 178 172 188 173 206 C175 240 177 268 180 292 C224 304 276 310 318 308 C338 307 350 312 356 320 C300 328 120 330 58 326 Z"
        fill={`url(#${p.gradientId})`}
        stroke={p.line}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Collar roll at the top of the shaft */}
      <path d="M60 206 C61 188 70 178 86 178 L148 178 C164 178 172 188 173 206 Z" fill={p.panel} />
      {/* Toe cap */}
      <path d="M296 309 C322 307 344 311 356 320 C336 324 314 326 292 327 Z" fill={p.panel} />
      {/* Eyelets up the shaft */}
      <g fill={p.line} opacity="0.6">
        {[220, 248, 276].map((y) => (
          <circle key={`l${y}`} cx="76" cy={y} r="3.4" />
        ))}
        {[220, 248, 276].map((y) => (
          <circle key={`r${y}`} cx="156" cy={y} r="3.4" />
        ))}
      </g>
      <g stroke={p.line} strokeWidth="3.5" opacity="0.55" strokeLinecap="round">
        <line x1="76" y1="220" x2="156" y2="248" />
        <line x1="156" y1="220" x2="76" y2="248" />
        <line x1="76" y1="248" x2="156" y2="276" />
        <line x1="156" y1="248" x2="76" y2="276" />
      </g>
      <Stitch d="M180 292 C230 304 290 310 340 312" line={p.line} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Formal — sleek, thin sole, stacked heel, long toe                           */
/* -------------------------------------------------------------------------- */

function Formal({ paint: p }: { paint: ShoePaint }) {
  return (
    <>
      {/* Thin leather sole */}
      <path
        d="M52 340 C130 348 300 346 366 330 L368 342 C366 352 352 358 336 358 L80 358 C64 358 52 350 52 342 Z"
        fill={p.sole}
      />
      {/* Stacked heel */}
      <path d="M54 344 L116 348 L116 372 L74 372 C60 372 52 364 54 354 Z" fill={p.midsole} />
      {/* Upper — lower and longer than a sneaker */}
      <path
        d="M54 342 C50 312 62 288 86 278 C96 274 106 273 114 276 C140 288 162 302 184 316 C230 326 288 328 330 322 C348 319 362 322 368 330 C300 344 130 348 54 342 Z"
        fill={`url(#${p.gradientId})`}
        stroke={p.line}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Heel counter */}
      <path
        d="M54 342 C50 312 62 288 86 278 C96 274 106 273 114 276 L120 340 C94 341 72 342 54 342 Z"
        fill={p.panel}
      />
      {/* Toe cap with brogue seam */}
      <path d="M300 325 C326 323 352 323 368 330 C340 338 310 342 290 343 Z" fill={p.panel} />
      {/* Vamp / lace panel */}
      <path
        d="M180 314 C214 322 254 326 292 327 L292 340 C252 340 212 336 178 328 Z"
        fill={p.panel}
        opacity="0.8"
      />
      <Collar d="M114 276 C140 288 162 302 184 316" paint={p} />
      <Laces
        points={[
          [200, 322, 222, 318],
          [216, 327, 238, 323],
        ]}
        line={p.line}
      />
      <Stitch d="M296 324 C300 334 300 340 298 344" line={p.line} />
      <Stitch d="M52 350 C130 358 300 356 366 340" line={p.line} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Sandals — open footbed with straps, no upper                                */
/* -------------------------------------------------------------------------- */

function Sandal({ paint: p }: { paint: ShoePaint }) {
  return (
    <>
      {/* Outsole */}
      <path
        d="M54 344 C130 352 300 350 358 338 L360 354 C360 366 348 372 334 372 L80 372 C62 372 54 363 54 352 Z"
        fill={p.sole}
      />
      {/* Contoured cork footbed */}
      <path
        d="M54 320 C70 312 110 308 170 310 C240 312 310 318 356 322 L358 340 C300 352 130 354 54 346 Z"
        fill={`url(#${p.gradientId})`}
        stroke={p.line}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Arch + toe ridge */}
      <path
        d="M120 318 C170 310 240 312 300 318 L300 324 C240 318 170 316 120 324 Z"
        fill={p.panel}
      />

      {/* Toe-post strap */}
      <path
        d="M236 312 C250 274 290 264 318 284 C330 292 338 302 342 314"
        fill="none"
        stroke={`url(#${p.gradientId})`}
        strokeWidth="24"
        strokeLinecap="round"
      />
      <path
        d="M236 312 C250 274 290 264 318 284 C330 292 338 302 342 314"
        fill="none"
        stroke={p.line}
        strokeWidth="2"
        opacity="0.45"
      />
      {/* Instep strap */}
      <path
        d="M118 318 C122 272 154 248 190 252 C208 254 220 264 228 278"
        fill="none"
        stroke={`url(#${p.gradientId})`}
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path
        d="M118 318 C122 272 154 248 190 252 C208 254 220 264 228 278"
        fill="none"
        stroke={p.line}
        strokeWidth="2"
        opacity="0.45"
      />
      {/* Buckle */}
      <rect
        x="176"
        y="240"
        width="26"
        height="18"
        rx="4"
        fill={p.midsole}
        stroke={p.line}
        strokeWidth="2"
      />
      <Stitch d="M54 332 C130 340 300 338 358 330" line={p.line} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Training — flat, low-drop, knit upper                                       */
/* -------------------------------------------------------------------------- */

function Trainer({ paint: p }: { paint: ShoePaint }) {
  return (
    <>
      {/* Flat wide outsole */}
      <path
        d="M44 344 C120 350 300 348 360 340 L362 356 C362 366 350 372 336 372 L74 372 C56 372 44 363 44 352 Z"
        fill={p.sole}
      />
      {/* Thin, even midsole — low drop */}
      <path
        d="M44 328 C120 334 300 332 358 324 L360 342 C300 350 120 352 44 346 Z"
        fill={p.midsole}
      />
      {/* Knit upper, slightly lower than a sneaker */}
      <path
        d="M46 328 C42 296 54 270 78 260 C88 255 100 254 108 257 C134 268 156 282 178 298 C222 308 274 312 316 310 C336 309 350 314 358 324 C300 332 120 334 46 328 Z"
        fill={`url(#${p.gradientId})`}
        stroke={p.line}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Knit texture */}
      <g stroke={p.line} strokeWidth="1.8" opacity="0.26" fill="none">
        {[
          "M104 288 C164 299 240 310 306 314",
          "M102 300 C162 309 240 318 306 322",
          "M100 312 C160 318 240 324 304 327",
        ].map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {/* Heel clip */}
      <path
        d="M46 328 C42 296 54 270 78 260 C88 255 100 254 108 257 L114 324 C88 325 64 327 46 328 Z"
        fill={p.panel}
      />
      {/* Midfoot band */}
      <path
        d="M170 302 C212 312 260 318 306 318 L306 328 C258 328 210 322 168 312 Z"
        fill={p.panel}
      />
      <Collar d="M108 257 C134 268 156 282 178 298" paint={p} />
      <Laces
        points={[
          [194, 308, 218, 302],
          [212, 314, 236, 308],
        ]}
        line={p.line}
      />
      <Stitch d="M44 338 C120 344 300 342 360 332" line={p.line} />
    </>
  );
}

/* -------------------------------------------------------------------------- */

const SHAPES: Record<ShoeCollection, (props: { paint: ShoePaint }) => React.JSX.Element> = {
  sneakers: Sneaker,
  running: Runner,
  boots: Boot,
  formal: Formal,
  sandals: Sandal,
  training: Trainer,
};

export function ShoeSilhouette({ collection, paint }: { collection: string; paint: ShoePaint }) {
  const Shape = SHAPES[collection as ShoeCollection] ?? Sneaker;
  return <Shape paint={paint} />;
}
