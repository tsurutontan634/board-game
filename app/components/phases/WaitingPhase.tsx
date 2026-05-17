"use client";

import React, { useState, useEffect } from "react";
import type { RoomView } from "@/lib/types";
import {
  MIN_PLAYERS,
  MAX_PLAYERS,
  DEFAULT_ROUNDS_SMALL,
  DEFAULT_ROUNDS_LARGE,
  GENRE_EMOJI,
} from "@/lib/types";

type Props = {
  room: RoomView;
  onStart: (roundsPerPlayer: number, selectedGenres: string[]) => void;
  availableGenres?: string[];
};

export function WaitingPhase({ room, onStart, availableGenres = [] }: Props) {
  const isHost = room.players[0]?.id === room.myId;
  const playerCount = room.players.length;
  const defaultRounds = playerCount <= 4 ? DEFAULT_ROUNDS_SMALL : DEFAULT_ROUNDS_LARGE;
  const [roundsPerPlayer, setRoundsPerPlayer] = useState(defaultRounds);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // 利用可能ジャンルが読み込まれたら全選択をデフォルトに
  useEffect(() => {
    if (availableGenres.length > 0 && selectedGenres.length === 0) {
      setSelectedGenres([...availableGenres]);
    }
  }, [availableGenres, selectedGenres.length]);

  const canStart = playerCount >= MIN_PLAYERS;

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const toggleAll = () => {
    if (selectedGenres.length === availableGenres.length) {
      setSelectedGenres([]);
    } else {
      setSelectedGenres([...availableGenres]);
    }
  };

  const handleStart = () => {
    // 未選択の場合は全ジャンルを対象にする
    const genres = selectedGenres.length > 0 ? selectedGenres : [];
    onStart(roundsPerPlayer, genres);
  };

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
          {room.players.map((p, idx) => (
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
          ))}
        </div>
      </div>

      {/* ホストの開始設定 */}
      {isHost && (
        <div className="space-y-4">
          {/* 出題回数スライダー */}
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

          {/* ジャンル選択 */}
          {availableGenres.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  ジャンルを選択
                </label>
                <button
                  onClick={toggleAll}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {selectedGenres.length === availableGenres.length
                    ? "すべて解除"
                    : "すべて選択"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {availableGenres.map((genre) => {
                  const emoji = GENRE_EMOJI[genre] ?? "📌";
                  const selected = selectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all
                        ${
                          selected
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                        }
                      `}
                    >
                      <span className="text-base">{emoji}</span>
                      <span className="leading-tight text-left">{genre}</span>
                      {selected && (
                        <span className="ml-auto text-indigo-400 text-xs">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {selectedGenres.length === 0
                  ? "⚠️ 未選択時はすべてのジャンルから出題"
                  : `${selectedGenres.length} ジャンルを選択中`}
              </p>
            </div>
          )}

          {/* スタートボタン */}
          <button
            onClick={handleStart}
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
