import { Body, Caption, Display, Small } from "@/components/typography";
import { SilksQuadrant } from "@/components/icons";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <SilksQuadrant size={56} className="mb-8" />

      <Small className="font-serif italic tracking-wide">
        horseracingshares.com
      </Small>

      <Display className="mt-6 max-w-3xl">
        The Australian home of racehorse shares.
      </Display>

      <Body className="mt-6 max-w-xl text-charcoal-soft">
        Browse shares in Australian racehorses — from 1% micro-shares to 10% stakes.
        Every listing is backed by a licensed syndicator and a Product Disclosure Statement.
      </Body>

      <Caption className="mt-10 uppercase tracking-[0.2em]">
        Launching 2026
      </Caption>
    </main>
  );
}
