'use client';

/**
 * PedigreeDrawer — slide-in detail panel for a pedigree ancestor.
 * Triggered when the user clicks a PedigreeCell.
 * Shows black-type status and compliance microcopy.
 */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Caption } from '@/components/typography';
import type { PedigreeNode, SlotKey } from '@/types/pedigree';
import { labelForSlot } from '@/types/pedigree';

interface PedigreeDrawerProps {
  node: PedigreeNode | null;
  slot: SlotKey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function blackTypeLabel(node: PedigreeNode): string {
  if (node.is_group1_winner) return 'Group 1 winner';
  if (node.is_stakes_winner) return 'Stakes winner';
  if (node.is_stakes_producer) return 'Stakes producer';
  return 'Unraced / no black type on record';
}

function nameClassName(node: PedigreeNode): string {
  if (node.is_group1_winner || node.is_stakes_winner) {
    return 'font-heading text-xl font-bold italic text-charcoal';
  }
  if (node.is_stakes_producer || node.is_dam_line) {
    return 'font-heading text-xl font-semibold italic text-charcoal';
  }
  return 'font-heading text-xl font-semibold not-italic text-charcoal';
}

export function PedigreeDrawer({
  node,
  slot,
  open,
  onOpenChange,
}: PedigreeDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[360px] p-0">
        <SheetHeader className="p-6 pb-4 border-b border-fog">
          {node ? (
            <>
              {/* Slot label */}
              {slot && slot.length > 1 && (
                <Caption className="text-charcoal-soft uppercase tracking-wider mb-1">
                  {labelForSlot(slot)}
                </Caption>
              )}

              {/* Ancestor name */}
              <SheetTitle className={nameClassName(node)}>
                {node.is_group1_winner && (
                  <span
                    aria-label="Group 1"
                    className="inline-block w-2 h-2 rounded-full bg-[color:var(--color-brass)] mr-2 align-middle"
                  />
                )}
                {node.name}
              </SheetTitle>

              {/* Meta line */}
              <p className="text-[13px] uppercase tracking-wider text-charcoal-soft mt-1">
                {node.yob ?? '—'} &middot; {node.country} &middot;{' '}
                {node.sex === 'sire' ? 'Stallion' : 'Mare'}
              </p>
            </>
          ) : (
            <SheetTitle className="font-heading text-xl font-semibold">
              Unknown ancestor
            </SheetTitle>
          )}
        </SheetHeader>

        {node && (
          <div className="p-6 flex flex-col gap-5">
            {/* Black-type status */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-charcoal-soft mb-1.5">
                Black-type status
              </p>
              <p className="text-sm font-medium text-charcoal">
                {blackTypeLabel(node)}
              </p>
            </div>

            {/* Compliance microcopy */}
            <Caption className="text-charcoal-soft border-t border-fog pt-4">
              Black-type status recorded at listing submission. Provenance:
              Racing Australia catalogue or syndicator declaration.
            </Caption>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
