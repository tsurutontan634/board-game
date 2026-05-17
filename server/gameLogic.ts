/**
 * ゲームロジック (サーバー側)
 * 部屋の状態管理・Socket.IOイベントハンドラ
 */

import { Server, Socket } from "socket.io";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { calcScore } from "../lib/scoring";
import type {
  Room,
  Player,
  Topic,
  OptionKey,
  RoomView,
  ClientToServerEvents,
  ServerToClientEvents,
  AddTopicPayload,
} from "../lib/types";
import {
  ROOM_ID_LENGTH,
  MIN_PLAYERS,
  MAX_PLAYERS,
  BOARD_SIZE,
  DEFAULT_ROUNDS_SMALL,
  DEFAULT_ROUNDS_LARGE,
  OPTION_KEYS,
} from "../lib/types";

// ============================================================
// お題データの読み込み & バリデーション
// ============================================================
const TOPICS_PATH = join(process.cwd(), "data", "topics.json");

function loadTopics(): Topic[] {
  const raw = readFileSync(TOPICS_PATH, "utf-8");
  const data = JSON.parse(raw) as unknown[];

  return data.map((item, idx) => {
    const t = item as Record<string, unknown>;
    if (typeof t.id !== "string" || typeof t.question !== "string") {
      throw new Error(`topics.json[${idx}]: id と question は文字列必須`);
    }
    if (typeof t.genre !== "string") {
      throw new Error(`topics.json[${idx}]: genre は文字列必須`);
    }
    const opts = t.options as Record<string, unknown>;
    for (const key of OPTION_KEYS) {
      if (typeof opts[key] !== "string") {
        throw new Error(`topics.json[${idx}]: options.${key} が不足`);
      }
    }
    return t as unknown as Topic;
  });
}

// 起動時に読み込み。インメモリで追加されたお題も含める
let allTopics: Topic[] = loadTopics();

/** 全ジャンル一覧を返す (重複排除・ソート済み) */
function getAllGenres(): string[] {
  return [...new Set(allTopics.map((t) => t.genre))].sort();
}

/** ジャンルでフィルタしたお題を返す (空配列=全部) */
function getTopicsByGenres(genres: string[]): Topic[] {
  if (genres.length === 0) return allTopics;
  return allTopics.filter((t) => genres.includes(t.genre));
}

/** お題をファイルに永続化する */
function saveTopics(): void {
  try {
    writeFileSync(TOPICS_PATH, JSON.stringify(allTopics, null, 2), "utf-8");
  } catch (e) {
    console.error("[topics] ファイル保存失敗:", e);
  }
}

// ============================================================
// 部屋管理 (インメモリ)
// ============================================================
const rooms = new Map<string, Room>();

function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function createUniqueRoomId(): string {
  let id: string;
  do { id = generateRoomId(); } while (rooms.has(id));
  return id;
}

/** 使われていないお題をジャンルフィルタ込みでランダムに1件返す */
function pickTopic(usedIds: string[], selectedGenres: string[]): Topic | null {
  const pool = getTopicsByGenres(selectedGenres).filter(
    (t) => !usedIds.includes(t.id)
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildRevealOrder(room: Room): string[] {
  const { players, hostIndex } = room;
  const order: string[] = [];
  const n = players.length;
  for (let i = 1; i < n; i++) {
    order.push(players[(hostIndex + i) % n].id);
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
      hostRanking: isHost ? room.hostRanking : null,
      myId: player.id,
    };
    io.to(player.id).emit("room:state", view);
  }
}

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
        selectedGenres: [],
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
      const player: Player = {
        id: socket.id,
        name: name.trim().slice(0, 20) || "プレイヤー",
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
    // ゲーム開始 (ジャンル選択込み)
    // --------------------------------------------------------
    socket.on("game:start", ({ roundsPerPlayer, selectedGenres }) => {
      const room = findRoomBySocket(socket.id);
      if (!room) return;

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

      // 選択ジャンルが1つも対象お題を持たないケースを検出
      const pool = getTopicsByGenres(selectedGenres);
      if (pool.length === 0) {
        socket.emit("room:error", { message: "選択したジャンルにお題がありません" });
        return;
      }

      const rpp = Math.max(1, Math.floor(roundsPerPlayer)) ||
        defaultRoundsPerPlayer(room.players.length);

      room.selectedGenres = selectedGenres;
      room.roundsPerPlayer = rpp;
      room.maxRounds = room.players.length * rpp;
      room.round = 1;
      room.hostIndex = 0;
      room.phase = "HOST_RANKING";

      const topic = pickTopic(room.usedTopicIds, room.selectedGenres);
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
      if (new Set(guess).size !== 3) {
        socket.emit("room:error", { message: "1〜3位は異なる選択肢にしてください" });
        return;
      }

      room.guesses[socket.id] = guess;

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
    // 予想を1人ずつ公開
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

      if (room.revealedCount >= room.revealOrder.length) {
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
    // 次のラウンドへ
    // --------------------------------------------------------
    socket.on("round:next", () => {
      const room = findRoomBySocket(socket.id);
      if (!room) return;

      if (room.phase !== "ROUND_RESULT") {
        socket.emit("room:error", { message: "現在は次ラウンド開始フェーズではありません" });
        return;
      }

      if (room.round >= room.maxRounds) {
        room.phase = "GAME_END";
        emitRoomState(io, room);
        return;
      }

      room.round++;
      room.hostIndex = (room.hostIndex + 1) % room.players.length;
      room.phase = "HOST_RANKING";
      room.hostRanking = null;
      room.guesses = {};
      room.revealOrder = [];
      room.revealedCount = 0;
      room.lastResults = null;

      const topic = pickTopic(room.usedTopicIds, room.selectedGenres);
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
    // お題を追加 (誰でも追加可)
    // --------------------------------------------------------
    socket.on("topic:add", (payload: AddTopicPayload) => {
      const { genre, question, options } = payload;

      // バリデーション
      if (!genre.trim() || !question.trim()) {
        socket.emit("room:error", { message: "ジャンルと質問文は必須です" });
        return;
      }
      for (const key of OPTION_KEYS) {
        if (!options[key]?.trim()) {
          socket.emit("room:error", { message: `選択肢 ${key} が空です` });
          return;
        }
      }

      const newTopic: Topic = {
        id: `topic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        genre: genre.trim(),
        question: question.trim(),
        options: Object.fromEntries(
          OPTION_KEYS.map((k) => [k, options[k].trim()])
        ) as Record<OptionKey, string>,
      };

      allTopics.push(newTopic);
      saveTopics();  // ファイルに永続化

      socket.emit("topic:added", { topic: newTopic });
      // 追加後にお題リストも更新配信
      socket.emit("topics:data", { topics: allTopics, genres: getAllGenres() });
    });

    // --------------------------------------------------------
    // お題一覧を返す
    // --------------------------------------------------------
    socket.on("topics:list", () => {
      socket.emit("topics:data", { topics: allTopics, genres: getAllGenres() });
    });

    // --------------------------------------------------------
    // 切断処理
    // --------------------------------------------------------
    socket.on("disconnect", () => {
      for (const [roomId, room] of rooms.entries()) {
        const idx = room.players.findIndex((p) => p.id === socket.id);
        if (idx === -1) continue;

        room.players.splice(idx, 1);

        if (room.players.length === 0) {
          rooms.delete(roomId);
          return;
        }
        if (room.phase !== "WAITING") {
          room.phase = "GAME_END";
        }
        emitRoomState(io, room);
        return;
      }
    });
  });
}

function findRoomBySocket(socketId: string): Room | null {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.id === socketId)) return room;
  }
  return null;
}
