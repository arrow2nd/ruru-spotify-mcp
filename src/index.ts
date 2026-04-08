import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.ts";
import { createSpotifyClient } from "./spotify-client.ts";

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

if (!clientId || !clientSecret || !refreshToken) {
	console.error(
		"Missing required environment variables: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN",
	);
	process.exit(1);
}

const sdk = createSpotifyClient({ clientId, clientSecret, refreshToken });
const mcpServer = createMcpServer(sdk);

const transport = new StdioServerTransport();
await mcpServer.connect(transport);
