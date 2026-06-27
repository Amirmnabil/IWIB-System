import EndorsementDetails from "@/components/endorsements/EndorsementDetails";

export default async function EndorsementDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EndorsementDetails id={id} />;
}
