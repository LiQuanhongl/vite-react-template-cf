import { useEffect, useMemo, useState } from "react";
import "./App.css";

type GameItem = {
	id: string;
	title: string;
	link: string;
	description: string;
	image: string | null;
	publishedAt: string | null;
};

type GameResponse = {
	source: string;
	updatedAt: string;
	items: GameItem[];
};

const formatTime = (value: string | null) => {
	if (!value) {
		return "刚刚更新";
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return "刚刚更新";
	}

	return new Intl.DateTimeFormat("zh-CN", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
};

const getSummary = (description: string) => {
	if (!description) {
		return "Bangumi 社区玩家正在关注的热门游戏条目。";
	}

	return description.length > 130
		? `${description.slice(0, 130).trim()}...`
		: description;
};

function App() {
	const [games, setGames] = useState<GameItem[]>([]);
	const [source, setSource] = useState(
		"https://rsshub.app/bangumi.tv/game/followrank",
	);
	const [updatedAt, setUpdatedAt] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const featuredGame = games[0];
	const rankedGames = useMemo(() => games.slice(1), [games]);

	const loadGames = async () => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch("/api/games");
			const data = (await response.json()) as GameResponse | { error: string };

			if (!response.ok || "error" in data) {
				throw new Error(
					"error" in data ? data.error : "无法读取 Bangumi 游戏关注榜。",
				);
			}

			setGames(data.items);
			setSource(data.source);
			setUpdatedAt(data.updatedAt);
		} catch (err) {
			setError(err instanceof Error ? err.message : "数据源暂时不可用。");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void loadGames();
	}, []);

	return (
		<main className="app-shell">
			<section className="hero">
				<div className="hero-copy">
					<p className="eyebrow">Bangumi.tv / Game Follow Rank</p>
					<h1>游戏关注榜</h1>
					<p className="hero-text">
						从 RSSHub 拉取 Bangumi 游戏成员关注榜，整理成一张适合快速浏览的热度看板。
					</p>
					<div className="hero-actions">
						<button type="button" onClick={loadGames} disabled={isLoading}>
							{isLoading ? "刷新中" : "刷新榜单"}
						</button>
						<a href={source} target="_blank" rel="noreferrer">
							查看数据源
						</a>
					</div>
				</div>

				<div className="hero-panel" aria-label="榜单摘要">
					<span className="panel-label">当前收录</span>
					<strong>{isLoading ? "--" : games.length}</strong>
					<span className="panel-note">热门游戏条目</span>
					<span className="panel-time">
						{updatedAt ? `同步于 ${formatTime(updatedAt)}` : "等待首次同步"}
					</span>
				</div>
			</section>

			{error ? (
				<section className="notice" role="alert">
					<strong>数据源连接失败</strong>
					<p>{error}</p>
					<p>
						rsshub.app 官方实例可能会限制请求；生产使用建议换成自建 RSSHub
						实例。
					</p>
				</section>
			) : null}

			{isLoading ? (
				<section className="game-grid" aria-label="加载中">
					{Array.from({ length: 9 }).map((_, index) => (
						<div className="game-card skeleton" key={index}>
							<div className="cover" />
							<div className="card-body">
								<span />
								<strong />
								<p />
							</div>
						</div>
					))}
				</section>
			) : featuredGame ? (
				<>
					<section className="featured">
						<a
							className="featured-cover"
							href={featuredGame.link}
							target="_blank"
							rel="noreferrer"
						>
							{featuredGame.image ? (
								<img src={featuredGame.image} alt={featuredGame.title} />
							) : (
								<span>{featuredGame.title.slice(0, 1)}</span>
							)}
						</a>
						<div className="featured-copy">
							<p className="rank-label">TOP 1</p>
							<h2>{featuredGame.title}</h2>
							<p>{getSummary(featuredGame.description)}</p>
							<a href={featuredGame.link} target="_blank" rel="noreferrer">
								打开 Bangumi 条目
							</a>
						</div>
					</section>

					<section className="game-grid" aria-label="游戏关注榜列表">
						{rankedGames.map((game, index) => (
							<a
								className="game-card"
								href={game.link}
								key={game.id}
								target="_blank"
								rel="noreferrer"
							>
								<div className="cover">
									{game.image ? (
										<img src={game.image} alt="" loading="lazy" />
									) : (
										<span>{game.title.slice(0, 1)}</span>
									)}
								</div>
								<div className="card-body">
									<span className="rank">#{index + 2}</span>
									<strong>{game.title}</strong>
									<p>{getSummary(game.description)}</p>
									<time>{formatTime(game.publishedAt)}</time>
								</div>
							</a>
						))}
					</section>
				</>
			) : (
				<section className="notice">
					<strong>榜单还是空的</strong>
					<p>数据源没有返回游戏条目，稍后刷新试试。</p>
				</section>
			)}
		</main>
	);
}

export default App;
