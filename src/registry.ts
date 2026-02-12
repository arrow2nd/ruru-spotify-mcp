import type { SpotifyApi } from "@spotify/web-api-ts-sdk";

type ResolvedDevice = {
	id: string;
	name: string;
	type: string;
	volumePercent: number | null;
	isActive: boolean;
};

export function resolveByName<T>(
	items: T[],
	name: string,
	getName: (item: T) => string,
	label: string,
): T {
	const exact = items.find((item) => getName(item) === name);
	if (exact) {
		return exact;
	}

	const lower = name.toLowerCase();
	const caseInsensitive = items.find(
		(item) => getName(item).toLowerCase() === lower,
	);
	if (caseInsensitive) {
		return caseInsensitive;
	}

	const partial = items.filter((item) =>
		getName(item).toLowerCase().includes(lower),
	);
	if (partial.length === 1) {
		return partial[0];
	}

	if (partial.length > 1) {
		const candidates = partial.map((item) => getName(item)).join(", ");
		throw new Error(
			`「${name}」に一致する${label}が複数あります: ${candidates}`,
		);
	}

	const allNames = items.map((item) => getName(item)).join(", ");
	throw new Error(
		allNames
			? `${label}「${name}」が見つかりません。利用可能な${label}: ${allNames}`
			: `${label}「${name}」が見つかりません。利用可能な${label}がありません`,
	);
}

export class Registry {
	private sdk: SpotifyApi;

	constructor(sdk: SpotifyApi) {
		this.sdk = sdk;
	}

	async getDevices(): Promise<ResolvedDevice[]> {
		const result = await this.sdk.player.getAvailableDevices();
		return result.devices.map((d) => ({
			id: d.id ?? "",
			name: d.name,
			type: d.type,
			volumePercent: d.volume_percent,
			isActive: d.is_active,
		}));
	}

	async resolveDevice(name: string): Promise<ResolvedDevice> {
		const devices = await this.getDevices();
		return resolveByName(devices, name, (d) => d.name, "デバイス");
	}

	async listDevices(): Promise<Omit<ResolvedDevice, "id">[]> {
		const devices = await this.getDevices();
		return devices.map(({ name, type, volumePercent, isActive }) => ({
			name,
			type,
			volumePercent,
			isActive,
		}));
	}
}
