import * as React from "react";
import { Bookmark, Flag, GitBranch, FileText, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Phase 1 lucide placeholders for icons that get custom-drawn in Phase 3.
 * Mapping is locked in design-system.md §1.4. When the bespoke set lands,
 * swap the lucide import here for the custom component — no call-site
 * changes required.
 */
export const HorseshoeU = Bookmark;
export const FinishPost = Flag;
export const Pedigree = GitBranch;
export const PdsDocument = FileText;
export const AfslShield = ShieldCheck;

/**
 * Brand-load-bearing logo mark: 2×2 silks tile.
 * Top-left + bottom-right Midnight, top-right + bottom-left Brass,
 * separated by a 1px charcoal hairline cross. Rendered as CSS grid
 * (not SVG) so it scales crisply from 16×16 favicon to trackside banner.
 */
export function SilksQuadrant({
  size = 32,
  className,
  ...props
}: {
  size?: number;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className">) {
  return (
    <div
      role="img"
      aria-label="Horse Racing Shares"
      className={cn(
        "relative grid grid-cols-2 grid-rows-2 overflow-hidden",
        "after:absolute after:inset-0 after:content-['']",
        "after:[background:linear-gradient(to_right,transparent_calc(50%-0.5px),var(--color-charcoal)_calc(50%-0.5px),var(--color-charcoal)_calc(50%+0.5px),transparent_calc(50%+0.5px)),linear-gradient(to_bottom,transparent_calc(50%-0.5px),var(--color-charcoal)_calc(50%-0.5px),var(--color-charcoal)_calc(50%+0.5px),transparent_calc(50%+0.5px))]",
        className,
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      <span className="bg-midnight" />
      <span className="bg-brass" />
      <span className="bg-brass" />
      <span className="bg-midnight" />
    </div>
  );
}
