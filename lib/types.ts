// ============================================================
// ゲームの共通型定義
// ============================================================

/** 選択肢のキー (A〜G の7択) */
export type OptionKey = "A" | "B" | "C" | "D" | "E" | "F" | "G";

/** お題1件 */
export type Topic = {
  id: string;
  question: string;
  options: Record<OptionKey, string>;
};

// ============================================================
// ゲームフェーズ
// ============================================================
export type Phase =
  | "WAITING"       // ロビー待機中
  | "HOST_RANKING"  // 出題者が順位を選択中
  | "GUESSING"      // 他プレイヤーが予想中
  | "REVEALING"     // 予想を1人ずつ公開中
  | "ROUND_RESULT"  // ラウンド結果表示
  | "GAME_END";     // ゲーム終了

// ============================================================
// プレイヤー
// ============================================================
export type Player = {
  id: string;        // socket.id
  name: string;
  color: string;     // 盤面コマの色 (CSSカラー文字列)
  score: number;
  position: number;  // 盤面の位置 (0 = START)
  hostCount: number; // 出題者を担当した回数
};

// ============================================================
// 得点ロール名
// ============================================================
export type ScoreRole =
  | "サンレンタン"
  | "サンレンプク"
  | "ニレンタン"
  | "プクプク"
  | "タン"
  | "なし";

/** 1ラウンドの得点結果 */
export type RoundResult = {
  score: number;
  role: ScoreRole;
};

// ============================================================
// 部屋 (サーバー側メイン状態)
// ============================================================
export type Room = {
  roomId: string;
  players: Player[];
  hostIndex: number;                          // 現在の出題者インデックス
  phase: Phase;
  currentTopic: Topic | null;
  hostRanking: [OptionKey, OptionKey, OptionKey] | null; // 出題者の1〜3位 (非公開)
  guesses: Record<string, [OptionKey, OptionKey, OptionKey]>; // key: playerId
  revealOrder: string[];                      // 予想公開の順番 (socket.id配列)
  revealedCount: number;                      // 何人目まで公開済みか
  round: number;                              // 現在のラウンド番号 (1始まり)
  maxRounds: number;                          // 総ラウンド数 (人数 × n回)
  roundsPerPlayer: number;                    // 1人あたりの出題回数
  usedTopicIds: string[];
  lastResults: Record<string, RoundResult> | null;
};

// ============================================================
// クライアントに送る部屋状態 (hostRanking は権限に応じて制御)
// ============================================================
export type RoomView = Omit<Room, "hostRanking"> & {
  hostRanking: [OptionKey, OptionKey, OptionKey] | null; // 出題者本人のみ受け取る
  myId: string;
};

// ============================================================
// Socket.IO イベント型
// ============================================================

/** クライアント → サーバー */
export interface ClientToServerEvents {
  "room:create": (payload: { name: string; color: string }) => void;
  "room:join": (payload: { roomId: string; name: string; color: string }) => void;
  "game:start": (payload: { roundsPerPlayer: number }) => void;
  "host:submitRanking": (payload: { ranking: [OptionKey, OptionKey, OptionKey] }) => void;
  "player:submitGuess": (payload: { guess: [OptionKey, OptionKey, OptionKey] }) => void;
  "reveal:next": () => void;
  "round:next": () => void;
}

/** サーバー → クライアント */
export interface ServerToClientEvents {
  "room:state": (state: RoomView) => void;
  "room:error": (payload: { message: string }) => void;
}

// ============================================================
// 定数
// ============================================================

/** 盤面のマス数 */
export const BOARD_SIZE = 50;

/** 選択肢キーの配列 */
export const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D", "E", "F", "G"];

/** 利用可能なプレイヤーカラー */
export const PLAYER_COLORS: { name: string; value: string }[] = [
  { name: "レッド",    value: "#EF4444" },
  { name: "ブルー",   value: "#3B82F6" },
  { name: "グリーン", value: "#22C55E" },
  { name: "イエロー", value: "#EAB308" },
  { name: "パープル", value: "#A855F7" },
  { name: "オレンジ", value: "#F97316" },
];

/** スコア役と点数のマスター */
export const SCORE_TABLE: { role: ScoreRole; score: number }[] = [
  { role: "サンレンタン", score: 6 },
  { role: "サンレンプク", score: 4 },
  { role: "ニレンタン",   score: 3 },
  { role: "プクプク",     score: 2 },
  { role: "タン",         score: 1 },
  { role: "なし",         score: 0 },
];

/** 部屋IDの長さ */
export const ROOM_ID_LENGTH = 6;

/** 2〜4人用のデフォルト出題回数 */
export const DEFAULT_ROUNDS_SMALL = 2;

/** 5〜6人用のデフォルト出題回数 */
export const DEFAULT_ROUNDS_LARGE = 1;

/** 最小プレイ人数 */
export const MIN_PLAYERS = 2;

/** 最大プレイ人数 */
export const MAX_PLAYERS = 6;
