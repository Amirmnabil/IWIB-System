import type { SMEOffer, SMEPlan } from './types';

export async function generatePremiumPDF(offerId: string, data: {
  offerName: string;
  companyName: string;
  date: string;
  plans: SMEPlan[];
  snapshots: Record<string, any>;
  chat?: { side: 'left' | 'right', author?: string, text: string }[];
}) {
  const response = await fetch('/api/generate-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      offerId,
      ...data
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to generate PDF');
  }

  return await response.json();
}
