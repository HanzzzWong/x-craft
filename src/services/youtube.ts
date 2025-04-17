/**
 * Represents a YouTube video with a title and URL.
 */
export interface YouTubeVideo {
  /**
   * The title of the YouTube video.
   */
  title: string;
  /**
   * The URL of the YouTube video.
   */
  url: string;
}

/**
 * Asynchronously retrieves YouTube videos related to a search query.
 *
 * @param query The search query to use when retrieving YouTube videos.
 * @returns A promise that resolves to an array of YouTubeVideo objects.
 */
export async function getYouTubeVideos(query: string): Promise<YouTubeVideo[]> {
  // TODO: Implement this by calling an API.

  return [
    {
      title: 'DIY Project Tutorial',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
  ];
}
