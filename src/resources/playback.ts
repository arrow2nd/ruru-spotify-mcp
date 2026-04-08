import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { formatPlaybackState, formatQueue } from "../tools/playback.ts";

export function registerPlaybackResources(
	server: McpServer,
	sdk: SpotifyApi,
): void {
	server.registerResource(
		"current_playback",
		"spotify://playback",
		{
			description:
				"Current playback state including the playing track, device, progress, volume, shuffle, and repeat mode.",
			mimeType: "text/yaml",
		},
		async (uri) => {
			try {
				return {
					contents: [
						{
							uri: uri.href,
							mimeType: "text/yaml",
							text: await formatPlaybackState(sdk),
						},
					],
				};
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Spotify API との通信に失敗しました";
				return {
					contents: [{ uri: uri.href, mimeType: "text/plain", text: message }],
				};
			}
		},
	);

	server.registerResource(
		"queue",
		"spotify://queue",
		{
			description:
				"The current playback queue including the currently playing track and upcoming tracks.",
			mimeType: "text/yaml",
		},
		async (uri) => {
			try {
				return {
					contents: [
						{
							uri: uri.href,
							mimeType: "text/yaml",
							text: await formatQueue(sdk),
						},
					],
				};
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Spotify API との通信に失敗しました";
				return {
					contents: [{ uri: uri.href, mimeType: "text/plain", text: message }],
				};
			}
		},
	);
}
