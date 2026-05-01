import BookingExperience from "../../../components/BookingExperience";

export default async function PublicMasterBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  await params;
  return <BookingExperience title="Онлайн-запись" />;
}
