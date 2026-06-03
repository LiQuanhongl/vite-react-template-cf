import { Hono } from "hono";

type AppEnv = Env & {
	BANGUMI_USER_ID?: string;
};

const app = new Hono<{ Bindings: AppEnv }>();

const DEFAULT_USER_ID = "1059862";
const API_BASE = "https://api.bgm.tv/v0";
const PAGE_SIZE = 50;
const USER_AGENT =
	"BangumiRankBoard/1.0 (+https://workers.cloudflare.com)";

type RawCollection = {
	subject_id: number;
	subject_type: number;
	type: number;
	rate: number;
	comment: string | null;
	private: boolean;
	updated_at: string | null;
	ep_status: number;
	vol_status: number;
	subject?: {
		name?: string;
		name_cn?: string;
		score?: number;
		date?: string | null;
		images?: {
			small?: string;
			grid?: string;
			medium?: string;
			large?: string;
			common?: string;
		} | null;
	};
};

type RawResponse = {
	total: number;
	limit: number;
	offset: number;
	data: RawCollection[];
};

type RawUser = {
	id: number;
	username: string;
	nickname: string;
	sign?: string;
	avatar?: {
		large?: string;
		medium?: string;
		small?: string;
	};
};

type UserProfile = {
	id: number;
	username: string;
	nickname: string;
	sign: string;
	avatar: string | null;
	link: string;
};

type CollectionItem = {
	id: number;
	name: string;
	nameCn: string;
	image: string | null;
	rate: number;
	average: number | null;
	type: number;
	subjectType: number;
	comment: string;
	date: string | null;
	updatedAt: string | null;
	link: string;
};

const fetchPage = async (
	userId: string,
	offset: number,
): Promise<RawResponse> => {
	const url = `${API_BASE}/users/${encodeURIComponent(
		userId,
	)}/collections?limit=${PAGE_SIZE}&offset=${offset}`;

	const response = await fetch(url, {
		headers: {
			"User-Agent": USER_AGENT,
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(
			`Bangumi API ${response.status}: 无法读取用户 ${userId} 的收藏。`,
		);
	}

	return (await response.json()) as RawResponse;
};

const fetchUser = async (userId: string): Promise<UserProfile | null> => {
	const response = await fetch(
		`${API_BASE}/users/${encodeURIComponent(userId)}`,
		{
			headers: {
				"User-Agent": USER_AGENT,
				Accept: "application/json",
			},
		},
	);

	if (!response.ok) {
		return null;
	}

	const raw = (await response.json()) as RawUser;

	return {
		id: raw.id,
		username: raw.username,
		nickname: raw.nickname || raw.username,
		sign: raw.sign ?? "",
		avatar: raw.avatar?.large ?? raw.avatar?.medium ?? null,
		link: `https://bgm.tv/user/${raw.username || userId}`,
	};
};

const mapItem = (raw: RawCollection): CollectionItem => {
	const images = raw.subject?.images ?? null;

	return {
		id: raw.subject_id,
		name: raw.subject?.name ?? `条目 ${raw.subject_id}`,
		nameCn: raw.subject?.name_cn ?? "",
		image: images?.common ?? images?.medium ?? images?.grid ?? null,
		rate: raw.rate ?? 0,
		average: typeof raw.subject?.score === "number" ? raw.subject.score : null,
		type: raw.type,
		subjectType: raw.subject_type,
		comment: (raw.comment ?? "").replace(/\s+/g, " ").trim(),
		date: raw.subject?.date ?? null,
		updatedAt: raw.updated_at ?? null,
		link: `https://bgm.tv/subject/${raw.subject_id}`,
	};
};

app.get("/api/collections", async (c) => {
	const userId = c.req.query("user") || c.env.BANGUMI_USER_ID || DEFAULT_USER_ID;

	try {
		const [user, first] = await Promise.all([
			fetchUser(userId),
			fetchPage(userId, 0),
		]);
		const total = first.total ?? first.data.length;
		const items = [...first.data];

		const offsets: number[] = [];
		for (let offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) {
			offsets.push(offset);
		}

		const rest = await Promise.all(
			offsets.map((offset) => fetchPage(userId, offset)),
		);
		for (const page of rest) {
			items.push(...page.data);
		}

		// 按收藏更新时间倒序（最近的在前）
		const mapped = items
			.map(mapItem)
			.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

		return c.json(
			{
				userId,
				user,
				total,
				updatedAt: new Date().toISOString(),
				items: mapped,
			},
			200,
			{
				"Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
			},
		);
	} catch (error) {
		return c.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Bangumi 收藏数据暂时不可用，请稍后再试。",
			},
			502,
		);
	}
});

export default app;
