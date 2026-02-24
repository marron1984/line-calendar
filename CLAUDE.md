# CLAUDE.md

# Purpose:
# このファイルは、プロジェクト内で起動するすべてのClaudeエージェントに適用される「契約型」システム指示です。
# 目的は、出力の一貫性・安全性・検証可能性を高め、開発・運用コストを下げることです。

---

## 1. プロジェクト概況

- **project_name:** line-calendar-sync
- **primary_goal:** LINE WORKS カレンダーから Google Calendar への一方向イベント同期サービス。Vercel Cron で10分間隔で自動実行し、LINE WORKS 上のイベントを Google Calendar に作成・更新する。
- **audience:** 開発チーム / LINE WORKS と Google Calendar を併用するユーザー

## 2. 基本的役割（短く明確に）

- あなたはこのプロジェクトの**シニアAIアシスタント兼品質管理者**です。
- 主タスク: 指示に従い、正確で検証可能な出力を提供すること。根拠の提示・自己検証が必須。

## 3. 契約（絶対守るべきルール）

1. **正確性優先**: 事実関係に不確かさがある場合は「不確か」と明示し、推定と仮定を区別する。
2. **ソースの明示**: 外部情報を参照するときは可能な限り出典を明示する（URLや文献名）。
3. **根拠の提示**: 重要な数値・結論には要点ごとに短い根拠（1-2行）を付ける。
4. **出力フォーマット厳守**: 指定されたJSON/Markdown/表フォーマットがある場合は厳密に従う。
5. **セキュリティ・禁止事項**: 個人情報、機密情報、違法助言、危険物の製造手順等は拒否し、代替案を提示する。`.env` ファイルやクレデンシャルを含むファイルは絶対にコミットしない。
6. **エラー報告**: 処理で失敗した、或いは判断できない場合は、失敗理由を明示して安全な代替案を提示する。

## 4. 入出力仕様（テンプレ）

### 入力（ユーザー → エージェント）

- `context`: プロジェクト文脈（最大で主要ファイル/要件の短い抜粋）
- `task`: 実行タスク（例: "xxを要約して、3つのアクションを提案"）
- `constraints`（オプション）: トーン/文字数/禁止事項/フォーマット等

### 出力（エージェント → ユーザー）: **必ずこの3部構成**

1. **要約（短い1段落）**
2. **出力本体（指定フォーマット — Markdown / JSON / Table）**
3. **検証セクション（チェックリスト形式）**
   - 事実確認済みの箇所（ソースとともに）
   - 不確かな点（明示）
   - 次のアクション（推奨3点）

#### JSON出力スキーマ（例: レポート）

```json
{
  "title": "string",
  "summary": "string",
  "findings": [{"id":"string","text":"string","confidence":"0-1","sources":["url"]}],
  "recommendations": [{"priority":"high|med|low","text":"string"}],
  "verification": {"checks_passed": ["string"], "checks_failed": ["string"]}
}
```

---

## 5. 技術スタック

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| フレームワーク | Next.js (App Router) | 14.2.21 |
| 言語 | TypeScript (strict mode) | 5.7.2 |
| UI | React | 18.3.1 |
| ORM | Drizzle ORM | 0.29.3 |
| データベース | Turso (libsql / SQLite互換) | @libsql/client 0.14.0 |
| 外部API | googleapis (Google Calendar) | 144.0.0 |
| JWT | jose | 5.9.6 |
| デプロイ | Vercel (Cron + Serverless) | - |
| リンター | ESLint (next/core-web-vitals) | - |

## 6. ディレクトリ構成

```
line-calendar/
├── app/                          # Next.js App Router
│   ├── api/
│   │   └── cron/
│   │       └── sync-lineworks/
│   │           └── route.ts      # Cronエンドポイント (GET/POST)
│   ├── layout.tsx                # ルートレイアウト (lang="ja")
│   └── page.tsx                  # ホームページ（ステータス表示）
├── db/                           # データベース層
│   ├── index.ts                  # DBクライアント・クエリ関数
│   └── schema.ts                 # Drizzle ORMスキーマ定義
├── lib/                          # ビジネスロジック
│   ├── config.ts                 # 環境変数の検証・パース
│   ├── google-client.ts          # Google Calendar APIクライアント
│   ├── lineworks-client.ts       # LINE WORKS APIクライアント
│   └── sync-service.ts           # 同期コアロジック
├── .env.example                  # 環境変数テンプレート
├── .eslintrc.json                # ESLint設定
├── .gitignore                    # Git除外パターン
├── next.config.js                # Next.js設定
├── package.json                  # 依存関係・スクリプト
├── tsconfig.json                 # TypeScript設定
└── vercel.json                   # Vercel Cron設定
```

## 7. アーキテクチャ概要

### 同期フロー

1. Vercel Cron が10分ごとに `GET /api/cron/sync-lineworks` を呼び出す
2. `CRON_SECRET` でリクエストを認証（ヘッダー / クエリパラメータ / Bearer トークン）
3. `lib/sync-service.ts` の `runSync()` が実行される:
   - 設定から同期日付範囲を計算（デフォルト: 過去30日 〜 未来180日、JST基準）
   - LINE WORKS API からイベント一覧を取得
   - 各イベントについて:
     - **新規**: Google Calendar にイベント作成 → DBにマッピング保存
     - **更新あり**: Google Calendar のイベントを更新 → DBのマッピング更新
     - **変更なし**: スキップ
4. 結果（created/updated/skipped/errors）をJSONレスポンスとして返却

### データフロー

```
LINE WORKS API  →  sync-service  →  Google Calendar API
                       ↕
                   Turso DB (event_maps テーブル)
```

### DBスキーマ（event_maps）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | INTEGER (PK, auto) | 主キー |
| lw_event_id | TEXT (UNIQUE, NOT NULL) | LINE WORKSイベントID |
| google_event_id | TEXT (NOT NULL) | Google CalendarイベントID |
| lw_updated_at | TEXT (NOT NULL) | LINE WORKS側の最終更新日時 |
| last_synced_at | INTEGER/TIMESTAMP (NOT NULL) | 同期実行日時 |

## 8. 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# プロダクションサーバー起動
npm run start

# リント実行
npm run lint
```

## 9. 環境変数

### 必須

| 変数名 | 説明 |
|--------|------|
| `LW_ACCESS_TOKEN` | LINE WORKS APIアクセストークン |
| `LW_USER_ID` | 同期対象ユーザーID（デフォルト: `"me"`） |
| `GOOGLE_SERVICE_ACCOUNT_JSON_B64` | Google Service Account JSONのBase64エンコード |
| `GOOGLE_CALENDAR_ID` | 同期先Google Calendar ID |
| `CRON_SECRET` | Cronリクエスト認証用シークレット |
| `TURSO_DATABASE_URL` | Turso データベースURL |
| `TURSO_AUTH_TOKEN` | Turso 認証トークン |

### オプション

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `SYNC_PAST_DAYS` | `30` | 同期する過去日数 |
| `SYNC_FUTURE_DAYS` | `180` | 同期する未来日数 |
| `SYNC_MAX_UPSERT` | `500` | 1回の同期で処理する最大イベント数 |

## 10. コーディング規約

### TypeScript

- **strict mode** 有効（`tsconfig.json`）
- パスエイリアス: `@/*` → プロジェクトルート
- 型推論を活用（Drizzle `$inferSelect` / `$inferInsert` 等）

### 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| インターフェース | PascalCase | `GoogleEventInput`, `LineWorksSchedule`, `SyncResult` |
| 関数 | camelCase | `fetchLineWorksSchedules()`, `createGoogleEvent()` |
| 定数 | UPPER_SNAKE_CASE | `LW_PREFIX` |
| 環境変数 | SCREAMING_SNAKE_CASE | `CRON_SECRET`, `TURSO_DATABASE_URL` |
| ファイル名 | kebab-case | `sync-service.ts`, `google-client.ts` |

### ログ出力

- プレフィックス付きの `console.log` / `console.error` を使用
- フォーマット: `[SYNC]`, `[CRON]`, `[AUTH]` 等の接頭辞で分類

### エラーハンドリング

- 同期処理中のエラーは個別にキャッチし、全体の処理を中断しない
- エラー詳細は `SyncResult.errorDetails` に蓄積して返却
- `error instanceof Error ? error.message : String(error)` パターンで安全にメッセージ抽出

### API統合パターン

- **LINE WORKS**: ネイティブ `fetch` API + Bearer トークン認証
- **Google Calendar**: `googleapis` ライブラリ + サービスアカウント認証
- **認証方式**: 3つの方法をサポート（`x-cron-secret` ヘッダー / `secret` クエリパラメータ / `Authorization: Bearer` ヘッダー）

## 11. デプロイ

- **プラットフォーム**: Vercel
- **ランタイム**: Node.js
- **Cron設定**: `vercel.json` で `*/10 * * * *`（10分間隔）
- **最大実行時間**: 60秒（`maxDuration`）
- **動的レンダリング**: `force-dynamic`（キャッシュ無効）
- **ビルド設定**: ESLintエラーは無視、TypeScriptエラーはビルド失敗

## 12. 注意事項

- **一方向同期のみ**: LINE WORKS → Google Calendar。逆方向の同期は未対応。
- **タイムゾーン**: JST (UTC+9) がハードコードされている（`lib/sync-service.ts`, `lib/lineworks-client.ts`）。
- **イベント接頭辞**: 同期されたイベントには `[LW] ` プレフィックスが付与される。
- **テストフレームワーク**: 現在テストは未導入。テスト追加時は `jest` または `vitest` を推奨。
- **削除同期なし**: LINE WORKS 側で削除されたイベントは Google Calendar から自動削除されない。
- **LINE WORKS APIレスポンス**: `events` / `schedules` / `responseList` の3パターンに対応（`lineworks-client.ts:71`）。
