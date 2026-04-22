export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-serif italic text-sm tracking-wide text-charcoal-soft">
        horseracingshares.com
      </p>
      <h1 className="mt-6 font-serif text-4xl md:text-6xl font-bold tracking-tight text-charcoal">
        The Australian home of racehorse shares.
      </h1>
      <p className="mt-6 max-w-xl text-base md:text-lg text-charcoal-soft">
        Browse shares in Australian racehorses — from 1% micro-shares to 10% stakes. Every listing
        is backed by a licensed syndicator and a Product Disclosure Statement.
      </p>
      <p className="mt-10 text-xs uppercase tracking-[0.2em] text-charcoal-soft">
        Launching 2026.
      </p>
    </main>
  );
}
