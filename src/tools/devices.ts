import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { z } from "zod";
import type { Registry } from "../registry.ts";

function formatDevicesTable(
	devices: { name: string; type: string; volumePercent: number | null; isActive: boolean }[],
): string {
	const header = "| デバイス名 | 種類 | 音量 | アクティブ |\n|---|---|---|---|";
	const rows = devices.map(
		(d) =>
			`| ${d.name} | ${d.type} | ${d.volumePercent ?? "-"}% | ${d.isActive ? "Yes" : "No"} |`,
	);
	return [header, ...rows].join("\n");
}

export function registerDeviceTools(
	server: McpServer,
	sdk: SpotifyApi,
	registry: Registry,
): void {
	server.registerTool(
		"get_devices",
		{
			description:
				"List all available Spotify Connect devices with their names, types, volume, and active status.",
		},
		async () => {
			const devices = await registry.listDevices();

			if (devices.length === 0) {
				return {
					content: [
						{
							type: "text" as const,
							text: "利用可能なデバイスがありません。Spotify アプリを開いてください",
						},
					],
				};
			}

			return {
				content: [
					{
						type: "text" as const,
						text: formatDevicesTable(devices),
					},
				],
			};
		},
	);

	server.registerTool(
		"transfer_playback",
		{
			description:
				"Transfer playback to another device by name. Use get_devices to see available devices.",
			inputSchema: {
				deviceName: z
					.string()
					.describe("転送先のデバイス名（get_devices で確認した名前を使用）"),
			},
		},
		async (args) => {
			const device = await registry.resolveDevice(args.deviceName);
			await sdk.player.transferPlayback([device.id], true);

			return {
				content: [
					{
						type: "text" as const,
						text: `再生を「${device.name}」に転送しました`,
					},
				],
			};
		},
	);
}
