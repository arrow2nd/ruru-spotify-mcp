# ruru-spotify-mcp

## 必要なもの

- Node.js >= 22
- Spotify Premium アカウント（再生制御に必要）
- [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) で作成したアプリの Client ID / Client Secret

## セットアップ

### 1. Refresh Token の取得

```bash
npx tsx scripts/get-refresh-token.ts
```

対話形式で Client ID / Client Secret を入力し、ブラウザで Spotify 認可を行うと `refresh_token` が表示される。

### 2. 環境変数の設定

```bash
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REFRESH_TOKEN=your_refresh_token
```

### 3. ビルド

```bash
npm install
npm run build
```

## 使い方

### Claude Desktop での設定例

```json
{
  "mcpServers": {
    "spotify": {
      "command": "node",
      "args": ["/path/to/ruru-spotify-mcp/dist/index.js"],
      "env": {
        "SPOTIFY_CLIENT_ID": "your_client_id",
        "SPOTIFY_CLIENT_SECRET": "your_client_secret",
        "SPOTIFY_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

## Tools

| Tool | 説明 |
|------|------|
| `search` | トラック / アルバム / アーティスト / プレイリストを検索 |
| `play` | 検索して再生、またはクエリなしで再開 |
| `pause` | 一時停止 |
| `skip_to_next` | 次のトラックへスキップ |
| `skip_to_previous` | 前のトラックへ戻る |
| `set_volume` | 音量設定 (0-100) |
| `set_repeat_mode` | リピートモード設定 (off / track / context) |
| `toggle_shuffle` | シャッフル切替 |
| `add_to_queue` | トラックをキューに追加 |
| `get_playback_state` | 現在の再生状態を取得 |
| `get_queue` | 再生キューを取得 |
| `get_recently_played` | 最近再生したトラックを取得 |
| `get_devices` | 利用可能なデバイス一覧 |
| `transfer_playback` | 再生デバイスを名前で切替 |

## Resources

LLM が現在の Spotify 環境をスナップショットとして読み取るためのリソース。

| リソース | URI | 説明 |
|----------|-----|------|
| `current_playback` | `spotify://playback` | 再生状態（トラック、デバイス、進捗、音量、シャッフル、リピート） |
| `queue` | `spotify://queue` | 再生中のトラックと再生キュー |
| `devices` | `spotify://devices` | 利用可能な Spotify Connect デバイス一覧 |

## 開発

```bash
npm run dev          # 開発サーバー起動
npm run check        # Lint
npm run typecheck    # 型チェック
npm test             # テスト実行
npm run build        # ビルド
```
