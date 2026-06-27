'use client';
import { OfferPDFTemplate } from "@/components/sme-pricing/OfferPDFTemplate";
import { format } from "date-fns";

export default function TestPdfPage() {
  return (
    <div className="p-8 bg-black min-h-screen flex items-center justify-center">
      <OfferPDFTemplate
        language="en"
        offerName="Test Offer"
        companyName="IWIB Demo Corp"
        date={format(new Date(), 'dd/MM/yyyy')}
        plans={[]}
        snapshots={{}}
        memberCounts={{employee: 10, spouse: 5, child: 2}}
      />
    </div>
  );
}
