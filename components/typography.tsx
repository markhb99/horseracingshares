import * as React from "react";

import { cn } from "@/lib/utils";

type Props<T extends React.ElementType> = {
  as?: T;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className">;

function Display<T extends React.ElementType = "h1">({
  as,
  className,
  ...props
}: Props<T>) {
  const Comp = (as ?? "h1") as React.ElementType;
  return <Comp className={cn("text-display", className)} {...props} />;
}

function H1<T extends React.ElementType = "h1">({
  as,
  className,
  ...props
}: Props<T>) {
  const Comp = (as ?? "h1") as React.ElementType;
  return <Comp className={cn("text-h1", className)} {...props} />;
}

function H2<T extends React.ElementType = "h2">({
  as,
  className,
  ...props
}: Props<T>) {
  const Comp = (as ?? "h2") as React.ElementType;
  return <Comp className={cn("text-h2", className)} {...props} />;
}

function H3<T extends React.ElementType = "h3">({
  as,
  className,
  ...props
}: Props<T>) {
  const Comp = (as ?? "h3") as React.ElementType;
  return <Comp className={cn("text-h3", className)} {...props} />;
}

function H4<T extends React.ElementType = "h4">({
  as,
  className,
  ...props
}: Props<T>) {
  const Comp = (as ?? "h4") as React.ElementType;
  return <Comp className={cn("text-h4", className)} {...props} />;
}

function H5<T extends React.ElementType = "h5">({
  as,
  className,
  ...props
}: Props<T>) {
  const Comp = (as ?? "h5") as React.ElementType;
  return <Comp className={cn("text-h5", className)} {...props} />;
}

function Body<T extends React.ElementType = "p">({
  as,
  className,
  ...props
}: Props<T>) {
  const Comp = (as ?? "p") as React.ElementType;
  return <Comp className={cn("text-body-type", className)} {...props} />;
}

function Lead<T extends React.ElementType = "p">({
  as,
  className,
  ...props
}: Props<T>) {
  const Comp = (as ?? "p") as React.ElementType;
  return <Comp className={cn("text-lead", className)} {...props} />;
}

function Small<T extends React.ElementType = "p">({
  as,
  className,
  ...props
}: Props<T>) {
  const Comp = (as ?? "p") as React.ElementType;
  return <Comp className={cn("text-small-type text-charcoal-soft", className)} {...props} />;
}

function Caption<T extends React.ElementType = "p">({
  as,
  className,
  ...props
}: Props<T>) {
  const Comp = (as ?? "p") as React.ElementType;
  return <Comp className={cn("text-caption-type text-charcoal-soft", className)} {...props} />;
}

function Mono<T extends React.ElementType = "span">({
  as,
  className,
  ...props
}: Props<T>) {
  const Comp = (as ?? "span") as React.ElementType;
  return <Comp className={cn("text-mono-type", className)} {...props} />;
}

/**
 * Bloodstock convention: sire × dam crosses set in Fraunces italic.
 * Keeps sire and dam at identical size and weight (no shrinking).
 */
function SireDam({
  sire,
  dam,
  className,
}: {
  sire: string;
  dam: string;
  className?: string;
}) {
  return (
    <span className={cn("font-serif italic font-bold", className)}>
      {sire} <span aria-hidden="true">×</span> {dam}
    </span>
  );
}

export { Display, H1, H2, H3, H4, H5, Body, Lead, Small, Caption, Mono, SireDam };
