import BookingExperience from "../../../components/BookingExperience";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return {
    title: "Онлайн-запись",
    description: `Онлайн-запись к мастеру ${slug}`,
  };
}

export default async function PublicMasterBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BookingExperience masterSlug={slug} title="Онлайн-запись" />;
}
