export interface YouTubePlaylist {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default?: { url: string; width?: number; height?: number };
      medium?: { url: string; width?: number; height?: number };
      high?: { url: string; width?: number; height?: number };
      standard?: { url: string; width?: number; height?: number };
      maxres?: { url: string; width?: number; height?: number };
    };
    channelTitle: string;
  };
  contentDetails: {
    itemCount: number;
  };
}

export interface YouTubePlaylistItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    playlistId: string;
    thumbnails: {
      default?: { url: string; width?: number; height?: number };
      medium?: { url: string; width?: number; height?: number };
      high?: { url: string; width?: number; height?: number };
      standard?: { url: string; width?: number; height?: number };
      maxres?: { url: string; width?: number; height?: number };
    };
    resourceId: {
      kind: string;
      videoId: string;
    };
  };
}
