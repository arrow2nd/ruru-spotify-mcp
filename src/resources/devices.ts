import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Registry } from "../registry.ts";
import { formatDeviceList } from "../tools/devices.ts";

export function registerDeviceResources(
	server: McpServer,
	registry: Registry,
): void {
	server.registerResource(
		"devices",
		"spotify://devices",
		{
			description:
				"All available Spotify Connect devices with their names, types, volume, and active status.",
			mimeType: "text/yaml",
		},
		async (uri) => {
			try {
				return {
					contents: [
						{
							uri: uri.href,
							mimeType: "text/yaml",
							text: await formatDeviceList(registry),
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
