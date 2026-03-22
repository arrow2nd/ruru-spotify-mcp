/**
 * YAML変換ユーティリティ
 *
 * 外部ライブラリ不要。フラットオブジェクト・配列のみ対応。
 */

export function formatDuration(ms: number): string {
	const minutes = Math.floor(ms / 60000);
	const seconds = Math.floor((ms % 60000) / 1000);
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function yamlStr(value: string): string {
	return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function yamlValue(value: unknown): string {
	if (typeof value === "string") {
		return yamlStr(value);
	}
	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}
	if (typeof value === "number") {
		return String(value);
	}
	return yamlStr(String(value));
}

export function toYamlObject(obj: Record<string, unknown>): string {
	return Object.entries(obj)
		.map(([key, val]) => `${key}: ${yamlValue(val)}`)
		.join("\n");
}

export function toYamlList(items: Record<string, unknown>[]): string {
	return items
		.map((item) => {
			const entries = Object.entries(item);
			return entries
				.map(([key, val], i) => {
					const prefix = i === 0 ? "- " : "  ";
					return `${prefix}${key}: ${yamlValue(val)}`;
				})
				.join("\n");
		})
		.join("\n");
}
