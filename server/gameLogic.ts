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
  Package,
  OptionKey,
  RoomView,
  ClientToServerEvents,
  ServerToClientEvents,
  AddTopicPayload,
  CreatePackagePayload,
  DeletePackagePayload,
  DeleteTopicPayload,
  AddTopicToPackagePayload,
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
// データファイルパス
// ============================================================
const TOPICS_PATH   = join(process.cwd(), "data", "topics.json");
const PACKAGES_PATH = join(process.cwd(), "data", "packages.json");

// ============================================================
// お題データの読み込み & 保存
// ============================================================
function loadTopics(): Topic[] {
  const raw = readFileSync(TOPICS_PATH, "utf-8");
  const data = JSON.parse(raw) as unknown[];
  return data.map((item, idx) => {
    const t = item as Record<string, unknown>;
    if (typeof t.id !== "string" || typeof t.question !== "string") {
      throw new Error(`topics.json[${idx}]: id と question は文字列必須`);
    }
    const opts = t.options as Record<string, unknown>;
    // 空文字は許容（選択肢が少ないお題もOK）
    const filledCount = OPTION_KEYS.filter((k) => typeof opts[k] === "string" && (opts[k] as string).trim() !== "").length;
    if (filledCount < 3) {
      throw new Error(`topics.json[${idx}]: options は3つ以上必要`);
    }
    return t as unknown as Topic;
  });
}

function saveTopics(): void {
  try {
    writeFileSync(TOPICS_PATH, JSON.stringify(allTopics, null, 2), "utf-8");
  } catch (e) {
    console.error("[topics] ファイル保存失敗:", e);
  }
}

// ============================================================
// パッケージデータの読み込み & 保存
// ============================================================
function loadPackages(): Package[] {
  try {
    const raw = readFileSync(PACKAGES_PATH, "utf-8");
    return JSON.parse(raw) as Package[];
  } catch {
    // ファイルがなければ空配列
    return [];
  }
}

function savePackages(): void {
  try {
    writeFileSync(PACKAGES_PATH, JSON.stringify(allPackages, null, 2), "utf-8");
  } catch (e) {
    console.error("[packages] ファイル保存失敗:", e);
  }
}

// インメモリ状態
let allTopics: Topic[]     = loadTopics();
let allPackages: Package[] = loadPackages();

// ============================================================
// パッケージからお題プールを作る
// ============================================================
/** 選択パッケージIDのお題をマージして重複排除したプールを返す (空=全件) */
function getTopicsByPackages(selectedPackageIds: string[]): Topic[] {
  if (selectedPackageIds.length === 0) return allTopics;

  const idSet = new Set<string>();
  for (const pkgId of selectedPackageIds) {
    const pkg = allPackages.find((p) => p.id === pkgId);
    if (pkg) {
      for (const tid of pkg.topicIds) idSet.add(tid);
    }
  }
  return allTopics.filter((t) => idSet.has(t.id));
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

/** 使われていないお題をパッケージフィルタ込みでランダムに1件返す */
function pickTopic(usedIds: string[], selectedPackageIds: string[]): Topic | null {
  const pool = getTopicsByPackages(selectedPackageIds).filter(
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
  // REVEALING フェーズで正解めくり済み（revealedCount > revealOrder.length）、
  // または ROUND_RESULT フェーズでは全プレイヤーに hostRanking を公開する
  const shouldRevealToAll =
    (room.phase === "REVEALING" &&
      room.revealedCount > room.revealOrder.length) ||
    room.phase === "ROUND_RESULT";

  for (const player of room.players) {
    const isHost = player.id === room.players[room.hostIndex]?.id;
    const view: RoomView = {
      ...room,
      hostRanking: isHost || shouldRevealToAll ? room.hostRanking : null,
      myId: player.id,
    };
    io.to(player.id).emit("room:state", view);
  }
}

function defaultRoundsPerPlayer(playerCount: number): number {
  return playerCount <= 4 ? DEFAULT_ROUNDS_SMALL : DEFAULT_ROUNDS_LARGE;
}

/** packages:data を送信するヘルパー */
function emitPackagesData(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
): void {
  socket.emit("packages:data", { packages: allPackages, topics: allTopics });
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
        selectedPackageIds: [],
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
    // ゲーム開始 (パッケージ選択込み)
    // --------------------------------------------------------
    socket.on("game:start", ({ roundsPerPlayer, selectedPackageIds }) => {
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

      const pool = getTopicsByPackages(selectedPackageIds);
      if (pool.length === 0) {
        socket.emit("room:error", { message: "選択したパッケージにお題がありません" });
        return;
      }

      const rpp = Math.max(1, Math.floor(roundsPerPlayer)) ||
        defaultRoundsPerPlayer(room.players.length);

      room.selectedPackageIds = selectedPackageIds;
      room.roundsPerPlayer = rpp;
      room.maxRounds = room.players.length * rpp;
      room.round = 1;
      room.hostIndex = 0;
      room.phase = "HOST_RANKING";

      const topic = pickTopic(room.usedTopicIds, room.selectedPackageIds);
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

      // revealedCount をインクリメント
      // 0〜length-1 : 回答者を1人ずつ公開
      // length      : 出題者の正解を公開 (クライアントに hostRanking が見える状態)
      // length+1以上: ここには来ない (遷移済み)
      room.revealedCount++;

      if (room.revealedCount > room.revealOrder.length) {
        // 出題者正解めくり後 → 採点して ROUND_RESULT へ
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
      // revealedCount === revealOrder.length のとき:
      // 全回答者公開済み・正解めくり待ち → そのまま emit して UI に反映
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

      const topic = pickTopic(room.usedTopicIds, room.selectedPackageIds);
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
    // パッケージ一覧を返す
    // --------------------------------------------------------
    socket.on("packages:list", () => {
      emitPackagesData(socket);
    });

    // --------------------------------------------------------
    // パッケージ作成
    // --------------------------------------------------------
    socket.on("package:create", (payload: CreatePackagePayload) => {
      const name = payload.name?.trim();
      if (!name) {
        socket.emit("room:error", { message: "パッケージ名は必須です" });
        return;
      }
      if (allPackages.some((p) => p.name === name)) {
        socket.emit("room:error", { message: `「${name}」は既に存在します` });
        return;
      }
      const newPkg: Package = {
        id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        topicIds: [],
      };
      allPackages.push(newPkg);
      savePackages();
      emitPackagesData(socket);
    });

    // --------------------------------------------------------
    // パッケージ削除 (デフォルトは削除不可)
    // --------------------------------------------------------
    socket.on("package:delete", (payload: DeletePackagePayload) => {
      const { packageId } = payload;
      if (packageId === "pkg-default") {
        socket.emit("room:error", { message: "デフォルトパッケージは削除できません" });
        return;
      }
      const idx = allPackages.findIndex((p) => p.id === packageId);
      if (idx === -1) {
        socket.emit("room:error", { message: "パッケージが見つかりません" });
        return;
      }
      allPackages.splice(idx, 1);
      savePackages();
      emitPackagesData(socket);
    });

    // --------------------------------------------------------
    // お題を新規追加して指定パッケージに入れる
    // --------------------------------------------------------
    socket.on("topic:add", (payload: AddTopicPayload) => {
      const { question, options, packageId } = payload;

      if (!question?.trim()) {
        socket.emit("room:error", { message: "質問文は必須です" });
        return;
      }
      const filledCount = OPTION_KEYS.filter(
        (k) => options[k]?.trim()
      ).length;
      if (filledCount < 3) {
        socket.emit("room:error", { message: "選択肢を3つ以上入力してください" });
        return;
      }

      const pkg = allPackages.find((p) => p.id === packageId);
      if (!pkg) {
        socket.emit("room:error", { message: "指定されたパッケージが見つかりません" });
        return;
      }

      const newTopic: Topic = {
        id: `topic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        question: question.trim(),
        options: Object.fromEntries(
          OPTION_KEYS.map((k) => [k, (options[k] ?? "").trim()])
        ) as Record<OptionKey, string>,
      };

      allTopics.push(newTopic);
      saveTopics();

      pkg.topicIds.push(newTopic.id);
      savePackages();

      emitPackagesData(socket);
    });

    // --------------------------------------------------------
    // お題削除 (指定パッケージから外す or 完全削除)
    // --------------------------------------------------------
    socket.on("topic:delete", (payload: DeleteTopicPayload) => {
      const { topicId, packageId } = payload;

      const pkg = allPackages.find((p) => p.id === packageId);
      if (!pkg) {
        socket.emit("room:error", { message: "パッケージが見つかりません" });
        return;
      }

      // パッケージからIDを外す
      pkg.topicIds = pkg.topicIds.filter((id) => id !== topicId);
      savePackages();

      // どのパッケージにも含まれていなければお題自体も削除
      const usedInAny = allPackages.some((p) => p.topicIds.includes(topicId));
      if (!usedInAny) {
        allTopics = allTopics.filter((t) => t.id !== topicId);
        saveTopics();
      }

      emitPackagesData(socket);
    });

    // --------------------------------------------------------
    // 既存お題を別パッケージに追加
    // --------------------------------------------------------
    socket.on("topic:addToPackage", (payload: AddTopicToPackagePayload) => {
      const { topicId, packageId } = payload;

      const pkg = allPackages.find((p) => p.id === packageId);
      if (!pkg) {
        socket.emit("room:error", { message: "パッケージが見つかりません" });
        return;
      }
      if (pkg.topicIds.includes(topicId)) {
        socket.emit("room:error", { message: "既にそのパッケージに含まれています" });
        return;
      }
      if (!allTopics.find((t) => t.id === topicId)) {
        socket.emit("room:error", { message: "お題が見つかりません" });
        return;
      }

      pkg.topicIds.push(topicId);
      savePackages();
      emitPackagesData(socket);
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
