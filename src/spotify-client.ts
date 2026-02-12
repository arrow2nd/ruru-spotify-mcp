import type {
	AccessToken,
	IAuthStrategy,
	SdkConfiguration,
} from "@spotify/web-api-ts-sdk";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

export type SpotifyClientConfig = {
	clientId: string;
	clientSecret: string;
	refreshToken: string;
};

type TokenResponse = {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token?: string;
	scope: string;
};

class RefreshTokenStrategy implements IAuthStrategy {
	private accessToken: AccessToken | null = null;

	constructor(private config: SpotifyClientConfig) {}

	setConfiguration(_config: SdkConfiguration): void {}

	async getOrCreateAccessToken(): Promise<AccessToken> {
		if (this.accessToken?.expires && this.accessToken.expires > Date.now()) {
			return this.accessToken;
		}

		this.accessToken = await this.refresh();
		return this.accessToken;
	}

	async getAccessToken(): Promise<AccessToken | null> {
		return this.accessToken;
	}

	removeAccessToken(): void {
		this.accessToken = null;
	}

	private async refresh(): Promise<AccessToken> {
		const basic = Buffer.from(
			`${this.config.clientId}:${this.config.clientSecret}`,
		).toString("base64");

		const res = await fetch(TOKEN_ENDPOINT, {
			method: "POST",
			headers: {
				Authorization: `Basic ${basic}`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				grant_type: "refresh_token",
				refresh_token: this.config.refreshToken,
			}),
		});

		if (!res.ok) {
			throw new Error(
				`トークンのリフレッシュに失敗しました: ${res.status} ${res.statusText}`,
			);
		}

		const data = (await res.json()) as TokenResponse;

		return {
			access_token: data.access_token,
			token_type: data.token_type,
			expires_in: data.expires_in,
			refresh_token: data.refresh_token ?? this.config.refreshToken,
			expires: Date.now() + data.expires_in * 1000,
		};
	}
}

export function createSpotifyClient(config: SpotifyClientConfig): SpotifyApi {
	const strategy = new RefreshTokenStrategy(config);
	return new SpotifyApi(strategy, {
		// 再生制御系エンドポイントが 2xx で非 JSON を返すケースに対応
		deserializer: {
			async deserialize<T>(response: Response): Promise<T> {
				const text = await response.text();
				if (text.length === 0) {
					return null as T;
				}
				try {
					return JSON.parse(text) as T;
				} catch {
					return null as T;
				}
			},
		},
	});
}
