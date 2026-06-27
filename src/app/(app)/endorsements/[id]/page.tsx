import EndorsementDetails from "@/components/endorsements/EndorsementDetails";

export default function EndorsementDetailsPage({ params }: { params: { id: string } }) {
  return <EndorsementDetails id={params.id} />;
}
