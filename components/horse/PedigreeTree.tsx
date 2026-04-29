'use client';

/**
 * PedigreeTree — interactive pedigree visualisation.
 *
 * Desktop (md+): absolute-positioned cells on a fixed-height SVG canvas.
 *   Hover highlights ancestry path. Click opens PedigreeDrawer.
 * Mobile (<md): shadcn Accordion with Gen1/Gen2 open by default.
 */

import * as React from 'react';
import { useState, useMemo } from 'react';
import { Accordion as AccordionPrimitive } from 'radix-ui';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PedigreeCell } from '@/components/horse/PedigreeCell';
import { PedigreeDrawer } from '@/components/horse/PedigreeDrawer';
import type { PedigreeJson, SlotKey, PedigreeNode } from '@/types/pedigree';
import {
  GEN4_ORDER,
  slotPosition,
  highlightedSlots,
} from '@/types/pedigree';

// ─── Layout constants ─────────────────────────────────────────────────────────

const CELL_W = 200;
const CELL_H = 64;
const COL_GAP = 48;
const ROW_PITCH = 72;
const SUBJECT_W = 240;
const SUBJECT_H = 80;
const SUBJECT_GAP = 64;
const GRID_HEIGHT = 16 * ROW_PITCH - 8; // 1144
const GRID_WIDTH = SUBJECT_W + SUBJECT_GAP + 4 * CELL_W + 3 * COL_GAP; // 1248

// ─── Slot render order ────────────────────────────────────────────────────────

const ALL_SLOTS: SlotKey[] = [
  's', 'd',
  'ss', 'sd', 'ds', 'dd',
  'sss', 'ssd', 'sds', 'sdd', 'dss', 'dsd', 'dds', 'ddd',
  ...GEN4_ORDER,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function colForSlot(key: SlotKey): number {
  return key.length; // 1..4
}

function cellXY(key: SlotKey): { x: number; y: number } {
  const c = colForSlot(key);
  const x = SUBJECT_W + SUBJECT_GAP + (c - 1) * (CELL_W + COL_GAP);
  const { rowStart, rowSpan } = slotPosition(key);
  const spanCentrePx = rowStart * ROW_PITCH + (rowSpan * ROW_PITCH - 8) / 2;
  const y = spanCentrePx - CELL_H / 2;
  return { x, y };
}

// ─── SVG connector path ───────────────────────────────────────────────────────

interface ConnectorProps {
  parentKey: SlotKey;
  highlighted: boolean;
}

function Connector({ parentKey, highlighted }: ConnectorProps) {
  const childSKey = (parentKey + 's') as SlotKey;
  const childDKey = (parentKey + 'd') as SlotKey;

  const parent = cellXY(parentKey);
  const childS = cellXY(childSKey);
  const childD = cellXY(childDKey);

  const px = parent.x + CELL_W;
  const pcy = parent.y + CELL_H / 2;
  const mx = parent.x + CELL_W + COL_GAP / 2;
  const cx = parent.x + CELL_W + COL_GAP;
  const uy = childS.y + CELL_H / 2;
  const ly = childD.y + CELL_H / 2;

  const d = `M ${px} ${pcy} H ${mx} V ${uy} H ${cx} M ${mx} ${uy} V ${ly} H ${cx}`;

  return (
    <path
      d={d}
      fill="none"
      stroke={highlighted ? 'var(--color-midnight)' : 'var(--color-fog)'}
      strokeWidth={highlighted ? 1.5 : 1}
      className="transition-[stroke,stroke-width] duration-200"
    />
  );
}

// ─── Subject cell ─────────────────────────────────────────────────────────────

function SubjectCell({ horseName }: { horseName: string }) {
  const x = 0;
  const y = GRID_HEIGHT / 2 - SUBJECT_H / 2;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: SUBJECT_W,
        height: SUBJECT_H,
      }}
      className="flex flex-col items-center justify-center rounded-lg border border-midnight bg-midnight px-4 text-center"
    >
      <p className="font-heading font-bold italic text-paper text-[15px] leading-snug line-clamp-3">
        {horseName}
      </p>
    </div>
  );
}

// ─── Desktop tree ─────────────────────────────────────────────────────────────

interface DesktopTreeProps {
  pedigreeJson: PedigreeJson;
  horseName: string;
  hoveredSlot: SlotKey | null;
  highlightSet: Set<SlotKey>;
  onHover: (slot: SlotKey | null) => void;
  onSelect: (slot: SlotKey) => void;
}

function DesktopTree({
  pedigreeJson,
  horseName,
  hoveredSlot,
  highlightSet,
  onHover,
  onSelect,
}: DesktopTreeProps) {
  // Parent slots that have two Gen-n+1 children (not Gen 4 parents)
  const connectorSlots: SlotKey[] = [
    's', 'd',
    'ss', 'sd', 'ds', 'dd',
    'sss', 'ssd', 'sds', 'sdd', 'dss', 'dsd', 'dds', 'ddd',
  ];

  return (
    <div
      className="relative overflow-x-auto"
      style={{ width: '100%' }}
      aria-label="Pedigree chart"
    >
      <div style={{ width: GRID_WIDTH, height: GRID_HEIGHT, position: 'relative' }}>
        {/* SVG connector layer */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: GRID_WIDTH,
            height: GRID_HEIGHT,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          {connectorSlots.map((key) => {
            // Highlight the connector if either child is highlighted
            const childS = (key + 's') as SlotKey;
            const childD = (key + 'd') as SlotKey;
            const isHighlighted =
              highlightSet.has(childS) || highlightSet.has(childD);
            return (
              <Connector
                key={key}
                parentKey={key as SlotKey}
                highlighted={isHighlighted}
              />
            );
          })}
        </svg>

        {/* Subject cell */}
        <SubjectCell horseName={horseName} />

        {/* Ancestor cells */}
        {ALL_SLOTS.map((key) => {
          const node = pedigreeJson[key] as PedigreeNode | undefined;
          const { x, y } = cellXY(key);
          const isHighlighted = highlightSet.has(key);
          const isDimmed = hoveredSlot !== null && !highlightSet.has(key);

          return (
            <div
              key={key}
              style={{ position: 'absolute', left: x, top: y }}
            >
              <PedigreeCell
                node={node}
                slot={key}
                isHighlighted={isHighlighted}
                isDimmed={isDimmed}
                onMouseEnter={() => onHover(key)}
                onMouseLeave={() => onHover(null)}
                onClick={() => node && onSelect(key)}
                variant="tree"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mobile accordion ─────────────────────────────────────────────────────────

interface MobileAccordionProps {
  pedigreeJson: PedigreeJson;
  horseName: string;
  onSelect: (slot: SlotKey) => void;
}

function SlotRow({
  slotKey,
  pedigreeJson,
  onSelect,
}: {
  slotKey: SlotKey;
  pedigreeJson: PedigreeJson;
  onSelect: (slot: SlotKey) => void;
}) {
  const node = pedigreeJson[slotKey] as PedigreeNode | undefined;
  return (
    <PedigreeCell
      node={node}
      slot={slotKey}
      isHighlighted={false}
      isDimmed={false}
      onMouseEnter={() => {}}
      onMouseLeave={() => {}}
      onClick={() => node && onSelect(slotKey)}
      variant="accordion"
    />
  );
}

function MobileAccordion({ pedigreeJson, horseName, onSelect }: MobileAccordionProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Subject */}
      <div className="rounded-lg border border-midnight bg-midnight px-4 py-3 text-center">
        <p className="font-heading font-bold italic text-paper text-base">
          {horseName}
        </p>
      </div>

      <AccordionPrimitive.Root
        type="multiple"
        defaultValue={['gen1', 'gen2']}
        className="flex flex-col gap-2"
      >
        {/* Gen 1 */}
        <AccordionPrimitive.Item value="gen1">
          <AccordionPrimitive.Trigger
            className={cn(
              'flex w-full items-center justify-between rounded-lg border border-fog bg-white px-4 py-3',
              'text-sm font-medium text-charcoal',
              'data-[state=open]:rounded-b-none',
              '[&[data-state=open]>svg]:rotate-180',
            )}
          >
            Parents (2)
            <ChevronDownIcon className="h-4 w-4 shrink-0 transition-transform duration-200" />
          </AccordionPrimitive.Trigger>
          <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="flex flex-col gap-2 rounded-b-lg border border-t-0 border-fog bg-paper/50 p-3">
              {(['s', 'd'] as SlotKey[]).map((key) => (
                <SlotRow key={key} slotKey={key} pedigreeJson={pedigreeJson} onSelect={onSelect} />
              ))}
            </div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>

        {/* Gen 2 */}
        <AccordionPrimitive.Item value="gen2">
          <AccordionPrimitive.Trigger
            className={cn(
              'flex w-full items-center justify-between rounded-lg border border-fog bg-white px-4 py-3',
              'text-sm font-medium text-charcoal',
              'data-[state=open]:rounded-b-none',
              '[&[data-state=open]>svg]:rotate-180',
            )}
          >
            Grandparents (4)
            <ChevronDownIcon className="h-4 w-4 shrink-0 transition-transform duration-200" />
          </AccordionPrimitive.Trigger>
          <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="flex flex-col gap-2 rounded-b-lg border border-t-0 border-fog bg-paper/50 p-3">
              {(['ss', 'sd', 'ds', 'dd'] as SlotKey[]).map((key) => (
                <SlotRow key={key} slotKey={key} pedigreeJson={pedigreeJson} onSelect={onSelect} />
              ))}
            </div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>

        {/* Gen 3 */}
        <AccordionPrimitive.Item value="gen3">
          <AccordionPrimitive.Trigger
            className={cn(
              'flex w-full items-center justify-between rounded-lg border border-fog bg-white px-4 py-3',
              'text-sm font-medium text-charcoal',
              'data-[state=open]:rounded-b-none',
              '[&[data-state=open]>svg]:rotate-180',
            )}
          >
            Great-grandparents (8)
            <ChevronDownIcon className="h-4 w-4 shrink-0 transition-transform duration-200" />
          </AccordionPrimitive.Trigger>
          <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="flex flex-col gap-2 rounded-b-lg border border-t-0 border-fog bg-paper/50 p-3">
              {(['sss', 'ssd', 'sds', 'sdd', 'dss', 'dsd', 'dds', 'ddd'] as SlotKey[]).map((key) => (
                <SlotRow key={key} slotKey={key} pedigreeJson={pedigreeJson} onSelect={onSelect} />
              ))}
            </div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>

        {/* Gen 4 */}
        <AccordionPrimitive.Item value="gen4">
          <AccordionPrimitive.Trigger
            className={cn(
              'flex w-full items-center justify-between rounded-lg border border-fog bg-white px-4 py-3',
              'text-sm font-medium text-charcoal',
              'data-[state=open]:rounded-b-none',
              '[&[data-state=open]>svg]:rotate-180',
            )}
          >
            Great-great-grandparents (16)
            <ChevronDownIcon className="h-4 w-4 shrink-0 transition-transform duration-200" />
          </AccordionPrimitive.Trigger>
          <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="flex flex-col gap-2 rounded-b-lg border border-t-0 border-fog bg-paper/50 p-3">
              {GEN4_ORDER.map((key) => (
                <SlotRow key={key} slotKey={key} pedigreeJson={pedigreeJson} onSelect={onSelect} />
              ))}
            </div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      </AccordionPrimitive.Root>
    </div>
  );
}

// ─── PedigreeTree (public export) ─────────────────────────────────────────────

interface PedigreeTreeProps {
  pedigreeJson: PedigreeJson;
  horseName: string;
}

export function PedigreeTree({ pedigreeJson, horseName }: PedigreeTreeProps) {
  const [hoveredSlot, setHoveredSlot] = useState<SlotKey | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotKey | null>(null);

  const highlightSet = useMemo(
    () =>
      hoveredSlot
        ? new Set(highlightedSlots(hoveredSlot))
        : new Set<SlotKey>(),
    [hoveredSlot],
  );

  const selectedNode = selectedSlot
    ? (pedigreeJson[selectedSlot] as PedigreeNode | undefined) ?? null
    : null;

  // Empty pedigree guard
  if (Object.keys(pedigreeJson).length === 0) {
    return (
      <div className="rounded-lg border border-fog bg-paper p-8 text-center">
        <p className="text-sm text-charcoal-soft">
          Pedigree not yet recorded. Contact the syndicator for more detail.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop tree */}
      <div className="hidden md:block">
        <DesktopTree
          pedigreeJson={pedigreeJson}
          horseName={horseName}
          hoveredSlot={hoveredSlot}
          highlightSet={highlightSet}
          onHover={setHoveredSlot}
          onSelect={setSelectedSlot}
        />
      </div>

      {/* Mobile accordion */}
      <div className="md:hidden">
        <MobileAccordion
          pedigreeJson={pedigreeJson}
          horseName={horseName}
          onSelect={setSelectedSlot}
        />
      </div>

      {/* Ancestor drawer */}
      <PedigreeDrawer
        node={selectedNode}
        slot={selectedSlot}
        open={selectedSlot !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSlot(null);
        }}
      />
    </>
  );
}
