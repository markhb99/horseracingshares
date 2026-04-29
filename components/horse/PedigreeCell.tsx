/**
 * PedigreeCell — renders a single ancestor in the pedigree tree or accordion.
 *
 * Styling rules per design-system.md pedigree section:
 *  - Group 1 winner: bold italic + brass dot
 *  - Stakes winner: bold italic (Fraunces)
 *  - Stakes producer: italic + § suffix
 *  - Dam line: italic semibold
 *  - Default: semibold roman
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { PedigreeNode, SlotKey } from '@/types/pedigree';
import { labelForSlot } from '@/types/pedigree';

interface PedigreeCellProps {
  node: PedigreeNode | undefined;
  slot: SlotKey;
  isHighlighted: boolean;
  isDimmed: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  variant: 'tree' | 'accordion';
}

export function PedigreeCell({
  node,
  slot,
  isHighlighted,
  isDimmed,
  onMouseEnter,
  onMouseLeave,
  onClick,
  variant,
}: PedigreeCellProps) {
  const isEmpty = node === undefined;
  const label = slot.length > 1 ? labelForSlot(slot) : null;

  // ── Name render ────────────────────────────────────────────────────────────
  function NameContent() {
    if (isEmpty) {
      return (
        <span className="font-heading font-semibold not-italic text-charcoal/50">
          —
        </span>
      );
    }

    if (node.is_group1_winner) {
      return (
        <span className="font-heading font-bold italic text-charcoal">
          <span
            aria-label="Group 1"
            className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--color-brass)] mr-1.5 align-middle"
          />
          {node.name}
        </span>
      );
    }

    if (node.is_stakes_winner) {
      return (
        <span className="font-heading font-bold italic text-charcoal">
          {node.name}
        </span>
      );
    }

    if (node.is_stakes_producer) {
      return (
        <span className="font-heading font-semibold italic text-charcoal">
          {node.name}
          <span aria-label="stakes producer"> §</span>
        </span>
      );
    }

    if (node.is_dam_line) {
      return (
        <span className="font-heading font-semibold italic text-charcoal">
          {node.name}
        </span>
      );
    }

    return (
      <span className="font-heading font-semibold not-italic text-charcoal">
        {node.name}
      </span>
    );
  }

  const interactive = !isEmpty;

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={isEmpty ? 'Unknown ancestor' : `${node.name} — ${labelForSlot(slot) || 'ancestor'}`}
      onMouseEnter={interactive ? onMouseEnter : undefined}
      onMouseLeave={interactive ? onMouseLeave : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'bg-white rounded border p-2 flex flex-col justify-center gap-0.5',
        'transition-[opacity,box-shadow] duration-200',
        variant === 'tree' ? 'w-[200px] h-[64px]' : 'w-full',
        isHighlighted ? 'ring-1 ring-midnight border-transparent' : 'border-fog',
        isDimmed && 'opacity-60',
        isEmpty && 'opacity-80',
        interactive && 'cursor-pointer hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {/* Slot label (Gen 2+) */}
      {label && (
        <p className="text-[10px] uppercase tracking-wider text-charcoal-soft leading-none truncate">
          {label}
        </p>
      )}

      {/* Ancestor name */}
      <div className="text-[13px] leading-tight truncate">
        <NameContent />
      </div>

      {/* Country · YoB */}
      {!isEmpty && (
        <p className="text-[13px] uppercase tracking-wider text-charcoal-soft leading-none truncate">
          {node.country}
          {node.yob ? ` · ${node.yob}` : ''}
        </p>
      )}
    </div>
  );
}
