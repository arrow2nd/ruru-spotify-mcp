/**
 * Spotify OAuth 認可コードフローで refresh_token を取得するスクリプト。
 *
 * 使い方:
 *   npx tsx scripts/get-refresh-token.ts
 *
 * 1. Client ID / Client Secret を入力
 * 2. ブラウザで表示された URL を開き Spotify にログインして許可
 * 3. リダイレクト後、ターミナルに refresh_token が表示される
 */

import { createInterface } from "node:readline/promises";
import { createServer } from "node:http";
import { URL } from "node:url";

const rl = createInterface({ input: process.stdin, output: process.stdout });

const clientId = (await rl.question("Spotify Client ID: ")).trim();
const clientSecret = (await rl.question("Spotify Client Secret: ")).trim();

rl.close();

if (!clientId || !clientSecret) {
	console.error("\nClient ID と Client Secret は必須です");
	process.exit(1);
}

const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = [
	"user-read-playback-state",
	"user-modify-playback-state",
	"user-read-recently-played",
	"user-read-private",
	"playlist-read-private",
	"playlist-read-collaborative",
	"playlist-modify-public",
	"playlist-modify-private",
];

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

async function exchangeCode(code: string): Promise<{
	access_token: string;
	refresh_token: string;
}> {
	const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

	const res = await fetch(TOKEN_ENDPOINT, {
		method: "POST",
		headers: {
			Authorization: `Basic ${basic}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: REDIRECT_URI,
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Token exchange failed: ${res.status} ${text}`);
	}

	return (await res.json()) as {
		access_token: string;
		refresh_token: string;
	};
}

// コールバックを待ち受けるローカルサーバー
const server = createServer(async (req, res) => {
	const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

	if (url.pathname !== "/callback") {
		res.writeHead(404);
		res.end("Not Found");
		return;
	}

	const error = url.searchParams.get("error");
	if (error) {
		res.writeHead(400);
		res.end(`Authorization failed: ${error}`);
		console.error(`\nAuthorization failed: ${error}`);
		process.exit(1);
	}

	const code = url.searchParams.get("code");
	if (!code) {
		res.writeHead(400);
		res.end("Missing authorization code");
		return;
	}

	try {
		const tokens = await exchangeCode(code);

		res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
		res.end(
			"<h1>OK</h1><p>refresh_token を取得しました。ターミナルを確認してください。このタブは閉じて構いません。</p>",
		);

		console.log("\n=== refresh_token を取得しました ===\n");
		console.log(tokens.refresh_token);
		console.log(
			"\nこの値を SPOTIFY_REFRESH_TOKEN 環境変数に設定してください\n",
		);
	} catch (e) {
		res.writeHead(500);
		res.end("Token exchange failed");
		console.error(e);
	}

	server.close();
	process.exit(0);
});

server.listen(PORT, () => {
	const authUrl = new URL("https://accounts.spotify.com/authorize");
	authUrl.searchParams.set("client_id", clientId);
	authUrl.searchParams.set("response_type", "code");
	authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
	authUrl.searchParams.set("scope", SCOPES.join(" "));

	console.log(
		"\nブラウザで以下の URL を開いて Spotify にログインしてください:\n",
	);
	console.log(authUrl.toString());
	console.log("\nコールバック待機中...");
});
