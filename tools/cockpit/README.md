# AI秘書コックピット

Notionに散らばっている「タスク管理」「Inbox（思考ログ）」「読書リスト」「文章DB」を、
**1枚のHTMLダッシュボード**に集約して一望するためのツールです。

Slack通知（#ai-daily など）が「流れるフロー」だとすると、これは「いま全体がどうなっているか」を
見渡すストック側の運転席です。ブラウザで `dashboard.html` を開くだけで動きます（サーバー不要・完全オフライン）。

## 何が見えるか

- **KPIタイル** — 未完了タスク / Inbox蓄積数と未整理 / あとで読む未読 / 積読 / 書きかけ文章
- **秘書メモ** — その日のデータから合成した「今日の視点」（優先すべきこと・停滞しているもの）
- **タスク** — 未完了タスクと期限カウントダウン
- **執筆パイプライン** — 文章DBの各記事の状態・文字数・停滞アラート（○ヶ月止まっている等）
- **思考ログの地図** — Inboxの思想サブテーマ分布（自己分析・自分史・AI活用…）、タグ・ソース分布、あとで読むリスト
- **読書** — 読了/積読メーター、「次に読む候補」（マスト→高、WE・ベイン指定の仕事直結本を優先する運用ルール準拠）

## 更新のしかた（Cowork / Claude に頼む）

このダッシュボードは `snapshot.json` のデータを表示しているだけなので、
更新はスナップショットの再生成だけで済みます。Coworkにこう頼んでください：

> Notionの「タスク管理」「Inbox」「読書リスト」「文章」データベースを読んで、
> `tools/cockpit/snapshot.json` を同じ形式で今日の内容に更新して、
> `node tools/cockpit/generate.mjs` を実行して。できた dashboard.html を見せて。

週次プランニング（日曜夜）のスケジュールタスクに1行足しておくと、毎週自動で最新になります。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `dashboard.html` | ダッシュボード本体（データ埋め込み済み・これだけで動く） |
| `snapshot.json` | Notionから取得したデータのスナップショット |
| `generate.mjs` | snapshot.json を dashboard.html に埋め込むスクリプト |

## snapshot.json の形式

```jsonc
{
  "generatedAt": "YYYY-MM-DD",      // スナップショット日（期限カウントの基準日）
  "tasks":    [{ "task", "project", "type", "priority", "status", "due", "note", "url" }],
  "writings": [{ "title", "genres": [], "status", "chars", "updated", "url" }],
  "inbox":    [{ "title", "source", "project", "tags": [], "status", "read", "link", "date", "url" }],
  "books":    [{ "title", "genres": [], "priority", "medium", "status", "bought", "rating", "finished" }],
  "notionLinks": { "タスク管理": "...", "Inbox": "...", "読書リスト": "...", "文章": "...", "運用ルール": "..." }
}
```

対応するNotionデータソース（取得元）:

- タスク管理: `collection://5e3fa72f-c893-46f0-aae0-166b645de7a8`
- Inbox: `collection://1534c6bf-cd2c-4bb2-ad81-7c389c0ab64e`
- 読書リスト: `collection://2bcaf155-5271-81cd-9846-000b3f3e2178`
- 文章: `collection://248af155-5271-8199-a13c-000b67c44fd4`
