import type { Metadata } from 'next';
import { CostCalculator } from '@/components/handbook/CostCalculator';

export const metadata: Metadata = {
  title: 'Racehorse ownership cost calculator | Horse Racing Shares',
  description:
    'Calculate the real 3-year cost of owning a racehorse share in Australia. Enter your share size, upfront price, and weekly fees.',
};

export default function TheNumbersPage() {
  return (
    <main className="min-h-svh bg-paper pb-24">
      <CostCalculator />
    </main>
  );
}
