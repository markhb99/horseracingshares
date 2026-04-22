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
 * separated by a charcoal hairline cross. Rendered as CSS grid
 * (not SVG) so it scales crisply from 16×16 favicon to trackside banner.
 *
 * The cross is produced by a charcoal wrapper + a grid-gap: the
 * quadrants sit on top of the charcoal backdrop and the gap reveals
 * it as a hairline. Thickness scales with tile size (1px below 40px,
 * 2px at typical display sizes) so the cross stays visible without
 * becoming a dark slab on large lockups.
 */
export function SilksQuadrant({
  size = 32,
  className,
  ...props
}: {
  size?: number;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className">) {
  const gap = size < 40 ? 1 : 2;
  return (
    <div
      role="img"
      aria-label="Horse Racing Shares"
      className={cn("bg-charcoal overflow-hidden", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <div
        className="grid h-full w-full grid-cols-2 grid-rows-2"
        style={{ gap: `${gap}px` }}
      >
        <span className="bg-midnight" />
        <span className="bg-brass" />
        <span className="bg-brass" />
        <span className="bg-midnight" />
      </div>
    </div>
  );
}
