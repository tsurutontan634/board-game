# 🎲 価値観ランキング - オンラインボードゲーム

出題者が7択(A〜G)から自分の価値観で1〜3位を決め、他プレイヤーがその順位を予想して当てるボードゲームです。

## 📋 機能

- **2〜6人** でオンラインプレイ対応
- リアルタイム同期 (Socket.IO)
- 50マスの盤面でコマが進む
- 役ごとの得点表示（サンレンタン〜なし）
- レスポンシブデザイン（PC・スマホ対応）

## 🚀 セットアップ

### 必要環境
- Node.js 18以上
- pnpm

### インストール

```bash
git clone <リポジトリURL>
cd board-game
pnpm install
```

### 開発サーバー起動

```bash
pnpm dev
```

ブラウザで http://localhost:3000 にアクセスします。

### 本番ビルド & 起動

```bash
pnpm build
pnpm start
```

### ポート変更

```bash
PORT=8080 pnpm start
```

## 🎴 お題の追加方法

`/data/topics.json` を編集するだけで新しいお題を追加できます。  
**サーバー再起動が必要です（ホットリロード非対応）。**

### フォーマット

```json
[
  {
    "id": "topic-XXX",          // ユニークなID（重複禁止）
    "question": "質問文",
    "options": {
      "A": "選択肢A",
      "B": "選択肢B",
      "C": "選択肢C",
      "D": "選択肢D",
      "E": "選択肢E",
      "F": "選択肢F",
      "G": "選択肢G"
    }
  }
]
```

**注意:** `A`〜`G` の7つの選択肢がすべて揃っていないとバリデーションエラーになります。

## 🧮 得点計算ルール

| 役 | 点数 | 条件 |
|---|---|---|
| サンレンタン | 6点 | 1〜3位の選択肢と順位が完全一致 |
| サンレンプク | 4点 | 1〜3位の選択肢3つは合っているが順位が違う |
| ニレンタン | 3点 | 1位と2位の選択肢＆順位がぴったり一致 |
| プクプク | 2点 | 1〜3位のうち選択肢が2つだけ一致(順位不問) |
| タン | 1点 | 1位の選択肢と順位だけ一致 |
| なし | 0点 | 上記いずれにも当てはまらない |

※複数条件に当てはまる場合は上位の役のみ採用。

## 🧪 テスト

```bash
pnpm test
```

得点計算ロジックの単体テスト（Vitest）:
- サンレンタン / サンレンプク / ニレンタン / プクプク / タン / なし
- 境界ケース: プクプクとタンが両方当てはまる場合はプクプクが優先

## 🌐 デプロイ概要

### Render / Railway / Fly.io などのPaaS

1. リポジトリをプッシュ
2. ビルドコマンド: `pnpm install && pnpm build`
3. 起動コマンド: `pnpm start`
4. 環境変数: `PORT` (任意。デフォルト 3000)

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

### 注意事項

- Socket.IO は WebSocket を使用するため、**Sticky Session** が必要です（単一インスタンス推奨）
- 状態はインメモリ管理のため、サーバー再起動でゲームデータはリセットされます

## 🛠 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **バックエンド**: Node.js カスタムサーバー + Socket.IO
- **状態管理**: インメモリ Map（永続化なし）
- **テスト**: Vitest
- **パッケージマネージャ**: pnpm

## 📁 ディレクトリ構成

```
board-game/
├── app/                     # Next.js App Router
│   ├── components/          # UIコンポーネント
│   │   ├── phases/          # フェーズ別コンポーネント
│   │   ├── Board.tsx        # 盤面
│   │   ├── RankingSelector.tsx
│   │   ├── ScoreResult.tsx
│   │   └── PhaseIndicator.tsx
│   ├── hooks/
│   │   └── useSocket.ts     # Socket.IO フック
│   ├── room/
│   │   └── GameRoom.tsx     # ゲームメイン画面
│   ├── page.tsx             # ロビー画面
│   └── layout.tsx
├── data/
│   └── topics.json          # お題データ (編集でお題追加)
├── lib/
│   ├── types.ts             # TypeScript型定義・定数
│   └── scoring.ts           # 得点計算ロジック
├── server/
│   └── gameLogic.ts         # Socket.IOイベントハンドラ
├── server.ts                # カスタムサーバーエントリーポイント
├── tests/
│   └── scoring.test.ts      # 得点計算テスト
└── vitest.config.ts
```
