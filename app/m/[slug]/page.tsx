import BookingExperience from "../../../components/BookingExperience";

export default async function PublicMasterBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BookingExperience masterSlug={slug} title="Онлайн-запись" />;
}
