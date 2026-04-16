-- 사용자 (bizCode 기반)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  biz_code VARCHAR(20) UNIQUE NOT NULL,
  daily_search_limit INT DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 검색 기록
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL,
  results JSONB,
  searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- 일일 검색 횟수 추적
CREATE TABLE daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  search_date DATE DEFAULT CURRENT_DATE,
  search_count INT DEFAULT 0,
  UNIQUE(user_id, search_date)
);

-- 크롤링 캐시 (동일 계정 재크롤링 방지)
CREATE TABLE instagram_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  profile_data JSONB,
  posts_data JSONB,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_search_history_user ON search_history(user_id);
CREATE INDEX idx_daily_usage_user_date ON daily_usage(user_id, search_date);
CREATE INDEX idx_instagram_cache_username ON instagram_cache(username);
CREATE INDEX idx_instagram_cache_cached_at ON instagram_cache(cached_at);
