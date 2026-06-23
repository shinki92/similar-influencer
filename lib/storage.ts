import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const CACHE_FILE = path.join(DATA_DIR, "cache.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson(filePath: string): Record<string, unknown> {
  ensureDataDir();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

function writeJson(filePath: string, data: unknown) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ---- 검색 기록 ----

interface HistoryEntry {
  id: string;
  username: string;
  results: unknown;
  searched_at: string;
}

interface HistoryStore {
  [bizCode: string]: HistoryEntry[];
}

export function getSearchHistory(bizCode: string): HistoryEntry[] {
  const store = readJson(HISTORY_FILE) as HistoryStore;
  return (store[bizCode] || []).sort(
    (a, b) => new Date(b.searched_at).getTime() - new Date(a.searched_at).getTime()
  );
}

export function saveSearchHistory(bizCode: string, username: string, results: unknown) {
  const store = readJson(HISTORY_FILE) as HistoryStore;
  if (!store[bizCode]) store[bizCode] = [];

  store[bizCode].push({
    id: crypto.randomUUID(),
    username,
    results,
    searched_at: new Date().toISOString(),
  });

  // 최근 50개만 유지
  if (store[bizCode].length > 50) {
    store[bizCode] = store[bizCode].slice(-50);
  }

  writeJson(HISTORY_FILE, store);
}

export function getLatestSearchResult(bizCode: string) {
  const history = getSearchHistory(bizCode);
  return history[0] || null;
}

export function getSearchResultById(bizCode: string, searchId: string) {
  const history = getSearchHistory(bizCode);
  return history.find((h) => h.id === searchId) || null;
}

// ---- 인스타그램 캐시 ----

interface CacheEntry {
  profile_data: unknown;
  posts_data: unknown;
  cached_at: string;
}

interface CacheStore {
  [username: string]: CacheEntry;
}

export function getCachedProfile(username: string): CacheEntry | null {
  const store = readJson(CACHE_FILE) as CacheStore;
  const entry = store[username];
  if (!entry) return null;

  // 24시간 캐시
  const age = Date.now() - new Date(entry.cached_at).getTime();
  if (age > 24 * 60 * 60 * 1000) return null;

  return entry;
}

export function setCachedProfile(username: string, profileData: unknown, postsData: unknown) {
  const store = readJson(CACHE_FILE) as CacheStore;
  store[username] = {
    profile_data: profileData,
    posts_data: postsData,
    cached_at: new Date().toISOString(),
  };
  writeJson(CACHE_FILE, store);
}

// ---- 유튜브 채널 성장 추적 ----

const YT_TRACKING_FILE = path.join(DATA_DIR, "yt_tracking.json");

interface YTSnapshot {
  date: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

interface YTTrackingEntry {
  channelId: string;
  title: string;
  thumbnail: string;
  customUrl: string | null;
  snapshots: YTSnapshot[];
  addedAt: string;
  bizCode: string;
}

interface YTTrackingStore {
  [key: string]: YTTrackingEntry; // key: bizCode__channelId
}

function trackingKey(bizCode: string, channelId: string) {
  return `${bizCode}__${channelId}`;
}

export function addChannelToTracking(
  bizCode: string,
  channel: {
    channelId: string;
    title: string;
    thumbnail: string;
    customUrl: string | null;
    subscriberCount: number;
    videoCount: number;
    viewCount: number;
  }
) {
  const store = readJson(YT_TRACKING_FILE) as YTTrackingStore;
  const key = trackingKey(bizCode, channel.channelId);
  const now = new Date().toISOString();
  const snapshot: YTSnapshot = {
    date: now,
    subscriberCount: channel.subscriberCount,
    videoCount: channel.videoCount,
    viewCount: channel.viewCount,
  };

  if (store[key]) {
    // 기존 항목 - 스냅샷 추가
    store[key].snapshots.push(snapshot);
    // 최근 30개만 유지
    if (store[key].snapshots.length > 30) {
      store[key].snapshots = store[key].snapshots.slice(-30);
    }
  } else {
    store[key] = {
      channelId: channel.channelId,
      title: channel.title,
      thumbnail: channel.thumbnail,
      customUrl: channel.customUrl,
      snapshots: [snapshot],
      addedAt: now,
      bizCode,
    };
  }

  writeJson(YT_TRACKING_FILE, store);
}

export function getTrackedChannels(bizCode: string): YTTrackingEntry[] {
  const store = readJson(YT_TRACKING_FILE) as YTTrackingStore;
  return Object.values(store)
    .filter((e) => e.bizCode === bizCode)
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
}

export function removeTrackedChannel(bizCode: string, channelId: string) {
  const store = readJson(YT_TRACKING_FILE) as YTTrackingStore;
  delete store[trackingKey(bizCode, channelId)];
  writeJson(YT_TRACKING_FILE, store);
}
