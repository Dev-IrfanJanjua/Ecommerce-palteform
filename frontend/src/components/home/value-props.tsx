import { RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { Section } from "@/components/common/section";
import { brand } from "@/config/brand";

/**
 * Value props strip.
 *
 * The copy comes from brand.valueProps, which is derived from the same
 * shipping and returns numbers checkout uses — so the promise on the home page
 * can never drift away from what the cart actually charges.
 */
const ICONS = {
  truck: Truck,
  "rotate-ccw": RotateCcw,
  "shield-check": ShieldCheck,
} as const;

export function ValueProps() {
  return (
    <Section surface>
      <ul className="grid gap-8 sm:grid-cols-3">
        {brand.valueProps.map((prop) => {
          const Icon = ICONS[prop.icon];
          return (
            <li key={prop.title} className="flex gap-4">
              <Icon className="text-primary size-6 shrink-0" aria-hidden="true" />
              <div>
                <h3 className="text-body font-semibold">{prop.title}</h3>
                <p className="text-muted-foreground text-body-sm mt-1">{prop.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
