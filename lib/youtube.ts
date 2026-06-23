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

// 유튜브 영상 타입
export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
}

// ISO 8601 duration → 사람이 읽기 좋은 형태
export function parseDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  const h = parseInt(match[1] || "0");
  const m = parseInt(match[2] || "0");
  const s = parseInt(match[3] || "0");
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// 키워드로 채널 검색 (다수)
export async function searchChannelsByKeyword(
  query: string,
  maxResults: number = 20
): Promise<YouTubeChannelResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=${maxResults}&regionCode=KR`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("[youtube-keyword] 에러:", data.error.message);
      return [];
    }

    const channelIds: string[] = (data.items || [])
      .map((item: { id: { channelId?: string } }) => item.id?.channelId)
      .filter(Boolean);

    if (channelIds.length === 0) return [];

    const channels = await fetchChannelDetail(channelIds);
    return channels.map((channel) => ({ channel }));
  } catch (error) {
    console.error("[youtube-keyword] 실패:", error);
    return [];
  }
}

// 채널의 최근 영상 가져오기
export async function fetchChannelVideos(
  channelId: string,
  maxResults: number = 10
): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    // 1. 채널의 uploads 플레이리스트 ID 가져오기
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?key=${apiKey}&part=contentDetails&id=${channelId}`;
    const channelRes = await fetch(channelUrl);
    const channelData = await channelRes.json();
    const uploadsPlaylistId =
      channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) return [];

    // 2. 플레이리스트에서 최근 영상 가져오기
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?key=${apiKey}&part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}`;
    const playlistRes = await fetch(playlistUrl);
    const playlistData = await playlistRes.json();

    const videoIds = (playlistData.items || [])
      .map((item: { snippet?: { resourceId?: { videoId?: string } } }) => item.snippet?.resourceId?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) return [];

    // 3. 영상 상세 정보 (조회수, 좋아요 등)
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&part=snippet,statistics,contentDetails&id=${videoIds.join(",")}`;
    const videosRes = await fetch(videosUrl);
    const videosData = await videosRes.json();

    return (videosData.items || []).map((v: {
      id: string;
      snippet: {
        title: string;
        description: string;
        thumbnails: { high?: { url: string }; medium?: { url: string } };
        publishedAt: string;
      };
      statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
      contentDetails: { duration: string };
    }) => ({
      videoId: v.id,
      title: v.snippet.title,
      description: v.snippet.description,
      thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url || "",
      publishedAt: v.snippet.publishedAt,
      viewCount: parseInt(v.statistics?.viewCount || "0"),
      likeCount: parseInt(v.statistics?.likeCount || "0"),
      commentCount: parseInt(v.statistics?.commentCount || "0"),
      duration: parseDuration(v.contentDetails.duration),
    }));
  } catch (error) {
    console.error("[youtube-videos] 실패:", error);
    return [];
  }
}

// 채널 분석 요약 (평균 조회수, 업로드 주기 등)
export interface ChannelAnalytics {
  averageViews: number;
  averageLikes: number;
  averageComments: number;
  uploadFrequencyDays: number; // 평균 업로드 간격(일)
  engagementRate: number; // (좋아요+댓글)/조회수 * 100
  topVideos: YouTubeVideo[]; // 조회수 TOP 5
  recentVideos: YouTubeVideo[]; // 최근 10개
}

export function analyzeChannel(videos: YouTubeVideo[]): ChannelAnalytics {
  if (videos.length === 0) {
    return {
      averageViews: 0,
      averageLikes: 0,
      averageComments: 0,
      uploadFrequencyDays: 0,
      engagementRate: 0,
      topVideos: [],
      recentVideos: [],
    };
  }

  const totalViews = videos.reduce((s, v) => s + v.viewCount, 0);
  const totalLikes = videos.reduce((s, v) => s + v.likeCount, 0);
  const totalComments = videos.reduce((s, v) => s + v.commentCount, 0);

  // 업로드 주기 계산
  const dates = videos.map((v) => new Date(v.publishedAt).getTime()).sort((a, b) => b - a);
  let avgGap = 0;
  if (dates.length >= 2) {
    const gaps: number[] = [];
    for (let i = 0; i < dates.length - 1; i++) {
      gaps.push((dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24));
    }
    avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  }

  // 인기 영상 TOP 5
  const topVideos = [...videos].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);
  const recentVideos = [...videos].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return {
    averageViews: Math.round(totalViews / videos.length),
    averageLikes: Math.round(totalLikes / videos.length),
    averageComments: Math.round(totalComments / videos.length),
    uploadFrequencyDays: Math.round(avgGap * 10) / 10,
    engagementRate: totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0,
    topVideos,
    recentVideos,
  };
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
