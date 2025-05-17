import { EmptyState, Pagination, SharedHeader, VideoCard } from "@/components";
import { getAllVideos } from "@/lib/actions/video";
import { Video } from "@/types/video";
import { Metadata } from "next";

type SearchParams = {
  query?: string;
  filter?: string;
  page?: string;
};

export const metadata: Metadata = {
  title: 'SnapCast - Video Library',
  description: 'Browse and manage your video library',
};

const Page = async ({ searchParams }: { searchParams: SearchParams }) => {
  const { query, filter, page } = searchParams;
  const currentPage = Number(page) || 1;
  const limit = 10;
  const offset = (currentPage - 1) * limit;

  const { videos, totalCount } = await getAllVideos({
    searchQuery: query,
    sortFilter: filter,
    offset,
    limit
  });

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <main className="wrapper page">
      <SharedHeader subHeader="Public Library" title="All Videos" />

      {videos?.length > 0 ? (
        <section className="video-grid">
          {videos.map((video: Video) => (
            <VideoCard
              key={video.id}
              id={video.video_id}
              title={video.title}
              thumbnail={video.thumbnail_url || ''}
              createdAt={new Date(video.created_at)}
              userImg={video.user?.image || ''}
              username={video.user?.name || 'Guest'}
              views={video.views}
              visibility={video.is_public ? 'public' : 'private'}
              duration={0} // Duration not available in the current Video type
            />
          ))}
        </section>
      ) : (
        <EmptyState
          icon="/assets/icons/video.svg"
          title="No Videos Found"
          description="Try adjusting your search."
        />
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          queryString={query || ''}
          filterString={filter || ''}
        />
      )}
    </main>
  );
};

export default Page;
