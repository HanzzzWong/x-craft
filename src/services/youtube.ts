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
  /**
   * The embed URL for the YouTube video.
   */
  embedUrl: string;
  /**
   * The thumbnail URL for the YouTube video.
   */
  thumbnailUrl: string;
  /**
   * The channel title of the video creator.
   */
  channelTitle: string;
}

// Using the provided API key
const YOUTUBE_API_KEY = 'AIzaSyC6Ahpos1gWC3_VNWi2LQOG4RbyBsCMUVI';

/**
 * Asynchronously retrieves YouTube videos related to a search query.
 *
 * @param query The search query to use when retrieving YouTube videos.
 * @param isStep Whether the query is for a specific project step.
 * @returns A promise that resolves to an array of YouTubeVideo objects.
 */
export async function getYouTubeVideos(query: string, isStep: boolean = false): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('YOUTUBE_API_KEY is not defined. Returning mock YouTube videos.');
    return [
      {
        title: 'DIY Project Tutorial',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
        channelTitle: 'DIY Channel'
      },
    ];
  }

  try {
    // Enhance the query for step-specific DIY searches
    const enhancedQuery = isStep 
      ? `DIY tutorial how to ${query} step by step` 
      : `DIY ${query} project ideas`;
    
    const params = new URLSearchParams({
      part: 'snippet',
      maxResults: '3',
      q: enhancedQuery,
      key: YOUTUBE_API_KEY,
      type: 'video',
      relevanceLanguage: 'en',
      videoEmbeddable: 'true',
      videoDuration: 'medium', // Filter for medium-length videos (4-20 mins)
      order: 'relevance',      // Sort by relevance
      safeSearch: 'strict',    // Ensure content is appropriate
    });

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log('No videos found for query:', query);
      return [];
    }

    const videos: YouTubeVideo[] = data.items.map((item: any) => {
      const videoId = item.id.videoId;
      return {
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0`,
        thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        channelTitle: item.snippet.channelTitle || 'YouTube Channel'
      };
    });

    return videos;
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    return [];
  }
}
