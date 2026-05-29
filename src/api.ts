import { YouTubePlaylist, YouTubePlaylistItem } from './types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

async function handleApiError(res: Response, defaultMessage: string) {
  let errMsg = `HTTP ${res.status} ${res.statusText}`;
  try {
    const errData = await res.json();
    if (errData.error?.message) {
      errMsg = errData.error.message;
      if (errData.error.details) errMsg += '\n' + JSON.stringify(errData.error.details, null, 2);
    } else {
      errMsg = JSON.stringify(errData, null, 2);
    }
  } catch (e) {
    try {
      errMsg = await res.text();
    } catch (e2) {
      // ignore
    }
  }
  const error = new Error(`${defaultMessage}: ${errMsg}`) as any;
  error.status = res.status;
  throw error;
}

export async function fetchPlaylists(accessToken: string): Promise<YouTubePlaylist[]> {
  let playlists: YouTubePlaylist[] = [];
  let nextPageToken: string | undefined;

  do {
    const url = new URL(`${YOUTUBE_API_BASE}/playlists`);
    url.searchParams.append('part', 'snippet,contentDetails');
    url.searchParams.append('mine', 'true');
    url.searchParams.append('maxResults', '50');
    if (nextPageToken) url.searchParams.append('pageToken', nextPageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      await handleApiError(res, 'Failed to fetch playlists');
    }

    const data = await res.json();
    playlists = playlists.concat(data.items || []);
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return playlists;
}

export async function fetchPlaylistById(accessToken: string, id: string): Promise<YouTubePlaylist> {
  const url = new URL(`${YOUTUBE_API_BASE}/playlists`);
  url.searchParams.append('part', 'snippet,contentDetails');
  url.searchParams.append('id', id);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    await handleApiError(res, 'Failed to fetch playlist by ID');
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('Playlist not found. It might be private or deleted.');
  }
  return data.items[0];
}

export interface PlaylistItemsResponse {
  items: YouTubePlaylistItem[];
  nextPageToken: string | null;
}

export async function fetchPlaylistItems(accessToken: string, playlistId: string, pageToken?: string): Promise<PlaylistItemsResponse> {
  const url = new URL(`${YOUTUBE_API_BASE}/playlistItems`);
  url.searchParams.append('part', 'snippet');
  url.searchParams.append('playlistId', playlistId);
  url.searchParams.append('maxResults', '50');
  if (pageToken) url.searchParams.append('pageToken', pageToken);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    await handleApiError(res, 'Failed to fetch playlist items');
  }

  const data = await res.json();
  return {
    items: data.items || [],
    nextPageToken: data.nextPageToken || null
  };
}

export async function parseMediaTitle(title: string): Promise<string> {
  const res = await fetch('/api/parse-title', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    await handleApiError(res, 'Failed to parse media title');
  }
  const data = await res.json();
  return data.parsedTitle;
}

export async function searchOmdb(parsedTitle: string): Promise<any> {
  let title = parsedTitle.trim();
  let yearMatch = '';

  const match = parsedTitle.match(/^(.*?)[\s(]*\b((?:19|20)\d{2})\b[\s)]*$/);
  if (match) {
    title = match[1].trim() || title;
    yearMatch = match[2];
  }

  const url = new URL('https://www.omdbapi.com/');
  url.searchParams.append('apikey', 'fa8789fb');
  url.searchParams.append('s', title);
  if (yearMatch) {
    url.searchParams.append('y', yearMatch);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error('Failed to fetch from OMDB');
  }
  let data = await res.json();
  
  if (data.Response === "False" && yearMatch) {
    const fallbackUrl = new URL('https://www.omdbapi.com/');
    fallbackUrl.searchParams.append('apikey', 'fa8789fb');
    fallbackUrl.searchParams.append('s', title);
    const fallbackRes = await fetch(fallbackUrl.toString());
    if (fallbackRes.ok) {
      data = await fallbackRes.json();
    }
  }
  
  return data;
}
