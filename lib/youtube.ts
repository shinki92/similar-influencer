// YouTube Data API v3 모듈

export interface YouTubeChannel {
  channelId: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  customUrl: string | null;
  publishedAt: string;
}

export interface YouTubeChannelResult {
  channel: YouTubeChannel;
}

// 채널명 또는 URL에서 채널 ID/이름 추출
export function parseYouTubeInput(input: string): { type: "id" | "handle" | "name"; value: string } {
  const trimmed = input.trim();

  // URL 형식 처리
  const urlMatch = trimmed.match(/youtube\.com\/(channel\/|c\/|@|user\/)?([^/?]+)/);
  if (urlMatch) {
    const value = urlMatch[2];
    if (urlMatch[1] === "channel/") return { type: "id", value };
    if (urlMatch[1] === "@") return { type: "handle", value: `@${value}` };
    if (urlMatch[1] === "c/" || urlMatch[1] === "user/") return { type: "name", value };
    return { type: "name", value };
  }

  // @핸들 형식
  if (trimmed.startsWith("@")) {
    return { type: "handle", value: trimmed };
  }

  // 채널 ID 형식 (UC로 시작, 24자)
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmed)) {
    return { type: "id", value: trimmed };
  }

  return { type: "name", value: trimmed };
}

// 검색어로 채널 찾기 (검색 → 첫 번째 결과 채널 ID 반환)
export async function searchChannelByQuery(query: string): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("[youtube-search] 에러:", data.error.message);
      return null;
    }

    const channelId = data.items?.[0]?.id?.channelId || data.items?.[0]?.snippet?.channelId;
    return channelId || null;
  } catch (error) {
    console.error("[youtube-search] 실패:", error);
    return null;
  }
}

// 채널 상세 정보 가져오기
export async function fetchChannelDetail(channelIds: string[]): Promise<YouTubeChannel[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || channelIds.length === 0) return [];

  try {
    const ids = channelIds.slice(0, 50).join(","); // API 제한 50개
    const url = `https://www.googleapis.com/youtube/v3/channels?key=${apiKey}&part=snippet,statistics&id=${ids}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("[youtube-channel] 에러:", data.error.message);
      return [];
    }

    return (data.items || []).map((item: {
      id: string;
      snippet: {
        title: string;
        description: string;
        thumbnails: { high?: { url: string }; default?: { url: string } };
        customUrl?: string;
        publishedAt: string;
      };
      statistics: {
        subscriberCount?: string;
        videoCount?: string;
        viewCount?: string;
      };
    }) => ({
      channelId: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || "",
      subscriberCount: parseInt(item.statistics?.subscriberCount || "0"),
      videoCount: parseInt(item.statistics?.videoCount || "0"),
      viewCount: parseInt(item.statistics?.viewCount || "0"),
      customUrl: item.snippet.customUrl || null,
      publishedAt: item.snippet.publishedAt,
    }));
  } catch (error) {
    console.error("[youtube-channel] 실패:", error);
    return [];
  }
}

// 핸들로 채널 ID 찾기 (@username)
export async function fetchChannelByHandle(handle: string): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;
    const url = `https://www.googleapis.com/youtube/v3/channels?key=${apiKey}&part=id&forHandle=${encodeURIComponent(cleanHandle)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) return null;
    return data.items?.[0]?.id || null;
  } catch {
    return null;
  }
}

// 유사 채널 찾기 (검색어 기반 - YouTube API는 직접적인 "유사 채널" 기능 없음)
// 대신 입력 채널의 키워드로 검색
export async function findSimilarChannels(channelId: string): Promise<YouTubeChannelResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    // 1. 입력 채널의 정보 가져오기
    const channels = await fetchChannelDetail([channelId]);
    if (channels.length === 0) return [];

    const inputChannel = channels[0];

    // 2. 채널 제목 + 설명에서 키워드 추출 (단순 방식: 제목 사용)
    const searchQuery = inputChannel.title;

    // 3. 비슷한 채널 검색 (검색어 기반)
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&part=snippet&type=channel&q=${encodeURIComponent(searchQuery)}&maxResults=20`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.error) {
      console.error("[youtube-similar] 검색 에러:", searchData.error.message);
      return [];
    }

    // 4. 검색된 채널들의 ID 모으기 (입력 채널 제외)
    const similarIds: string[] = (searchData.items || [])
      .map((item: { id: { channelId?: string } }) => item.id?.channelId)
      .filter((id: string | undefined): id is string => !!id && id !== channelId);

    if (similarIds.length === 0) return [];

    // 5. 상세 정보 가져오기
    const detailedChannels = await fetchChannelDetail(similarIds);

    return detailedChannels.map((channel) => ({ channel }));
  } catch (error) {
    console.error("[youtube-similar] 실패:", error);
    return [];
  }
}
