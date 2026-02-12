import assert from "node:assert";
import { describe, it } from "node:test";
import { resolveByName } from "./registry.ts";

type Item = { id: string; name: string };

const items: Item[] = [
	{ id: "1", name: "Morning Vibes" },
	{ id: "2", name: "Evening Chill" },
	{ id: "3", name: "Morning Run" },
	{ id: "4", name: "Deep Focus" },
];

describe("resolveByName", () => {
	it("完全一致で解決できる", () => {
		const result = resolveByName(
			items,
			"Deep Focus",
			(i) => i.name,
			"プレイリスト",
		);
		assert.strictEqual(result.id, "4");
	});

	it("大文字小文字を無視して解決できる", () => {
		const result = resolveByName(
			items,
			"deep focus",
			(i) => i.name,
			"プレイリスト",
		);
		assert.strictEqual(result.id, "4");
	});

	it("部分一致が1件の場合に解決できる", () => {
		const result = resolveByName(items, "chill", (i) => i.name, "プレイリスト");
		assert.strictEqual(result.id, "2");
	});

	it("部分一致が複数の場合に候補付きエラーを投げる", () => {
		assert.throws(
			() => resolveByName(items, "morning", (i) => i.name, "プレイリスト"),
			(err: Error) => {
				assert.ok(err.message.includes("複数あります"));
				assert.ok(err.message.includes("Morning Vibes"));
				assert.ok(err.message.includes("Morning Run"));
				return true;
			},
		);
	});

	it("一致なしの場合に利用可能な一覧付きエラーを投げる", () => {
		assert.throws(
			() => resolveByName(items, "nonexistent", (i) => i.name, "プレイリスト"),
			(err: Error) => {
				assert.ok(err.message.includes("見つかりません"));
				assert.ok(err.message.includes("Morning Vibes"));
				return true;
			},
		);
	});

	it("空リストの場合にエラーを投げる", () => {
		assert.throws(
			() => resolveByName([], "test", (i: Item) => i.name, "プレイリスト"),
			(err: Error) => {
				assert.ok(err.message.includes("見つかりません"));
				assert.ok(err.message.includes("ありません"));
				return true;
			},
		);
	});
});
