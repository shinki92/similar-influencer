export interface InstagramProfile {
  username: string;
  name: string;
  profilePic: string;
  bio: string;
  externalUrl: string | null;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isVerified: boolean;
}

export interface InstagramPost {
  thumbnailUrl: string;
  isVideo: boolean;
  viewCount: number | null;
}

export interface InfluencerResult {
  profile: InstagramProfile;
  recentPosts: InstagramPost[];
}

export interface SearchResponse {
  results: InfluencerResult[];
  totalCount: number;
  remainingSearches: number;
}

export interface SearchHistoryItem {
  id: string;
  username: string;
  searched_at: string;
}
