"use client";

import React, { useState } from "react";
import { useSocket } from "./hooks/useSocket";
import { PLAYER_COLORS } from "@/lib/types";
import GameRoom from "./room/GameRoom";

type LobbyMode = "home" | "create" | "join";

export default function HomePage() {
  const { roomState, error, connected, createRoom, joinRoom, clearError } =
    useSocket();

  const [mode, setMode] = useState<LobbyMode>("home");
  const [name, setName] = useState("");
  const [color, setColor] = useState(PLAYER_COLORS[0].value);
  const [roomId, setRoomId] = useState("");

  // ゲームに参加済みならゲーム画面へ
  if (roomState) {
    return <GameRoom />;
  }

  const handleCreate = () => {
    if (!name.trim()) return;
    createRoom(name.trim(), color);
  };

  const handleJoin = () => {
    if (!name.trim() || !roomId.trim()) return;
    joinRoom(roomId.trim().toUpperCase(), name.trim(), color);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🎲</div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">
            価値観ランキング
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            出題者の価値観を当てるボードゲーム
          </p>
        </div>

        {/* 接続状態 */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-400" : "bg-gray-300"
            }`}
          />
          <span className="text-xs text-gray-500">
            {connected ? "接続済み" : "接続中..."}
          </span>
        </div>

        {/* エラー */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2">
            <span className="text-red-500">⚠️</span>
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* カード */}
        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          {mode === "home" && (
            <>
              <button
                onClick={() => setMode("create")}
                className="w-full py-4 bg-indigo-600 text-white font-black text-lg rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
              >
                🏠 部屋を作る
              </button>
              <button
                onClick={() => setMode("join")}
                className="w-full py-4 bg-white text-indigo-600 font-black text-lg rounded-xl border-2 border-indigo-300 hover:bg-indigo-50 active:scale-95 transition-all"
              >
                🚪 部屋に参加する
              </button>

              {/* ゲーム説明 */}
              <div className="border-t pt-4">
                <p className="text-xs text-gray-500 font-bold mb-2">🎮 遊び方</p>
                <ul className="text-xs text-gray-400 space-y-1 list-none">
                  <li>① 出題者がお題に対して1〜3位を決める</li>
                  <li>② 他のプレイヤーが出題者の順位を予想</li>
                  <li>③ 予想を1枚ずつ公開して盛り上がろう</li>
                  <li>④ 完全一致で6点！たくさん稼いだ人が勝利</li>
                </ul>
              </div>
            </>
          )}

          {(mode === "create" || mode === "join") && (
            <>
              {/* 戻るボタン */}
              <button
                onClick={() => setMode("home")}
                className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                ← 戻る
              </button>

              {/* 名前入力 */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">
                  あなたの名前
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="名前を入力..."
                  maxLength={20}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* コマ色選択 */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">
                  コマの色
                </label>
                <div className="flex gap-2 flex-wrap">
                  {PLAYER_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      className={`
                        w-9 h-9 rounded-full border-4 transition-all
                        ${color === c.value
                          ? "border-gray-800 scale-110 shadow-lg"
                          : "border-transparent hover:border-gray-300"
                        }
                      `}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* 参加の場合: 部屋ID入力 */}
              {mode === "join" && (
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">
                    部屋ID (6桁)
                  </label>
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) =>
                      setRoomId(e.target.value.toUpperCase().slice(0, 6))
                    }
                    placeholder="例: AB3C7E"
                    maxLength={6}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              )}

              {/* 決定ボタン */}
              <button
                onClick={mode === "create" ? handleCreate : handleJoin}
                disabled={
                  !name.trim() ||
                  (mode === "join" && roomId.length < 6)
                }
                className={`
                  w-full py-4 rounded-xl font-black text-lg transition-all
                  ${
                    name.trim() && (mode === "create" || roomId.length >= 6)
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-lg"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }
                `}
              >
                {mode === "create" ? "🏠 部屋を作成する" : "🚪 参加する"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
