import React, { useEffect, useState, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import { getAccessToken, googleSignIn, initAuth, logout } from './auth';
import { LoginButton } from './components/LoginButton';
import { fetchPlaylistItems, fetchPlaylists, fetchPlaylistById, parseMediaTitle, searchOmdb } from './api';
import { YouTubePlaylist, YouTubePlaylistItem } from './types';
import { LogOut, MonitorPlay, ArrowLeft, PlaySquare, ListVideo, Terminal, ChevronUp, ChevronDown, Copy, Trash2, ArrowRight, Sparkles, Film, ExternalLink, Menu, X, Search, Plus, UserCircle, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter as Router, useNavigate, useLocation } from 'react-router-dom';

import { Chat } from './components/Chat';

export interface ErrorLog {
  id: string;
  time: Date;
  message: string;
  details: string;
}

const ErrorConsole = ({ logs, setLogs }: { logs: ErrorLog[], setLogs: (logs: ErrorLog[]) => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (logs.length === 0) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.map(l => `[${l.time.toLocaleTimeString()}] ${l.message}\n${l.details}`).join('\n\n'));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1e1e1e] border-t border-gray-800 shadow-2xl flex flex-col max-h-[50vh]">
      <div 
        className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] cursor-pointer hover:bg-[#3d3d3d] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2 text-red-400">
          <Terminal className="w-4 h-4" />
          <span className="text-xs font-semibold">{logs.length} Error{logs.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center space-x-3 text-gray-500">
           <button 
             onClick={(e) => { e.stopPropagation(); setLogs([]); }} 
             className="hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 rounded p-1 transition-colors" 
             title="Clear All"
             aria-label="Clear All Errors"
           >
             <Trash2 className="w-4 h-4" />
           </button>
           {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </div>
      {isExpanded && (
        <div className="overflow-y-auto p-4 space-y-4 max-h-[40vh]">
           <div className="flex justify-end mb-2">
             <button 
               onClick={(e) => { e.stopPropagation(); handleCopy(); }}
               className="flex items-center space-x-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
               aria-label="Copy All Errors"
             >
               <Copy className="w-3 h-3" />
               <span>Copy All</span>
             </button>
           </div>
           {logs.map(log => (
             <div key={log.id} className="text-xs font-mono">
               <div className="text-gray-500 mb-1">[{log.time.toLocaleTimeString()}] <span className="text-red-400 font-bold">{log.message}</span></div>
               <pre className="text-gray-600 whitespace-pre-wrap break-words bg-black/30 p-2 rounded border border-gray-800">{log.details}</pre>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

function PlaylistItemRow({ item, playlistId, logError }: { key?: React.Key; item: YouTubePlaylistItem, playlistId: string, logError: (msg: string, err: any) => void }) {
  const [parsedTitle, setParsedTitle] = useState<string | null>(null);
  const [omdbData, setOmdbData] = useState<any | null>(null);
  const [isDmmLoading, setIsDmmLoading] = useState(false);

  const handleDmmSearch = async () => {
    setIsDmmLoading(true);
    try {
      let data = omdbData;
      if (!data) {
        let currentParsed = parsedTitle;
        if (!currentParsed) {
          currentParsed = await parseMediaTitle(item.snippet.title);
          setParsedTitle(currentParsed);
        }
        if (currentParsed) {
          data = await searchOmdb(currentParsed);
          if (!data.Error) {
            setOmdbData(data);
          }
        }
      }
      
      if (data && data.Search && data.Search.length > 0) {
        const imdbId = data.Search[0].imdbID;
        window.open(`https://x.debridmediamanager.com/${imdbId}`, '_blank');
      } else if (data && data.imdbID) {
        window.open(`https://x.debridmediamanager.com/${data.imdbID}`, '_blank');
      } else {
        const errorMessage = data?.Error ? data.Error : 'No valid IMDb ID found';
        logError('No results found in OMDB', new Error(errorMessage));
      }
    } catch (err: any) {
      logError('Failed to open DMM', err);
    } finally {
      setIsDmmLoading(false);
    }
  };

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden flex flex-row bg-gray-900 hover:bg-gray-800 transition-colors p-3 sm:p-4 gap-3 sm:gap-4 items-stretch focus-within:ring-2 focus-within:ring-indigo-500/50">
      <a 
        href={`https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}&list=${playlistId}`}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 block rounded-md overflow-hidden bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 self-start"
        aria-label={`Watch ${item.snippet.title} on YouTube`}
      >
        {item.snippet.thumbnails.default ? (
          <img
            src={item.snippet.thumbnails.default.url}
            alt={item.snippet.title}
            className="w-[120px] h-[90px] object-cover hover:opacity-80 transition-opacity"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-[120px] h-[90px] flex items-center justify-center text-gray-500">
            <PlaySquare className="w-6 h-6" />
          </div>
        )}
      </a>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <h3 className="text-sm font-semibold">
          <a 
            href={`https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}&list=${playlistId}`}
            target="_blank"
            rel="noreferrer"
            className="text-gray-100 hover:text-blue-400 transition-colors line-clamp-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm"
          >
            {item.snippet.title}
          </a>
        </h3>
        
        <div className="flex flex-wrap gap-2 items-center mt-2">
          <button
            onClick={handleDmmSearch}
            disabled={isDmmLoading}
            className="flex items-center space-x-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-100 px-2.5 py-1.5 rounded transition-colors disabled:opacity-50 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label={`Search DMM for ${item.snippet.title}`}
          >
            {isDmmLoading ? (
             <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5" />
            )}
            <span>DMM</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function InnerApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);

  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);
  
  const [customUrl, setCustomUrl] = useState('');
  const [isLoadingCustom, setIsLoadingCustom] = useState(false);

  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const playlistCacheRef = useRef<Record<string, {items: YouTubePlaylistItem[], nextPageToken: string | null}>>({});

  const logError = useCallback((msg: string, err: any) => {
    console.error(msg, err);
    const details = err instanceof Error ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
    setErrorLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      time: new Date(),
      message: msg,
      details
    }]);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    setPlaylists([]);
    setSelectedPlaylist(null);
    
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('playlistId')) {
        url.searchParams.delete('playlistId');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, []);

  const [selectedPlaylist, setSelectedPlaylist] = useState<YouTubePlaylist | null>(null);
  const [playlistItems, setPlaylistItems] = useState<YouTubePlaylistItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadPlaylists = useCallback(async (accessToken: string) => {
    setIsLoadingPlaylists(true);
    try {
      const data = await fetchPlaylists(accessToken);
      const sortedData = data.sort((a, b) => a.snippet.title.localeCompare(b.snippet.title));
      setPlaylists(sortedData);
    } catch (err: any) {
      if (err.status === 401) {
        handleLogout();
      } else {
        logError('Failed to load playlists', err);
      }
    } finally {
      setIsLoadingPlaylists(false);
    }
  }, [logError, handleLogout]);

  const handleSelectPlaylist = useCallback(async (playlist: YouTubePlaylist) => {
    setSelectedPlaylist(playlist);
    setItemSearchQuery('');
    
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('playlistId') !== playlist.id) {
        url.searchParams.set('playlistId', playlist.id);
        window.history.replaceState({}, '', url.toString());
      }
    }
    
    if (playlistCacheRef.current[playlist.id]) {
      const cached = playlistCacheRef.current[playlist.id];
      setPlaylistItems(cached.items);
      setNextPageToken(cached.nextPageToken);
      setIsLoadingItems(false);
      return;
    }

    setIsLoadingItems(true);
    setPlaylistItems([]);
    setNextPageToken(null);
    
    try {
      const currentToken = await getAccessToken();
      if (!currentToken) throw new Error('Not authenticated');
      const response = await fetchPlaylistItems(currentToken, playlist.id);
      setPlaylistItems(response.items);
      setNextPageToken(response.nextPageToken);
      playlistCacheRef.current[playlist.id] = {
        items: response.items,
        nextPageToken: response.nextPageToken
      };
    } catch (err: any) {
      if (err.status === 401) {
        handleLogout();
      } else {
        logError('Failed to load playlist items', err);
      }
    } finally {
      setIsLoadingItems(false);
    }
  }, [logError, handleLogout]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setUser(user);
        setToken(token);
        setNeedsAuth(false);
        setIsAuthLoading(false);
      },
      () => {
        setNeedsAuth(true);
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const initialPlaylistLoaded = useRef(false);

  useEffect(() => {
    if (!token) return;
    
    // First, trigger the loading of the user's playlist sidebar
    loadPlaylists(token);

    // Then, check if we need to load a specific playlist from the URL
    if (!initialPlaylistLoaded.current && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const playlistIdFromUrl = urlParams.get('playlistId');
      
      if (playlistIdFromUrl) {
        initialPlaylistLoaded.current = true;
        setIsLoadingCustom(true);
        fetchPlaylistById(token, playlistIdFromUrl)
          .then(playlist => {
            handleSelectPlaylist(playlist);
          })
          .catch((err: any) => {
            if (err.status === 401) {
              handleLogout();
            } else {
              logError('Failed to load shared playlist', err);
            }
          })
          .finally(() => {
            setIsLoadingCustom(false);
          });
      }
    }
  }, [token, loadPlaylists, handleSelectPlaylist, logError, handleLogout]);



  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      const isMissingState = err?.message?.toLowerCase().includes('missing initial state');
      if (isMissingState && window.self !== window.top) {
        setAuthError('Authentication is blocked in this preview by your browser\'s storage settings. Please open the app in a new tab.');
      } else {
        logError('Could not sign you in. Please try again.', err);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLoadCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    let playlistId = customUrl.trim();
    try {
      if (playlistId.includes('youtube.com') || playlistId.includes('youtu.be')) {
        const urlStr = playlistId.startsWith('http') ? playlistId : `https://${playlistId}`;
        const urlObj = new URL(urlStr);
        const listParam = urlObj.searchParams.get('list');
        if (listParam) {
          playlistId = listParam;
        }
      }
    } catch (e) {
      // Keep original trimmed string as ID if parsing fails completely
    }

    if (!playlistId) {
      logError('Invalid Playlist URL or ID', 'Could not extract list ID from the input.');
      return;
    }

    setIsLoadingCustom(true);
    try {
      const currentToken = await getAccessToken();
      if (!currentToken) throw new Error('Not authenticated');
      const playlist = await fetchPlaylistById(currentToken, playlistId);
      await handleSelectPlaylist(playlist);
      setCustomUrl('');
    } catch(err: any) {
      if (err.status === 401) {
        handleLogout();
      } else {
        logError('Failed to load custom playlist', err);
      }
    } finally {
      setIsLoadingCustom(false);
    }
  };

  const handleLoadMoreItems = async () => {
    if (!selectedPlaylist || !nextPageToken) return;
    setIsLoadingMore(true);
    try {
      const currentToken = await getAccessToken();
      if (!currentToken) throw new Error('Not authenticated');
      const response = await fetchPlaylistItems(currentToken, selectedPlaylist.id, nextPageToken);
      
      setPlaylistItems(prev => {
        const newItems = [...prev, ...response.items];
        playlistCacheRef.current[selectedPlaylist.id] = {
          items: newItems,
          nextPageToken: response.nextPageToken
        };
        return newItems;
      });
      setNextPageToken(response.nextPageToken);
    } catch (err: any) {
      if (err.status === 401) {
        handleLogout();
      } else {
        logError('Failed to load more items', err);
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleBackToPlaylists = () => {
    setSelectedPlaylist(null);
    setPlaylistItems([]);
    setNextPageToken(null);
    setItemSearchQuery('');
    
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('playlistId')) {
        url.searchParams.delete('playlistId');
        window.history.replaceState({}, '', url.toString());
      }
    }
  };

  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextPageToken && !isLoadingMore) {
          handleLoadMoreItems();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [nextPageToken, isLoadingMore, selectedPlaylist, itemSearchQuery]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-600 border-t-indigo-500 rounded-full" />
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full flex flex-col items-center text-center space-y-6">
          <div className="w-12 h-12 flex items-center justify-center text-gray-100 border border-gray-800 rounded-xl bg-gray-800/50">
            <MonitorPlay className="w-6 h-6" />
          </div>
          <LoginButton onClick={handleLogin} isLoading={isLoggingIn} />
          
          {authError && (
            <div className="text-sm text-red-400 w-full mt-6 p-4 bg-red-900/10 border border-red-900/30 rounded-lg flex flex-col items-center gap-4 text-center">
              <p>{authError}</p>
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-gray-200 rounded-md hover:bg-gray-700 transition-colors border border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <ErrorConsole logs={errorLogs} setLogs={setErrorLogs} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden text-gray-100 font-sans">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 z-30 bg-gray-900/50 transition-opacity lg:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsSidebarOpen(false)} 
      />

      {/* Sidebar */}
      <aside 
        aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-40 shrink-0 w-80 bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 lg:ml-0' : '-translate-x-full lg:-ml-80'}`}
      >
        {/* Sidebar Header & Fixed Forms */}
        <div className="shrink-0 border-b border-gray-800 sticky top-0 bg-gray-900 z-10 px-4 py-3.5 flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(prev => !prev)} 
            className="p-1.5 -ml-1.5 text-gray-400 hover:text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600 transition-colors shrink-0"
            aria-label="Toggle Sidebar"
          >
             <Menu className="w-5 h-5" />
          </button>
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors"
              aria-label="Search playlists"
            />
          </div>
        </div>

        {/* Sidebar Playlists */}
        <div className="flex-1 overflow-y-auto p-2 bg-[#0f0f0f]">
          {isLoadingPlaylists ? (
            <div className="p-4 flex justify-center">
               <span className="animate-spin inline-block w-5 h-5 border-2 border-gray-700 border-t-transparent rounded-full" />
            </div>
          ) : playlists.filter(playlist => playlist.snippet.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
               {searchQuery ? "No matching playlists." : "No playlists found."}
            </div>
          ) : (
            <ul className="space-y-1">
              {playlists.filter(playlist => playlist.snippet.title.toLowerCase().includes(searchQuery.toLowerCase())).map((playlist) => (
                <li key={playlist.id}>
                  <button
                    onClick={() => {
                      handleSelectPlaylist(playlist);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${selectedPlaylist?.id === playlist.id ? 'bg-indigo-900/40 text-indigo-300' : 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'}`}
                    aria-label={`Select playlist ${playlist.snippet.title}`}
                    aria-current={selectedPlaylist?.id === playlist.id ? 'true' : undefined}
                  >
                    {playlist.snippet.thumbnails?.default?.url ? (
                      <img src={playlist.snippet.thumbnails.default.url} alt="" className="w-10 h-8 object-cover rounded shrink-0 shadow-sm" />
                    ) : (
                      <div className="w-10 h-8 bg-gray-800 rounded shrink-0 flex items-center justify-center shadow-sm">
                        <ListVideo className={`w-4 h-4 ${selectedPlaylist?.id === playlist.id ? 'text-indigo-400' : 'text-gray-500'}`} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col items-start text-left">
                      <div className={`text-sm font-medium truncate w-full ${selectedPlaylist?.id === playlist.id ? 'text-indigo-100' : 'text-gray-100'}`}>
                         {playlist.snippet.title}
                      </div>
                      {playlist.contentDetails?.itemCount !== undefined && (
                        <div className="text-xs text-gray-500">
                          {playlist.contentDetails.itemCount} video{playlist.contentDetails.itemCount !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Sidebar Footer - Account */}
        <details className="border-t border-gray-800 sticky bottom-0 bg-gray-900 group">
          <summary className="w-full flex items-center justify-between p-4 focus:outline-none hover:bg-gray-800/50 cursor-pointer transition-colors list-none [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3 w-full min-w-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full border border-gray-700 shrink-0" />
              ) : (
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700 text-gray-400 shrink-0">
                  <UserCircle className="w-5 h-5" />
                </div>
              )}
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-sm font-medium text-gray-200 truncate w-full text-left">
                  {user?.displayName || 'My Account'}
                </span>
              </div>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-500 shrink-0 ml-2 group-open:hidden" />
            <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 ml-2 hidden group-open:block" />
          </summary>
          <div className="p-2 border-t border-gray-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-gray-600 font-medium px-4 py-3 rounded-md transition-colors"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
            <div className="px-4 py-2 border-t border-gray-800/50 mt-1">
              <span className="text-xs text-gray-500 font-mono block text-center">
                build: {import.meta.env.VITE_BUILD_ID || 'dev-local'}
              </span>
            </div>
          </div>
        </details>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#0f0f0f] relative">
        {/* Main Content Header */}
        <header className="bg-gray-900 border-b border-gray-800 shrink-0 z-10 px-4 py-3.5 flex items-center justify-between gap-4">
          {location.pathname === '/chat' ? (
            <div className="flex items-center gap-2 w-full">
               <button 
                 onClick={() => navigate(-1)}
                 className="p-2 -ml-2 text-gray-500 hover:text-gray-100 hover:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-600 transition-colors shrink-0"
                 aria-label="Back"
               >
                 <ArrowLeft className="w-5 h-5" />
               </button>
            </div>
          ) : isMobileSearchExpanded ? (
            <div className="flex items-center gap-2 w-full">
               <button 
                 onClick={() => setIsMobileSearchExpanded(false)}
                 className="p-2 -ml-2 text-gray-500 hover:text-gray-100 hover:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-600 transition-colors shrink-0"
                 aria-label="Close search"
               >
                 <ArrowLeft className="w-5 h-5" />
               </button>
               <div className="relative flex-1">
                 <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                 <input
                   autoFocus
                   type="text"
                   value={itemSearchQuery}
                   onChange={(e) => setItemSearchQuery(e.target.value)}
                   className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                   aria-label="Search videos in playlist"
                 />
               </div>
               <button
                 onClick={() => navigate('/chat')}
                 className="p-2 -mr-2 text-indigo-400 hover:text-indigo-300 hover:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-600 transition-colors shrink-0"
                 aria-label="AI Features"
               >
                 <Sparkles className="w-5 h-5" />
               </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                 {!isSidebarOpen && (
                   <button 
                     onClick={() => setIsSidebarOpen(true)} 
                     className="p-2 -ml-2 text-gray-500 hover:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-600 transition-colors shrink-0"
                     aria-label="Open Sidebar"
                   >
                      <Menu className="w-5 h-5" />
                   </button>
                 )}
                 
                 {selectedPlaylist ? (
                   <div className="flex items-center gap-3 min-w-0 flex-1">
                      {selectedPlaylist.snippet.thumbnails.default ? (
                        <img src={selectedPlaylist.snippet.thumbnails.default.url} alt="" className="w-10 h-10 object-cover rounded shadow-sm shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center shadow-sm shrink-0">
                          <PlaySquare className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                         <a 
                           href={`https://www.youtube.com/playlist?list=${selectedPlaylist.id}`} 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           className="font-medium text-sm sm:text-base text-gray-100 hover:text-blue-400 hover:underline truncate tracking-tight block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm"
                         >
                           {selectedPlaylist.snippet.title}
                         </a>
                         <p className="text-xs text-gray-500 truncate">{playlistItems.length}/{selectedPlaylist.contentDetails?.itemCount} videos</p>
                      </div>
                   </div>
                 ) : null}
              </div>
              {selectedPlaylist && (
                 <>
                   {/* Mobile Search Button */}
                   <button 
                     onClick={() => setIsMobileSearchExpanded(true)}
                     className="sm:hidden p-2 -mr-2 text-gray-500 hover:text-gray-100 hover:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-600 transition-colors shrink-0"
                     aria-label="Open search"
                   >
                     <Search className="w-5 h-5" />
                   </button>
                   
                   {/* Desktop Search Bar */}
                   <div className="hidden sm:block relative shrink-0 w-64">
                      <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                         type="text"
                         value={itemSearchQuery}
                         onChange={(e) => setItemSearchQuery(e.target.value)}
                         className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                         aria-label="Search videos in playlist"
                      />
                   </div>
                   
                   <button
                     onClick={() => navigate('/chat')}
                     className="p-2 -mr-2 sm:mr-0 text-indigo-400 hover:text-indigo-300 hover:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-600 transition-colors shrink-0 ml-1 sm:ml-2"
                     aria-label="AI Features"
                   >
                     <Sparkles className="w-5 h-5" />
                   </button>
                 </>
              )}
            </>
          )}
        </header>

        {/* Main Content Area */}
        {location.pathname === '/chat' ? (
          <div className="flex-1 flex flex-col relative min-h-0">
            <Chat 
              selectedPlaylist={selectedPlaylist} 
              initialItems={playlistItems} 
              initialNextPageToken={nextPageToken} 
              onContextLoaded={(items, token) => {
                setPlaylistItems(items);
                setNextPageToken(token);
                if (selectedPlaylist) {
                  playlistCacheRef.current[selectedPlaylist.id] = {
                    items,
                    nextPageToken: token
                  };
                }
              }}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 flex flex-col min-h-0">
          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
             {!selectedPlaylist ? (
                <div className="flex-1 flex items-center justify-center">
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="flex flex-col items-center justify-center py-20 text-center w-full rounded-2xl border-2 border-dashed border-gray-800 hover:border-gray-600 hover:bg-gray-800/30 transition-all cursor-pointer group focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
                  >
                     <div className="w-12 h-12 mb-4 bg-gray-800/50 group-hover:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 group-hover:text-indigo-400 transition-all">
                       <Plus className="w-6 h-6" />
                     </div>
                     <h3 className="text-xl font-medium text-gray-300 group-hover:text-white transition-colors">Select a playlist</h3>
                  </button>
                </div>
             ) : isLoadingItems ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="bg-gray-900 h-24 rounded-lg animate-pulse border border-gray-800"></div>
                  ))}
                </div>
             ) : playlistItems.length === 0 ? (
                <div className="py-20 text-center">
                   <p className="text-gray-500 text-sm">This playlist is empty.</p>
                </div>
             ) : (
                <div className="space-y-4">
                  {playlistItems
                    .filter(item => item.snippet.title.toLowerCase().includes(itemSearchQuery.toLowerCase()))
                    .map((item) => (
                    <PlaylistItemRow 
                      key={item.id} 
                      item={item} 
                      playlistId={selectedPlaylist.id} 
                      logError={logError} 
                    />
                  ))}
                  
                  {nextPageToken && (
                    <div ref={loaderRef} className="flex justify-center pt-8 pb-4">
                      <span className="animate-spin inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full overflow-hidden" />
                    </div>
                  )}
                </div>
             )}
          </div>
        </div>
        )}

        <ErrorConsole logs={errorLogs} setLogs={setErrorLogs} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <InnerApp />
    </Router>
  );
}
