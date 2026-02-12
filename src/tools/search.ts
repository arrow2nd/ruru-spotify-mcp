import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
	Artist,
	SimplifiedAlbum,
	SimplifiedPlaylist,
	SpotifyApi,
	Track,
} from "@spotify/web-api-ts-sdk";
import { z } from "zod";

function formatTrack(track: Track) {
	return {
		name: track.name,
		artists: track.artists.map((a) => a.name),
		album: track.album.name,
		durationMs: track.duration_ms,
		popularity: track.popularity,
	};
}

function formatAlbum(album: SimplifiedAlbum) {
	return {
		name: album.name,
		artists: album.artists.map((a) => a.name),
		releaseDate: album.release_date,
		totalTracks: album.total_tracks,
	};
}

function formatArtist(artist: Artist) {
	return {
		name: artist.name,
		genres: artist.genres,
		popularity: artist.popularity,
		followers: artist.followers?.total ?? 0,
	};
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

			let formatted: unknown[];

			switch (args.type) {
				case "track":
					formatted = (results.tracks?.items ?? []).map(formatTrack);
					break;
				case "album":
					formatted = (results.albums?.items ?? []).map(formatAlbum);
					break;
				case "artist":
					formatted = (results.artists?.items ?? []).map(formatArtist);
					break;
				case "playlist":
					formatted = (results.playlists?.items ?? []).map((p) => {
						// SDK の型定義では PlaylistBase だが、API は tracks を返す
						const pl = p as unknown as SimplifiedPlaylist;
						return {
							name: pl.name,
							description: pl.description,
							owner: pl.owner.display_name,
							trackCount: pl.tracks?.total ?? 0,
						};
					});
					break;
			}

			if (formatted.length === 0) {
				return {
					content: [
						{
							type: "text" as const,
							text: `「${args.query}」に一致する${args.type}が見つかりません`,
						},
					],
				};
			}

			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(formatted, null, 2),
					},
				],
			};
		},
	);
}
