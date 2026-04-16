import Groq from "groq-sdk";
import type { InstagramProfile, InstagramPost, InfluencerResult } from "./types";

// Groq API (무료)를 이용하여 유사 계정 추천
export async function findSimilarAccounts(
  inputUsername: string
): Promise<{ results: InfluencerResult[]; category: string; keywords: string[] }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "your_groq_api_key_here") {
    throw new Error("GROQ_API_KEY가 설정되지 않았습니다.");
  }

  const groq = new Groq({ apiKey });

  const prompt = `당신은 인스타그램 인플루언서 분석 전문가입니다.

인스타그램 계정 @${inputUsername} 과 감도(분위기, 스타일, 콘텐츠 유형)가 비슷한 한국 인스타그램 계정을 20개 추천해주세요.

## 매우 중요한 규칙
- 반드시 실제로 존재하고 활동 중인 인스타그램 계정만 추천하세요
- 절대 가상의 계정을 만들어내지 마세요
- 계정명(username)은 정확해야 합니다
- 확실하지 않은 계정은 제외하세요

## 요청사항
1. @${inputUsername} 계정의 카테고리와 감도 키워드를 분석하세요
2. 비슷한 감도의 실존 한국 인스타그램 계정을 추천하세요
3. 각 계정에 대해 왜 유사한지 간단한 설명을 포함하세요

반드시 아래 JSON 형식으로만 응답하세요 (JSON 외 텍스트 없이):
{
  "category": "카테고리",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "accounts": [
    {
      "username": "실제존재하는계정명",
      "name": "알려진 이름이나 닉네임",
      "description": "이 계정을 추천하는 이유 (감도 유사점)"
    }
  ]
}`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI 응답이 비어있습니다");

    const parsed = JSON.parse(content);
    console.log("[analyze] AI 추천 계정 수:", parsed.accounts?.length || 0);

    const results: InfluencerResult[] = (parsed.accounts || []).map(
      (acc: {
        username: string;
        name: string;
        description: string;
      }) => {
        const profile: InstagramProfile = {
          username: acc.username.replace(/^@/, ""),
          name: acc.name || acc.username,
          profilePic: "",
          bio: acc.description || "",
          externalUrl: null,
          postsCount: 0,
          followersCount: 0,
          followingCount: 0,
          isVerified: false,
        };

        const recentPosts: InstagramPost[] = [];
        return { profile, recentPosts };
      }
    );

    return {
      results,
      category: parsed.category || "",
      keywords: parsed.keywords || [],
    };
  } catch (error) {
    console.error("AI 분석 실패:", error);
    return { results: [], category: "분석 실패", keywords: [] };
  }
}
