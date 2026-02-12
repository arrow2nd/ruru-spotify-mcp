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

if (process.argv.includes("--http")) {
	const { StreamableHTTPTransport } = await import("@hono/mcp");
	const { serve } = await import("@hono/node-server");
	const { Hono } = await import("hono");

	const port = process.env.PORT ? Number(process.env.PORT) : 0;

	const transport = new StreamableHTTPTransport();
	await mcpServer.connect(transport);

	const app = new Hono();
	app.all("/mcp", (c) => transport.handleRequest(c));
	app.get("/health", (c) => c.json({ status: "ok" }));

	serve({ fetch: app.fetch, port, hostname: "127.0.0.1" }, (info) => {
		console.error(
			`ruru-spotify-mcp server running on http://localhost:${info.port}`,
		);
		console.error(`MCP endpoint: http://localhost:${info.port}/mcp`);
	});
} else {
	const transport = new StdioServerTransport();
	await mcpServer.connect(transport);
}
