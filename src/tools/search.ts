import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
	Artist,
	SimplifiedAlbum,
	SimplifiedPlaylist,
	SpotifyApi,
	Track,
} from "@spotify/web-api-ts-sdk";
import { z } from "zod";
import { formatDuration, toYamlList } from "../format.ts";

function formatTracks(tracks: Track[]): string {
	return toYamlList(
		tracks.map((t) => ({
			name: t.name,
			artists: t.artists.map((a) => a.name).join(", "),
			album: t.album.name,
			duration: formatDuration(t.duration_ms),
			popularity: t.popularity,
		})),
	);
}

function formatAlbums(albums: SimplifiedAlbum[]): string {
	return toYamlList(
		albums.map((a) => ({
			name: a.name,
			artists: a.artists.map((ar) => ar.name).join(", "),
			released: a.release_date,
			tracks: a.total_tracks,
		})),
	);
}

function formatArtists(artists: Artist[]): string {
	return toYamlList(
		artists.map((a) => ({
			name: a.name,
			genres: (a.genres ?? []).join(", ") || "-",
			followers: a.followers?.total ?? 0,
			popularity: a.popularity,
		})),
	);
}

function formatPlaylists(playlists: SimplifiedPlaylist[]): string {
	return toYamlList(
		playlists.map((p) => ({
			name: p.name,
			owner: p.owner.display_name,
			tracks: p.tracks?.total ?? 0,
			description: p.description || "-",
		})),
	);
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

			let yaml: string;

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
					yaml = formatTracks(items);
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
					yaml = formatAlbums(items);
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
					yaml = formatArtists(items);
					break;
				}
				case "playlist": {
					// SDK の型定義では PlaylistBase だが、API は tracks を返す
					const items = (results.playlists?.items ??
						[]) as unknown as SimplifiedPlaylist[];
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
					yaml = formatPlaylists(items);
					break;
				}
			}

			return {
				content: [
					{
						type: "text" as const,
						text: yaml,
					},
				],
			};
		},
	);
}
