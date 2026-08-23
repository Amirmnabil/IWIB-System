'use client';

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EndorsementDetailsPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const id = params?.id;
    if (id) {
      router.replace(`/endorsements?id=${id}`);
    } else {
      router.replace('/endorsements');
    }
  }, [params, router]);

  return (
    <div className="p-12 text-center text-slate-500 font-medium">
      Redirecting to endorsements hub...
    </div>
  );
}
