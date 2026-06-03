import { useEffect, useMemo, useState, type ReactNode } from "react";
import "./App.css";

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

type UserProfile = {
	id: number;
	username: string;
	nickname: string;
	sign: string;
	avatar: string | null;
	link: string;
};

type CollectionResponse = {
	userId: string;
	user: UserProfile | null;
	total: number;
	updatedAt: string;
	items: CollectionItem[];
};

const SUBJECT_TYPES: Record<number, string> = {
	1: "书籍",
	2: "动画",
	3: "音乐",
	4: "游戏",
	6: "三次元",
};

const COLLECTION_TYPES: Record<number, string> = {
	1: "想看",
	2: "看过",
	3: "在看",
	4: "搁置",
	5: "抛弃",
};

const SUBJECT_FILTERS = [
	{ key: "all", label: "全部" },
	{ key: "2", label: "动画" },
	{ key: "4", label: "游戏" },
	{ key: "1", label: "书籍" },
	{ key: "6", label: "三次元" },
	{ key: "3", label: "音乐" },
];

const RATE_LABEL: Record<number, string> = {
	10: "超神",
	9: "神作",
	8: "力荐",
	7: "推荐",
	6: "还行",
	5: "不过不失",
	4: "较差",
	3: "差",
	2: "很差",
	1: "不忍直视",
};

const formatDate = (value: string | null) => {
	if (!value) {
		return "未知时间";
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return "未知时间";
	}

	return new Intl.DateTimeFormat("zh-CN", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(date);
};

const scoreTone = (rate: number) => {
	if (rate >= 9) return "tone-gold";
	if (rate >= 8) return "tone-green";
	if (rate >= 7) return "tone-teal";
	if (rate >= 6) return "tone-blue";
	if (rate >= 1) return "tone-gray";
	return "tone-none";
};

function Cover({
	item,
	className,
	children,
}: {
	item: CollectionItem;
	className?: string;
	children?: ReactNode;
}) {
	const [failed, setFailed] = useState(false);
	const initial = (item.nameCn || item.name).slice(0, 1);

	if (!item.image || failed) {
		return (
			<div className={`cover cover-fallback ${className ?? ""}`}>
				<span className="cover-initial">{initial}</span>
				{children}
			</div>
		);
	}

	return (
		<div className={`cover ${className ?? ""}`}>
			<img
				src={item.image}
				alt={item.nameCn || item.name}
				loading="lazy"
				referrerPolicy="no-referrer"
				onError={() => setFailed(true)}
			/>
			{children}
		</div>
	);
}

function App() {
	const [items, setItems] = useState<CollectionItem[]>([]);
	const [userId, setUserId] = useState("1059862");
	const [user, setUser] = useState<UserProfile | null>(null);
	const [updatedAt, setUpdatedAt] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState("all");

	const loadCollections = async () => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch("/api/collections");
			const data = (await response.json()) as
				| CollectionResponse
				| { error: string };

			if (!response.ok || "error" in data) {
				throw new Error(
					"error" in data ? data.error : "无法读取 Bangumi 收藏数据。",
				);
			}

			// 只保留写了短评的条目
			const evaluated = data.items.filter(
				(item) => item.comment.trim().length > 0,
			);

			setItems(evaluated);
			setUserId(data.userId);
			setUser(data.user);
			setUpdatedAt(data.updatedAt);
		} catch (err) {
			setError(err instanceof Error ? err.message : "数据源暂时不可用。");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void loadCollections();
	}, []);

	const filteredItems = useMemo(() => {
		if (filter === "all") {
			return items;
		}

		const subjectType = Number(filter);
		return items.filter((item) => item.subjectType === subjectType);
	}, [items, filter]);

	const ratedItems = useMemo(
		() => filteredItems.filter((item) => item.rate > 0),
		[filteredItems],
	);

	const averageScore = useMemo(() => {
		if (ratedItems.length === 0) {
			return null;
		}

		const sum = ratedItems.reduce((acc, item) => acc + item.rate, 0);
		return sum / ratedItems.length;
	}, [ratedItems]);

	const counts = useMemo(() => {
		const map = new Map<number, number>();
		for (const item of items) {
			map.set(item.subjectType, (map.get(item.subjectType) ?? 0) + 1);
		}
		return map;
	}, [items]);

	return (
		<main className="app-shell">
			<header className="masthead">
				<div className="masthead-top">
					<span className="brand">
						<span className="brand-dot" /> Bangumi 评分时间线
					</span>
					<button
						type="button"
						className="ghost-btn"
						onClick={loadCollections}
						disabled={isLoading}
					>
						{isLoading ? "刷新中…" : "刷新"}
					</button>
				</div>

				<div className="user-hero">
					<a
						className="avatar"
						href={user?.link ?? `https://bgm.tv/user/${userId}`}
						target="_blank"
						rel="noreferrer"
					>
						{user?.avatar ? (
							<img
								src={user.avatar}
								alt={user.nickname}
								referrerPolicy="no-referrer"
							/>
						) : (
							<span>{(user?.nickname ?? "?").slice(0, 1)}</span>
						)}
					</a>
					<div className="user-meta">
						<h1>{isLoading ? "加载中…" : user?.nickname ?? `用户 #${userId}`}</h1>
						<a
							className="user-handle"
							href={user?.link ?? `https://bgm.tv/user/${userId}`}
							target="_blank"
							rel="noreferrer"
						>
							@{user?.username ?? userId}
						</a>
						{user?.sign ? <p className="user-sign">“{user.sign}”</p> : null}
					</div>
				</div>
				<p className="masthead-sub">
					TA 在 Bangumi 的全部评价，按收藏时间从近到远排列，附上每条短评。
				</p>

				<div className="stat-row">
					<div className="stat">
						<strong>{isLoading ? "—" : items.length}</strong>
						<span>收录条目</span>
					</div>
					<div className="stat">
						<strong>{isLoading ? "—" : ratedItems.length}</strong>
						<span>当前已评分</span>
					</div>
					<div className="stat">
						<strong className="accent">
							{averageScore !== null ? averageScore.toFixed(2) : "—"}
						</strong>
						<span>平均分</span>
					</div>
					<div className="stat">
						<strong>{formatDate(updatedAt)}</strong>
						<span>同步时间</span>
					</div>
				</div>
			</header>

			<nav className="filters" aria-label="按类型筛选">
				{SUBJECT_FILTERS.map((option) => {
					const count =
						option.key === "all"
							? items.length
							: counts.get(Number(option.key)) ?? 0;

					if (option.key !== "all" && count === 0 && !isLoading) {
						return null;
					}

					return (
						<button
							key={option.key}
							type="button"
							className={filter === option.key ? "chip active" : "chip"}
							onClick={() => setFilter(option.key)}
						>
							{option.label}
							<i>{isLoading ? "" : count}</i>
						</button>
					);
				})}
			</nav>

			{error ? (
				<section className="notice" role="alert">
					<strong>数据源连接失败</strong>
					<p>{error}</p>
					<p>Bangumi API 可能临时限流，稍后再刷新试试。</p>
				</section>
			) : null}

			{isLoading ? (
				<section className="timeline" aria-label="加载中">
					{Array.from({ length: 8 }).map((_, index) => (
						<div className="row-card skeleton" key={index}>
							<div className="cover" />
							<div className="row-body">
								<strong />
								<span />
								<p />
							</div>
						</div>
					))}
				</section>
			) : filteredItems.length > 0 ? (
				<section className="timeline" aria-label="评分时间线">
					{filteredItems.map((item) => (
						<a
							className="row-card"
							href={item.link}
							key={item.id}
							target="_blank"
							rel="noreferrer"
						>
							<Cover item={item} className="cover-row" />

							<div className="row-body">
								<div className="row-head">
									<div className="row-title">
										<strong title={item.nameCn || item.name}>
											{item.nameCn || item.name}
										</strong>
										{item.nameCn && item.name !== item.nameCn ? (
											<span className="orig">{item.name}</span>
										) : null}
									</div>
									<div className={`score-chip ${scoreTone(item.rate)}`}>
										<b>{item.rate > 0 ? item.rate : "—"}</b>
										<i>{item.rate > 0 ? RATE_LABEL[item.rate] : "未评分"}</i>
									</div>
								</div>

								<div className="meta">
									<span className="pill">
										{SUBJECT_TYPES[item.subjectType] ?? "条目"}
									</span>
									<span className="pill pill-ghost">
										{COLLECTION_TYPES[item.type] ?? "收藏"}
									</span>
									{item.average !== null ? (
										<span className="pill pill-ghost">
											均分 {item.average}
										</span>
									) : null}
									<span className="date">{formatDate(item.updatedAt)}</span>
								</div>

								{item.comment ? (
									<p className="comment">{item.comment}</p>
								) : (
									<p className="comment comment-empty">没有写短评。</p>
								)}
							</div>
						</a>
					))}
				</section>
			) : (
				<section className="notice">
					<strong>没有匹配的条目</strong>
					<p>换一个类型筛选，或稍后刷新试试。</p>
				</section>
			)}

			<footer className="page-footer">
				数据来源 ·{" "}
				<a href="https://bangumi.github.io/api/" target="_blank" rel="noreferrer">
					Bangumi API v0
				</a>
			</footer>
		</main>
	);
}

export default App;
