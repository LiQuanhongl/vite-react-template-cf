import { Hono } from "hono";

type AppEnv = Env & {
	BANGUMI_GAME_FEED_URL?: string;
};

const app = new Hono<{ Bindings: AppEnv }>();

const FEED_URL = "https://rsshub.app/bangumi.tv/game/followrank";

type GameFeedItem = {
	id: string;
	title: string;
	link: string;
	description: string;
	image: string | null;
	publishedAt: string | null;
};

const decodeEntities = (value: string) =>
	value
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.trim();

const stripHtml = (value: string) =>
	decodeEntities(value)
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim();

const getTagValue = (item: string, tag: string) => {
	const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));

	return match ? decodeEntities(match[1]) : "";
};

const getFirstImage = (html: string) => {
	const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);

	return match ? decodeEntities(match[1]) : null;
};

const parseFeed = (xml: string): GameFeedItem[] => {
	const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];

	return items.slice(0, 24).map((item, index) => {
		const rawDescription = getTagValue(item, "description");
		const link = getTagValue(item, "link");
		const guid = getTagValue(item, "guid");

		return {
			id: guid || link || `game-${index}`,
			title: getTagValue(item, "title") || "未命名游戏",
			link,
			description: stripHtml(rawDescription),
			image: getFirstImage(rawDescription),
			publishedAt: getTagValue(item, "pubDate") || null,
		};
	});
};

app.get("/api/games", async (c) => {
	const feedUrl = c.env.BANGUMI_GAME_FEED_URL || FEED_URL;
	const response = await fetch(feedUrl, {
		headers: {
			"User-Agent": "BangumiGameBoard/1.0 (+https://workers.cloudflare.com)",
			Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
		},
	});

	const body = await response.text();

	if (!response.ok || !body.includes("<rss")) {
		return c.json(
			{
				error: "Bangumi 游戏关注榜暂时不可用，请稍后再试。",
				source: feedUrl,
			},
			502,
		);
	}

	return c.json(
		{
			source: feedUrl,
			updatedAt: new Date().toISOString(),
			items: parseFeed(body),
		},
		200,
		{
			"Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
		},
	);
});

export default app;
