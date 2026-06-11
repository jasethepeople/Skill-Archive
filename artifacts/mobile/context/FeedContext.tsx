import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  color: string;
}

export interface FeedItem {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

interface FeedState {
  sources: FeedSource[];
  items: FeedItem[];
  loading: boolean;
  addSource: (name: string, url: string) => void;
  removeSource: (id: string) => void;
  refresh: () => void;
  activeSource: string | null;
  setActiveSource: (id: string | null) => void;
}

const FeedContext = createContext<FeedState | null>(null);

const SOURCES_KEY = "nexus:feed_sources";
const ITEMS_KEY = "nexus:feed_items";

const ACCENT_COLORS = ["#00F5D4", "#7B61FF", "#F59E0B", "#FF4455", "#22C55E", "#3B82F6"];

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const DEFAULT_SOURCES: FeedSource[] = [
  { id: "src1", name: "Hacker News", url: "https://hnrss.org/frontpage", color: "#F59E0B" },
  { id: "src2", name: "Lobste.rs", url: "https://lobste.rs/rss", color: "#FF4455" },
];

function extractTag(xml: string, tag: string): string {
  const pattern = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\/${tag}>`, "si");
  const match = xml.match(pattern);
  return match ? match[1].trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'") : "";
}

function parseRSS(xml: string, sourceId: string, sourceName: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  let count = 0;
  while ((match = itemPattern.exec(xml)) !== null && count < 30) {
    const chunk = match[1];
    const title = extractTag(chunk, "title").slice(0, 120);
    const link = extractTag(chunk, "link") || extractTag(chunk, "guid");
    const description = extractTag(chunk, "description").replace(/<[^>]*>/g, "").slice(0, 200);
    const pubDate = extractTag(chunk, "pubDate") || extractTag(chunk, "dc:date") || new Date().toUTCString();
    if (title) {
      items.push({ id: generateId(), sourceId, sourceName, title, link, description, pubDate });
      count++;
    }
  }
  return items;
}

async function fetchFeed(source: FeedSource): Promise<FeedItem[]> {
  try {
    const res = await fetch(source.url, { headers: { Accept: "application/rss+xml, application/xml, text/xml" } });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml, source.id, source.name);
  } catch {
    return [];
  }
}

export function FeedProvider({ children }: { children: React.ReactNode }) {
  const [sources, setSources] = useState<FeedSource[]>([]);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSource, setActiveSource] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [srcRaw, itemsRaw] = await Promise.all([
          AsyncStorage.getItem(SOURCES_KEY),
          AsyncStorage.getItem(ITEMS_KEY),
        ]);
        const loadedSources = srcRaw ? JSON.parse(srcRaw) : DEFAULT_SOURCES;
        setSources(loadedSources);
        if (itemsRaw) {
          setItems(JSON.parse(itemsRaw));
        } else {
          if (!srcRaw) {
            await AsyncStorage.setItem(SOURCES_KEY, JSON.stringify(DEFAULT_SOURCES));
          }
        }
      } catch {}
    })();
  }, []);

  const refresh = useCallback(async () => {
    if (sources.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(sources.map(fetchFeed));
      const all = results.flat().sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      const deduped = all.filter((item, idx, arr) => arr.findIndex((i) => i.title === item.title) === idx);
      setItems(deduped);
      await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(deduped.slice(0, 200)));
    } catch {}
    setLoading(false);
  }, [sources]);

  const addSource = useCallback(
    async (name: string, url: string) => {
      const newSource: FeedSource = {
        id: generateId(),
        name,
        url,
        color: ACCENT_COLORS[sources.length % ACCENT_COLORS.length],
      };
      const updated = [...sources, newSource];
      setSources(updated);
      await AsyncStorage.setItem(SOURCES_KEY, JSON.stringify(updated));
    },
    [sources]
  );

  const removeSource = useCallback(
    async (id: string) => {
      const updated = sources.filter((s) => s.id !== id);
      setSources(updated);
      setItems((prev) => prev.filter((i) => i.sourceId !== id));
      await AsyncStorage.setItem(SOURCES_KEY, JSON.stringify(updated));
    },
    [sources]
  );

  return (
    <FeedContext.Provider value={{ sources, items, loading, addSource, removeSource, refresh, activeSource, setActiveSource }}>
      {children}
    </FeedContext.Provider>
  );
}

export function useFeed() {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error("useFeed must be used within FeedProvider");
  return ctx;
}
