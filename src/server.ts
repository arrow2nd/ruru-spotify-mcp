import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { Registry } from "./registry.ts";
import { registerDeviceTools } from "./tools/devices.ts";
import { registerPlaybackTools } from "./tools/playback.ts";
import { registerSearchTools } from "./tools/search.ts";

export function createMcpServer(sdk: SpotifyApi): McpServer {
	const server = new McpServer({
		name: "ruru-spotify-mcp",
		version: "0.1.0",
	});

	const registry = new Registry(sdk);

	registerSearchTools(server, sdk);
	registerPlaybackTools(server, sdk);
	registerDeviceTools(server, sdk, registry);

	return server;
}
