import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Episode, SpotifyApi, Track } from "@spotify/web-api-ts-sdk";
import { z } from "zod";
import { formatDuration, toYamlList, toYamlObject } from "../format.ts";

export function trackFields(item: Track | Episode): Record<string, unknown> {
	if (item.type === "track") {
		const track = item as Track;
		return {
			name: track.name,
			artists: track.artists.map((a) => a.name).join(", "),
			album: track.album.name,
			duration: formatDuration(track.duration_ms),
		};
	}
	const episode = item as Episode;
	return {
		name: episode.name,
		show: episode.show?.name ?? "-",
		duration: formatDuration(episode.duration_ms),
	};
}

export async function formatPlaybackState(sdk: SpotifyApi): Promise<string> {
	const state = await sdk.player.getPlaybackState();
	if (!state) {
		return "現在再生中のトラックはありません";
	}

	const item = state.item;
	const obj: Record<string, unknown> = {};

	if (item) {
		Object.assign(obj, trackFields(item));
	} else {
		obj.name = "不明";
	}

	obj.progress = formatDuration(state.progress_ms);
	obj.playing = state.is_playing;
	obj.device = state.device.name;
	obj.device_type = state.device.type;
	obj.volume = state.device.volume_percent;
	obj.repeat = state.repeat_state;
	obj.shuffle = state.shuffle_state;

	return toYamlObject(obj);
}

export async function formatQueue(sdk: SpotifyApi): Promise<string> {
	const queue = await sdk.player.getUsersQueue();

	const indent = (s: string) => s.replace(/^/gm, "  ");

	const currentYaml = queue.currently_playing
		? indent(
				toYamlObject(
					trackFields(queue.currently_playing as Track | Episode),
				),
			)
		: "  name: null";

	const queueYaml =
		queue.queue.length === 0
			? "  []"
			: indent(
					toYamlList(
						queue.queue.map((item) => trackFields(item as Track | Episode)),
					),
				);

	return `current:\n${currentYaml}\nqueue:\n${queueYaml}`;
}

async function searchTrack(sdk: SpotifyApi, query: string): Promise<Track> {
	const results = await sdk.search(query, ["track"], undefined, 1);
	const track = results.tracks?.items[0];
	if (!track) {
		throw new Error(`「${query}」に一致するトラックが見つかりません`);
	}
	return track;
}

function wrapPlayerError(error: unknown): never {
	if (error instanceof Error) {
		const msg = error.message;
		if (msg.includes("403") || msg.includes("Forbidden")) {
			throw new Error("この操作には Spotify Premium が必要です");
		}
		if (msg.includes("404") || msg.includes("Not Found")) {
			throw new Error(
				"アクティブなデバイスが見つかりません。Spotify アプリを開いてデバイスをアクティブにしてください",
			);
		}
	}
	throw error;
}

export function registerPlaybackTools(
	server: McpServer,
	sdk: SpotifyApi,
): void {
	server.registerTool(
		"get_playback_state",
		{
			description:
				"Get the current playback state including the currently playing track, device, and progress.",
		},
		async () => {
			const text = await formatPlaybackState(sdk);
			return {
				content: [{ type: "text" as const, text }],
			};
		},
	);

	server.registerTool(
		"play",
		{
			description:
				"Start or resume playback. If query is provided, searches for the track/album/artist/playlist and plays it. Without query, resumes current playback.",
			inputSchema: {
				query: z.string().optional().describe("検索クエリ（省略時は再開）"),
				type: z
					.enum(["track", "album", "artist", "playlist"])
					.optional()
					.describe("検索対象の種類（デフォルト: track）"),
			},
		},
		async (args) => {
			try {
				if (!args.query) {
					await sdk.player.startResumePlayback("");
					return {
						content: [{ type: "text" as const, text: "再生を再開しました" }],
					};
				}

				const type = args.type ?? "track";
				const results = await sdk.search(args.query, [type], undefined, 1);

				if (type === "track") {
					const track = results.tracks?.items[0];
					if (!track) {
						throw new Error(
							`「${args.query}」に一致するトラックが見つかりません`,
						);
					}
					await sdk.player.startResumePlayback("", undefined, [track.uri]);
					return {
						content: [
							{
								type: "text" as const,
								text: `「${track.name}」(${track.artists.map((a) => a.name).join(", ")}) を再生します`,
							},
						],
					};
				}

				// album, artist, playlist はコンテキスト URI で再生
				let contextUri: string | undefined;
				let displayName: string | undefined;

				if (type === "album") {
					const album = results.albums?.items[0];
					if (!album) {
						throw new Error(
							`「${args.query}」に一致するアルバムが見つかりません`,
						);
					}
					contextUri = album.uri;
					displayName = album.name;
				} else if (type === "artist") {
					const artist = results.artists?.items[0];
					if (!artist) {
						throw new Error(
							`「${args.query}」に一致するアーティストが見つかりません`,
						);
					}
					contextUri = artist.uri;
					displayName = artist.name;
				} else {
					const playlist = results.playlists?.items[0];
					if (!playlist) {
						throw new Error(
							`「${args.query}」に一致するプレイリストが見つかりません`,
						);
					}
					contextUri = playlist.uri;
					displayName = playlist.name;
				}

				await sdk.player.startResumePlayback("", contextUri);
				return {
					content: [
						{
							type: "text" as const,
							text: `「${displayName}」を再生します`,
						},
					],
				};
			} catch (error) {
				wrapPlayerError(error);
			}
		},
	);

	server.registerTool(
		"pause",
		{
			description: "Pause the current playback.",
		},
		async () => {
			try {
				await sdk.player.pausePlayback("");
				return {
					content: [{ type: "text" as const, text: "再生を一時停止しました" }],
				};
			} catch (error) {
				wrapPlayerError(error);
			}
		},
	);

	server.registerTool(
		"skip_to_next",
		{
			description: "Skip to the next track.",
		},
		async () => {
			try {
				await sdk.player.skipToNext("");
				return {
					content: [
						{ type: "text" as const, text: "次のトラックにスキップしました" },
					],
				};
			} catch (error) {
				wrapPlayerError(error);
			}
		},
	);

	server.registerTool(
		"skip_to_previous",
		{
			description: "Skip to the previous track.",
		},
		async () => {
			try {
				await sdk.player.skipToPrevious("");
				return {
					content: [
						{ type: "text" as const, text: "前のトラックに戻りました" },
					],
				};
			} catch (error) {
				wrapPlayerError(error);
			}
		},
	);

	server.registerTool(
		"set_volume",
		{
			description: "Set the playback volume (0-100).",
			inputSchema: {
				volumePercent: z.number().min(0).max(100).describe("音量 (0-100)"),
			},
		},
		async (args) => {
			try {
				await sdk.player.setPlaybackVolume(args.volumePercent);
				return {
					content: [
						{
							type: "text" as const,
							text: `音量を ${args.volumePercent}% に設定しました`,
						},
					],
				};
			} catch (error) {
				wrapPlayerError(error);
			}
		},
	);

	server.registerTool(
		"set_repeat_mode",
		{
			description:
				"Set the repeat mode: 'off' (no repeat), 'track' (repeat current track), or 'context' (repeat current context like album/playlist).",
			inputSchema: {
				state: z.enum(["off", "track", "context"]).describe("リピートモード"),
			},
		},
		async (args) => {
			try {
				await sdk.player.setRepeatMode(args.state);
				return {
					content: [
						{
							type: "text" as const,
							text: `リピートモードを「${args.state}」に設定しました`,
						},
					],
				};
			} catch (error) {
				wrapPlayerError(error);
			}
		},
	);

	server.registerTool(
		"toggle_shuffle",
		{
			description: "Enable or disable shuffle mode.",
			inputSchema: {
				enabled: z.boolean().describe("シャッフルを有効にするか"),
			},
		},
		async (args) => {
			try {
				await sdk.player.togglePlaybackShuffle(args.enabled);
				return {
					content: [
						{
							type: "text" as const,
							text: `シャッフルを${args.enabled ? "有効" : "無効"}にしました`,
						},
					],
				};
			} catch (error) {
				wrapPlayerError(error);
			}
		},
	);

	server.registerTool(
		"add_to_queue",
		{
			description: "Search for a track and add it to the playback queue.",
			inputSchema: {
				query: z.string().describe("トラックの検索クエリ"),
			},
		},
		async (args) => {
			try {
				const track = await searchTrack(sdk, args.query);
				await sdk.player.addItemToPlaybackQueue(track.uri);

				return {
					content: [
						{
							type: "text" as const,
							text: `「${track.name}」(${track.artists.map((a) => a.name).join(", ")}) をキューに追加しました`,
						},
					],
				};
			} catch (error) {
				wrapPlayerError(error);
			}
		},
	);

	server.registerTool(
		"get_queue",
		{
			description: "Get the current playback queue.",
		},
		async () => {
			const text = await formatQueue(sdk);
			return {
				content: [{ type: "text" as const, text }],
			};
		},
	);

	server.registerTool(
		"get_recently_played",
		{
			description: "Get the recently played tracks.",
		},
		async () => {
			const result = await sdk.player.getRecentlyPlayedTracks(20);

			const yaml = toYamlList(
				result.items.map((item) => ({
					name: item.track.name,
					artists: item.track.artists.map((a) => a.name).join(", "),
					album: item.track.album.name,
					played_at: item.played_at,
				})),
			);

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
