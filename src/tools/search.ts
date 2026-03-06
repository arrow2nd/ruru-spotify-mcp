import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
	Artist,
	SimplifiedAlbum,
	SimplifiedPlaylist,
	SpotifyApi,
	Track,
} from "@spotify/web-api-ts-sdk";
import { z } from "zod";

function formatDuration(ms: number): string {
	const minutes = Math.floor(ms / 60000);
	const seconds = Math.floor((ms % 60000) / 1000);
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatTracksTable(tracks: Track[]): string {
	const header =
		"| # | トラック | アーティスト | アルバム | 時間 | 人気度 |\n|---|---|---|---|---|---|";
	const rows = tracks.map(
		(t, i) =>
			`| ${i + 1} | ${t.name} | ${t.artists.map((a) => a.name).join(", ")} | ${t.album.name} | ${formatDuration(t.duration_ms)} | ${t.popularity} |`,
	);
	return [header, ...rows].join("\n");
}

function formatAlbumsTable(albums: SimplifiedAlbum[]): string {
	const header =
		"| # | アルバム | アーティスト | リリース日 | 曲数 |\n|---|---|---|---|---|";
	const rows = albums.map(
		(a, i) =>
			`| ${i + 1} | ${a.name} | ${a.artists.map((ar) => ar.name).join(", ")} | ${a.release_date} | ${a.total_tracks} |`,
	);
	return [header, ...rows].join("\n");
}

function formatArtistsTable(artists: Artist[]): string {
	const header =
		"| # | アーティスト | ジャンル | フォロワー | 人気度 |\n|---|---|---|---|---|";
	const rows = artists.map(
		(a, i) =>
			`| ${i + 1} | ${a.name} | ${(a.genres ?? []).join(", ") || "-"} | ${(a.followers?.total ?? 0).toLocaleString()} | ${a.popularity} |`,
	);
	return [header, ...rows].join("\n");
}

function formatPlaylistsTable(playlists: SimplifiedPlaylist[]): string {
	const header =
		"| # | プレイリスト | オーナー | 曲数 | 説明 |\n|---|---|---|---|---|";
	const rows = playlists.map(
		(p, i) =>
			`| ${i + 1} | ${p.name} | ${p.owner.display_name} | ${p.tracks?.total ?? 0} | ${p.description || "-"} |`,
	);
	return [header, ...rows].join("\n");
}

export function registerSearchTools(server: McpServer, sdk: SpotifyApi): void {
	server.registerTool(
		"search",
		{
			description:
				"Search Spotify for tracks, albums, artists, or playlists. Returns name-based results without IDs.",
			inputSchema: {
				query: z.string().describe("検索クエリ"),
				type: z
					.enum(["track", "album", "artist", "playlist"])
					.describe("検索対象の種類"),
			},
		},
		async (args) => {
			const results = await sdk.search(args.query, [args.type], undefined, 10);

			let markdown: string;

			switch (args.type) {
				case "track": {
					const items = results.tracks?.items ?? [];
					if (items.length === 0) {
						return {
							content: [
								{
									type: "text" as const,
									text: `「${args.query}」に一致するトラックが見つかりません`,
								},
							],
						};
					}
					markdown = formatTracksTable(items);
					break;
				}
				case "album": {
					const items = results.albums?.items ?? [];
					if (items.length === 0) {
						return {
							content: [
								{
									type: "text" as const,
									text: `「${args.query}」に一致するアルバムが見つかりません`,
								},
							],
						};
					}
					markdown = formatAlbumsTable(items);
					break;
				}
				case "artist": {
					const items = results.artists?.items ?? [];
					if (items.length === 0) {
						return {
							content: [
								{
									type: "text" as const,
									text: `「${args.query}」に一致するアーティストが見つかりません`,
								},
							],
						};
					}
					markdown = formatArtistsTable(items);
					break;
				}
				case "playlist": {
					// SDK の型定義では PlaylistBase だが、API は tracks を返す
					const items = (results.playlists?.items ?? []) as unknown as SimplifiedPlaylist[];
					if (items.length === 0) {
						return {
							content: [
								{
									type: "text" as const,
									text: `「${args.query}」に一致するプレイリストが見つかりません`,
								},
							],
						};
					}
					markdown = formatPlaylistsTable(items);
					break;
				}
			}

			return {
				content: [
					{
						type: "text" as const,
						text: markdown,
					},
				],
			};
		},
	);
}
