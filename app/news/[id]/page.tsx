import { redirect } from "next/navigation";
import { StoryArticle } from "@/components/news/story-article";
import { getBackgroundLessons } from "@/lib/learn/feed";
import { getSessionUserId } from "@/lib/news/session";
import { getStory, setStoryState } from "@/lib/news/stories";

export const dynamic = "force-dynamic";

/** Story page (Story 8.6): AI article with source breakdown and bigger picture */
export default async function NewsStoryPage({ params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) redirect(`/login?callbackUrl=/news/${params.id}`);

  const story = await getStory(params.id, userId);
  if (!story) redirect("/dashboard?tab=news");

  // Opening a story marks it read (keeps "saved")
  const userState = await setStoryState(userId, story.id, { status: "READ" });
  const backgroundLessons = getBackgroundLessons(story.headline, [story.summary, story.whyItMatters].filter(Boolean).join(" "));
  return <StoryArticle story={{ ...story, userState }} backgroundLessons={backgroundLessons} />;
}
