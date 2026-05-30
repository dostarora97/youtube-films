import React, { useState, useRef, useEffect } from 'react';
import { YouTubePlaylist, YouTubePlaylistItem } from '../types';
import { getAccessToken } from '../auth';
import { fetchPlaylistItems } from '../api';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';

interface ChatProps {
  selectedPlaylist: YouTubePlaylist | null;
  initialItems: YouTubePlaylistItem[];
  initialNextPageToken: string | null;
  onContextLoaded?: (items: YouTubePlaylistItem[], nextPageToken: string | null) => void;
}

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const Chat: React.FC<ChatProps> = ({ selectedPlaylist, initialItems, initialNextPageToken, onContextLoaded }) => {
  const [items, setItems] = useState<YouTubePlaylistItem[]>(initialItems);
  const [nextPageToken, setNextPageToken] = useState<string | null>(initialNextPageToken);
  const [isLoadingContext, setIsLoadingContext] = useState(!!initialNextPageToken);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Remove smooth scrolling to prevent browser freezing issues
    messagesEndRef.current?.scrollIntoView();
  }, [messages, isLoadingContext]);

  useEffect(() => {
    let isMounted = true;
    
    const loadAllContext = async () => {
      if (!selectedPlaylist) return;
      
      let currentToken = initialNextPageToken;
      let currentItems = [...initialItems];
      let hasMore = !!currentToken;
      
      setIsLoadingContext(true);
      
      try {
        const authTok = await getAccessToken();
        if (!authTok) throw new Error('No access token');

        while (hasMore) {
          const res = await fetchPlaylistItems(authTok, selectedPlaylist.id, currentToken!);
          currentItems = [...currentItems, ...res.items];
          currentToken = res.nextPageToken;
          hasMore = !!currentToken;
          
          if (isMounted) {
            setItems(currentItems);
          }
        }
      } catch (e) {
        console.error('Failed to load full context for chat', e);
      } finally {
        if (isMounted) {
          setNextPageToken(null);
          setIsLoadingContext(false);
          onContextLoaded?.(currentItems, null);
        }
      }
    };

    if (initialNextPageToken) {
      loadAllContext();
    } else {
      setIsLoadingContext(false);
    }
    
    return () => { isMounted = false; };
  }, [selectedPlaylist, initialNextPageToken]); // We only want this once for the playlist

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isSending || isLoadingContext) return;

    const userText = input.trim();
    setInput('');
    
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', parts: [{ text: userText }] }
    ];
    setMessages(newMessages);
    setIsSending(true);

    try {
      const playlistContext = {
        title: selectedPlaylist?.snippet.title || 'Unknown Playlist',
        description: selectedPlaylist?.snippet.description || '',
        items: items.map(item => item.snippet.title)
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, playlistContext })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }
      
      const data = await res.json();
      setMessages([...newMessages, { role: 'model', parts: [{ text: data.text }] }]);
    } catch (e) {
      console.error(e);
      setMessages([...newMessages, { role: 'model', parts: [{ text: 'Sorry, I encountered an error while processing your request. Please try again.' }] }]);
    } finally {
      setIsSending(false);
    }
  };

  if (!selectedPlaylist) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Please select a playlist first to chat about its contents.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full h-full relative min-h-0">
      <div className="flex-1 overflow-y-auto w-full p-4 space-y-6 min-h-0">
        {isLoadingContext ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p>Loading complete playlist context for AI... ({items.length} videos so far)</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400 space-y-4 h-full">
            <Bot className="w-12 h-12 text-indigo-500 opacity-50" />
            <h2 className="text-xl font-medium text-gray-200">AI Playlist Assistant</h2>
            <p className="text-center max-w-md">
              I'm ready to help you explore your "{selectedPlaylist.snippet.title}" playlist. 
              Ask me to recommend a video, summarize themes, or find something specific!
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-indigo-900/50 flex items-center justify-center shrink-0 border border-indigo-500/30">
                  <Bot className="w-5 h-5 text-indigo-400" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-sm' 
                  : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-sm'
              }`}>
                {msg.parts.map((p, pIdx) => (
                  <div key={pIdx} className="markdown-body text-sm leading-relaxed [&>p]:mb-3 last:[&>p]:mb-0 [&>h3]:text-base [&>h3]:font-semibold [&>h3]:mb-2 [&>h3]:mt-4 first:[&>h3]:mt-0 [&>ul]:list-disc [&>ol]:list-decimal [&>ul]:pl-5 [&>ol]:pl-5 [&>ul]:mb-3 [&>ol]:mb-3 [&>li]:mb-1 [&>strong]:font-semibold [&>strong]:text-white [&>pre]:bg-gray-900 [&>pre]:p-3 [&>pre]:rounded-md [&>pre]:overflow-x-auto [&>code]:bg-gray-900 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded-md [&>code]:text-indigo-300">
                    <Markdown>{p.text}</Markdown>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        
        {isSending && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-indigo-900/50 flex items-center justify-center shrink-0 border border-indigo-500/30">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-5 py-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 flex flex-row items-center w-full bg-[#0f0f0f] p-4 border-t border-gray-800">
        <form 
          onSubmit={handleSend}
          className="w-full flex gap-2 items-center bg-gray-800 border border-gray-700 rounded-full p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-shadow"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoadingContext || isSending}
            placeholder={isLoadingContext ? "Loading context..." : "Ask about your videos..."}
            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-100 placeholder-gray-500 px-4 py-2 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoadingContext || isSending}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
