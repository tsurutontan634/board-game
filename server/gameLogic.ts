/**
 * ゲームロジック (サーバー側)
 * 部屋の状態管理・Socket.IOイベントハンドラ
 */

import { Server, Socket } from "socket.io";
import { readFileSync } from "fs";
import { join } from "path";
import { calcScore } from "../lib/scoring";
import type {
  Room,
  Player,
  Topic,
  OptionKey,
  Phase,
  RoomView,
  ClientToServerEvents,
  ServerToClientEvents,
} from "../lib/types";
import {
  ROOM_ID_LENGTH,
  MIN_PLAYERS,
  MAX_PLAYERS,
  BOARD_SIZE,
  DEFAULT_ROUNDS_SMALL,
  DEFAULT_ROUNDS_LARGE,
} from "../lib/types";

// ============================================================
// お題データの読み込み & バリデーション
// ============================================================
const TOPICS_PATH = join(process.cwd(), "data", "topics.json");

function loadTopics(): Topic[] {
  const raw = readFileSync(TOPICS_PATH, "utf-8");
  const data = JSON.parse(raw) as unknown[];

  const REQUIRED_KEYS = ["A", "B", "C", "D", "E", "F", "G"] as const;

  return data.map((item, idx) => {
    const t = item as Record<string, unknown>;
    if (typeof t.id !== "string" || typeof t.question !== "string") {
      throw new Error(`topics.json[${idx}]: id と question は文字列必須`);
    }
    const opts = t.options as Record<string, unknown>;
    for (const key of REQUIRED_KEYS) {
      if (typeof opts[key] !== "string") {
        throw new Error(`topics.json[${idx}]: options.${key} が不足`);
      }
    }
    return t as unknown as Topic;
  });
}

const ALL_TOPICS: Topic[] = loadTopics();

// ============================================================
// 部屋管理 (インメモリ)
// ============================================================
const rooms = new Map<string, Room>();

/** ランダムな6桁英数字IDを生成 */
function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/** 重複しない部屋IDを生成 */
function createUniqueRoomId(): string {
  let id: string;
  do {
    id = generateRoomId();
  } while (rooms.has(id));
  return id;
}

/** 使われていないお題をランダムに1件返す */
function pickTopic(usedIds: string[]): Topic | null {
  const available = ALL_TOPICS.filter((t) => !usedIds.includes(t.id));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

/** プレイヤーの現在の出題者インデックスの左隣から始まる公開順を生成 */
function buildRevealOrder(room: Room): string[] {
  const { players, hostIndex } = room;
  const order: string[] = [];
  const n = players.length;
  for (let i = 1; i < n; i++) {
    const idx = (hostIndex + i) % n;
    order.push(players[idx].id);
  }
  return order;
}

// ============================================================
// 部屋状態をクライアントに送信
// ============================================================
function emitRoomState(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  room: Room
): void {
  for (const player of room.players) {
    const isHost = player.id === room.players[room.hostIndex]?.id;
    const view: RoomView = {
      ...room,
      // 出題者本人のみ自分のランキングを見られる。その他は隠す
      hostRanking: isHost ? room.hostRanking : null,
      myId: player.id,
    };
    io.to(player.id).emit("room:state", view);
  }
}

/** ラウンド数を算出 (人数 × 1人当たり回数) */
function calcMaxRounds(playerCount: number, roundsPerPlayer: number): number {
  return playerCount * roundsPerPlayer;
}

/** ゲーム開始時のデフォルト出題回数 */
function defaultRoundsPerPlayer(playerCount: number): number {
  return playerCount <= 4 ? DEFAULT_ROUNDS_SMALL : DEFAULT_ROUNDS_LARGE;
}

// ============================================================
// Socket.IO イベントハンドラ登録
// ============================================================
export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): void {
  io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    // --------------------------------------------------------
    // 部屋の作成
    // --------------------------------------------------------
    socket.on("room:create", ({ name, color }) => {
      const roomId = createUniqueRoomId();

      const player: Player = {
        id: socket.id,
        name: name.trim().slice(0, 20) || "プレイヤー",
        color,
        score: 0,
        position: 0,
        hostCount: 0,
      };

      const room: Room = {
        roomId,
        players: [player],
        hostIndex: 0,
        phase: "WAITING",
        currentTopic: null,
        hostRanking: null,
        guesses: {},
        revealOrder: [],
        revealedCount: 0,
        round: 0,
        maxRounds: 0,
        roundsPerPlayer: 0,
        usedTopicIds: [],
        lastResults: null,
      };

      rooms.set(roomId, room);
      socket.join(roomId);
      emitRoomState(io, room);
    });

    // --------------------------------------------------------
    // 部屋への参加
    // --------------------------------------------------------
    socket.on("room:join", ({ roomId, name, color }) => {
      const room = rooms.get(roomId.toUpperCase());
      if (!room) {
        socket.emit("room:error", { message: `部屋 ${roomId} が見つかりません` });
        return;
      }
      if (room.phase !== "WAITING") {
        socket.emit("room:error", { message: "すでにゲームが始まっています" });
        return;
      }
      if (room.players.length >= MAX_PLAYERS) {
        socket.emit("room:error", { message: `部屋が満員です (最大 ${MAX_PLAYERS} 人)` });
        return;
      }

      // 同じ名前重複チェック
      const trimmedName = name.trim().slice(0, 20) || "プレイヤー";

      const player: Player = {
        id: socket.id,
        name: trimmedName,
        color,
        score: 0,
        position: 0,
        hostCount: 0,
      };

      room.players.push(player);
      socket.join(roomId);
      emitRoomState(io, room);
    });

    // --------------------------------------------------------
    // ゲーム開始
    // --------------------------------------------------------
    socket.on("game:start", ({ roundsPerPlayer }) => {
      const room = findRoomBySocket(socket.id);
      if (!room) return;

      // ホスト(最初のプレイヤー)のみ操作可能
      if (room.players[0].id !== socket.id) {
        socket.emit("room:error", { message: "ゲーム開始はホストのみ操作できます" });
        return;
      }
      if (room.phase !== "WAITING") {
        socket.emit("room:error", { message: "ゲームはすでに開始されています" });
        return;
      }
      if (room.players.length < MIN_PLAYERS) {
        socket.emit("room:error", { message: `最低 ${MIN_PLAYERS} 人必要です` });
        return;
      }

      const rpp = Math.max(1, Math.floor(roundsPerPlayer)) ||
        defaultRoundsPerPlayer(room.players.length);

      room.roundsPerPlayer = rpp;
      room.maxRounds = calcMaxRounds(room.players.length, rpp);
      room.round = 1;
      room.hostIndex = 0;
      room.phase = "HOST_RANKING";

      const topic = pickTopic(room.usedTopicIds);
      if (!topic) {
        socket.emit("room:error", { message: "使えるお題がありません" });
        return;
      }
      room.currentTopic = topic;
      room.usedTopicIds.push(topic.id);
      room.players[room.hostIndex].hostCount++;

      emitRoomState(io, room);
    });

    // --------------------------------------------------------
    // 出題者が順位を確定
    // --------------------------------------------------------
    socket.on("host:submitRanking", ({ ranking }) => {
      const room = findRoomBySocket(socket.id);
      if (!room) return;

      const host = room.players[room.hostIndex];
      if (!host || host.id !== socket.id) {
        socket.emit("room:error", { message: "あなたは現在の出題者ではありません" });
        return;
      }
      if (room.phase !== "HOST_RANKING") {
        socket.emit("room:error", { message: "現在は順位入力フェーズではありません" });
        return;
      }

      // 重複チェック
      if (new Set(ranking).size !== 3) {
        socket.emit("room:error", { message: "1〜3位は異なる選択肢にしてください" });
        return;
      }

      room.hostRanking = ranking;
      room.guesses = {};
      room.phase = "GUESSING";

      emitRoomState(io, room);
    });

    // --------------------------------------------------------
    // 予想提出
    // --------------------------------------------------------
    socket.on("player:submitGuess", ({ guess }) => {
      const room = findRoomBySocket(socket.id);
      if (!room) return;

      if (room.phase !== "GUESSING") {
        socket.emit("room:error", { message: "現在は予想フェーズではありません" });
        return;
      }

      const host = room.players[room.hostIndex];
      if (socket.id === host.id) {
        socket.emit("room:error", { message: "出題者は予想できません" });
        return;
      }

      // 重複チェック
      if (new Set(guess).size !== 3) {
        socket.emit("room:error", { message: "1〜3位は異なる選択肢にしてください" });
        return;
      }

      room.guesses[socket.id] = guess;

      // 全員(出題者以外)が提出したか
      const nonHostPlayers = room.players.filter((p) => p.id !== host.id);
      const allSubmitted = nonHostPlayers.every((p) => room.guesses[p.id]);

      if (allSubmitted) {
        room.phase = "REVEALING";
        room.revealOrder = buildRevealOrder(room);
        room.revealedCount = 0;
      }

      emitRoomState(io, room);
    });

    // --------------------------------------------------------
    // 次の人の予想を公開 (誰でも操作可)
    // --------------------------------------------------------
    socket.on("reveal:next", () => {
      const room = findRoomBySocket(socket.id);
      if (!room) return;

      if (room.phase !== "REVEALING") {
        socket.emit("room:error", { message: "現在は公開フェーズではありません" });
        return;
      }

      if (room.revealedCount < room.revealOrder.length) {
        room.revealedCount++;
      }

      // 全員分公開したら結果フェーズへ
      if (room.revealedCount >= room.revealOrder.length) {
        // 得点計算
        const results: Room["lastResults"] = {};
        if (room.hostRanking) {
          for (const pid of room.revealOrder) {
            const guess = room.guesses[pid];
            if (guess) {
              const r = calcScore(room.hostRanking, guess);
              results[pid] = r;
              const player = room.players.find((p) => p.id === pid);
              if (player) {
                player.score += r.score;
                // 盤面を進める (50マスループ)
                player.position = (player.position + r.score) % BOARD_SIZE;
              }
            }
          }
        }
        room.lastResults = results;
        room.phase = "ROUND_RESULT";
      }

      emitRoomState(io, room);
    });

    // --------------------------------------------------------
    // 次のラウンドへ (誰でも操作可)
    // --------------------------------------------------------
    socket.on("round:next", () => {
      const room = findRoomBySocket(socket.id);
      if (!room) return;

      if (room.phase !== "ROUND_RESULT") {
        socket.emit("room:error", { message: "現在は次ラウンド開始フェーズではありません" });
        return;
      }

      // 全ラウンド終了判定
      if (room.round >= room.maxRounds) {
        room.phase = "GAME_END";
        emitRoomState(io, room);
        return;
      }

      // 次のラウンドへ
      room.round++;
      room.hostIndex = (room.hostIndex + 1) % room.players.length;
      room.phase = "HOST_RANKING";
      room.hostRanking = null;
      room.guesses = {};
      room.revealOrder = [];
      room.revealedCount = 0;
      room.lastResults = null;

      const topic = pickTopic(room.usedTopicIds);
      if (!topic) {
        socket.emit("room:error", { message: "お題が不足しています。ゲームを終了します" });
        room.phase = "GAME_END";
        emitRoomState(io, room);
        return;
      }
      room.currentTopic = topic;
      room.usedTopicIds.push(topic.id);
      room.players[room.hostIndex].hostCount++;

      emitRoomState(io, room);
    });

    // --------------------------------------------------------
    // 切断処理
    // --------------------------------------------------------
    socket.on("disconnect", () => {
      for (const [roomId, room] of rooms.entries()) {
        const idx = room.players.findIndex((p) => p.id === socket.id);
        if (idx === -1) continue;

        room.players.splice(idx, 1);

        // 部屋が空になったら削除
        if (room.players.length === 0) {
          rooms.delete(roomId);
          return;
        }

        // ゲーム中断 (WAITINGならそのまま継続)
        if (room.phase !== "WAITING") {
          room.phase = "GAME_END";
        }

        emitRoomState(io, room);
        return;
      }
    });
  });
}

/** socket.id から部屋を探す */
function findRoomBySocket(socketId: string): Room | null {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.id === socketId)) {
      return room;
    }
  }
  return null;
}
