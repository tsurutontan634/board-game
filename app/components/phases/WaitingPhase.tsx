"use client";

import React, { useState } from "react";
import type { RoomView } from "@/lib/types";
import {
  MIN_PLAYERS,
  MAX_PLAYERS,
  DEFAULT_ROUNDS_SMALL,
  DEFAULT_ROUNDS_LARGE,
} from "@/lib/types";

type Props = {
  room: RoomView;
  onStart: (roundsPerPlayer: number) => void;
};

export function WaitingPhase({ room, onStart }: Props) {
  const isHost = room.players[0]?.id === room.myId;
  const playerCount = room.players.length;
  const defaultRounds = playerCount <= 4 ? DEFAULT_ROUNDS_SMALL : DEFAULT_ROUNDS_LARGE;
  const [roundsPerPlayer, setRoundsPerPlayer] = useState(defaultRounds);

  const canStart = playerCount >= MIN_PLAYERS;

  return (
    <div className="space-y-6">
      {/* 部屋ID */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
        <p className="text-sm text-indigo-600 font-medium">部屋ID (友達に教えよう！)</p>
        <p className="text-4xl font-black tracking-widest text-indigo-700 mt-1">
          {room.roomId}
        </p>
        <p className="text-xs text-indigo-400 mt-1">
          このIDを入力すれば参加できます
        </p>
      </div>

      {/* 参加者一覧 */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">
          参加者 ({playerCount}/{MAX_PLAYERS}人)
        </h3>
        <div className="space-y-2">
          {room.players.map((p, idx) => {
            // const colorName = PLAYER_COLORS.find((c) => c.value === p.color)?.name ?? p.color;
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2"
              >
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0 border-2 border-white shadow"
                  style={{ backgroundColor: p.color }}
                />
                <span className="font-medium text-gray-800 flex-1">{p.name}</span>
                {idx === 0 && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">
                    ホスト
                  </span>
                )}
                {p.id === room.myId && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    あなた
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ホストの開始設定 */}
      {isHost && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              1人あたりの出題回数
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={5}
                value={roundsPerPlayer}
                onChange={(e) => setRoundsPerPlayer(Number(e.target.value))}
                className="flex-1 accent-indigo-600"
              />
              <span className="w-8 text-center font-bold text-indigo-700 text-lg">
                {roundsPerPlayer}
              </span>
              <span className="text-sm text-gray-500">回</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              合計 {playerCount * roundsPerPlayer} ラウンド
            </p>
          </div>

          <button
            onClick={() => onStart(roundsPerPlayer)}
            disabled={!canStart}
            className={`
              w-full py-4 rounded-xl font-black text-xl transition-all
              ${
                canStart
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-lg"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }
            `}
          >
            🎮 ゲームスタート！
          </button>
          {!canStart && (
            <p className="text-center text-sm text-red-400">
              最低 {MIN_PLAYERS} 人必要です
            </p>
          )}
        </div>
      )}

      {!isHost && (
        <div className="text-center py-6 text-gray-500 animate-pulse">
          <p className="text-2xl mb-2">⏳</p>
          <p className="font-medium">ホストがゲームを開始するのを待っています...</p>
        </div>
      )}
    </div>
  );
}
