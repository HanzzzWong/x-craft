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
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn('YOUTUBE_API_KEY is not defined.  Returning mock YouTube videos.');
    return [
      {
        title: 'DIY Project Tutorial',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
    ];
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q=${encodeURIComponent(
        query
      )}&key=${apiKey}&type=video`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.items) {
      console.log('No videos found for query:', query);
      return [];
    }

    const videos: YouTubeVideo[] = data.items.map((item: any) => ({
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    return videos;
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    return [];
  }
}
