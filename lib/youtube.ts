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

// 유사 채널 찾기 - 콘텐츠 기반
// 1. 입력 채널의 최근 영상 제목/설명에서 핵심 키워드 추출 (AI)
// 2. 그 키워드로 동영상 검색 → 영상을 만든 채널들 모으기
// 3. 입력 채널 제외 + 중복 제거 후 반환
export async function findSimilarChannels(channelId: string): Promise<YouTubeChannelResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    // 1. 입력 채널 정보
    const channels = await fetchChannelDetail([channelId]);
    if (channels.length === 0) return [];
    const inputChannel = channels[0];

    // 2. 최근 영상 10개 가져오기
    const videos = await fetchChannelVideos(channelId, 10);

    // 3. AI로 키워드 추출 (Groq 사용)
    const keywords = await extractKeywords(inputChannel, videos);
    console.log("[youtube-similar] 추출된 키워드:", keywords);

    if (keywords.length === 0) {
      console.log("[youtube-similar] 키워드 추출 실패 - 채널명 사용");
      keywords.push(inputChannel.title);
    }

    // 4. 키워드별로 영상 검색 → 채널 수집
    const channelIdSet = new Set<string>();

    for (const keyword of keywords.slice(0, 3)) {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&part=snippet&type=video&q=${encodeURIComponent(keyword)}&maxResults=20&regionCode=KR&relevanceLanguage=ko`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();

      if (searchData.error) {
        console.error("[youtube-similar] 검색 에러:", searchData.error.message);
        continue;
      }

      for (const item of searchData.items || []) {
        const cid = item.snippet?.channelId;
        if (cid && cid !== channelId) {
          channelIdSet.add(cid);
        }
      }
    }

    const similarIds = Array.from(channelIdSet).slice(0, 50);
    if (similarIds.length === 0) return [];

    // 5. 채널 상세 정보
    const detailedChannels = await fetchChannelDetail(similarIds);

    // 6. 구독자 규모가 너무 다른 채널 제외 (입력 채널의 0.05배 ~ 20배)
    const inputSub = inputChannel.subscriberCount;
    let filtered = detailedChannels;
    if (inputSub > 0) {
      filtered = detailedChannels.filter((c) => {
        if (c.subscriberCount === 0) return true;
        const ratio = c.subscriberCount / inputSub;
        return ratio >= 0.05 && ratio <= 20;
      });
    }

    // 7. 구독자 수 내림차순
    filtered.sort((a, b) => b.subscriberCount - a.subscriberCount);

    return filtered.map((channel) => ({ channel }));
  } catch (error) {
    console.error("[youtube-similar] 실패:", error);
    return [];
  }
}

// AI로 채널 콘텐츠에서 핵심 키워드 추출
async function extractKeywords(
  channel: YouTubeChannel,
  videos: YouTubeVideo[]
): Promise<string[]> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey || groqKey === "your_groq_api_key_here") {
    // AI 없으면 채널명만 반환
    return [channel.title];
  }

  // 영상 제목 모음
  const titleList = videos.slice(0, 10).map((v) => v.title).join("\n");

  const prompt = `유튜브 채널 정보:
- 채널명: ${channel.title}
- 설명: ${channel.description.substring(0, 300)}
- 최근 영상 제목들:
${titleList}

이 채널과 비슷한 다른 유튜브 채널을 찾기 위한 검색 키워드를 3개만 추출해주세요.
키워드는 채널의 콘텐츠 주제(예: "ASMR 먹방", "브이로그", "캠핑 요리")여야 합니다.
채널명 자체는 포함하지 마세요.

반드시 아래 JSON 형식으로만 응답:
{"keywords": ["키워드1", "키워드2", "키워드3"]}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
        max_tokens: 200,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [channel.title];

    const parsed = JSON.parse(content);
    return Array.isArray(parsed.keywords) ? parsed.keywords : [channel.title];
  } catch (error) {
    console.error("[extractKeywords] 실패:", error);
    return [channel.title];
  }
}
