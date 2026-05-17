"use client";

import React, { useState, useEffect } from "react";
import type { RoomView, Package } from "@/lib/types";
import {
  MIN_PLAYERS,
  MAX_PLAYERS,
  DEFAULT_ROUNDS_SMALL,
  DEFAULT_ROUNDS_LARGE,
} from "@/lib/types";

type Props = {
  room: RoomView;
  onStart: (roundsPerPlayer: number, selectedPackageIds: string[]) => void;
  availablePackages?: Package[];
};

export function WaitingPhase({ room, onStart, availablePackages = [] }: Props) {
  const isHost = room.players[0]?.id === room.myId;
  const playerCount = room.players.length;
  const defaultRounds = playerCount <= 4 ? DEFAULT_ROUNDS_SMALL : DEFAULT_ROUNDS_LARGE;
  const [roundsPerPlayer, setRoundsPerPlayer] = useState(defaultRounds);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // パッケージが読み込まれたら全選択をデフォルトに
  useEffect(() => {
    if (availablePackages.length > 0 && selectedIds.length === 0) {
      setSelectedIds(availablePackages.map((p) => p.id));
    }
  }, [availablePackages, selectedIds.length]);

  const canStart = playerCount >= MIN_PLAYERS;

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleAll = () =>
    setSelectedIds(
      selectedIds.length === availablePackages.length
        ? []
        : availablePackages.map((p) => p.id)
    );

  // 未選択 = 全パッケージ対象
  const handleStart = () => onStart(roundsPerPlayer, selectedIds);

  // 選択中パッケージの合計お題数（重複除外）は表示用
  const totalLabel =
    selectedIds.length === 0
      ? "全パッケージから出題"
      : `${selectedIds.length} パッケージを選択中`;

  return (
    <div className="space-y-6">
      {/* 部屋ID */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
        <p className="text-sm text-indigo-600 font-medium">部屋ID (友達に教えよう！)</p>
        <p className="text-4xl font-black tracking-widest text-indigo-700 mt-1">
          {room.roomId}
        </p>
        <p className="text-xs text-indigo-400 mt-1">このIDを入力すれば参加できます</p>
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
          {/* 出題回数 */}
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

          {/* パッケージ選択 */}
          {availablePackages.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  使うパッケージ
                </label>
                <button
                  onClick={toggleAll}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {selectedIds.length === availablePackages.length ? "すべて解除" : "すべて選択"}
                </button>
              </div>
              <div className="space-y-2">
                {availablePackages.map((pkg) => {
                  const selected = selectedIds.includes(pkg.id);
                  const isDefault = pkg.id === "pkg-default";
                  return (
                    <button
                      key={pkg.id}
                      onClick={() => toggle(pkg.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        selected
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <span className="text-lg">{isDefault ? "📦" : "🗂️"}</span>
                      <span className={`font-medium text-sm flex-1 ${selected ? "text-indigo-700" : "text-gray-600"}`}>
                        {pkg.name}
                      </span>
                      <span className="text-xs text-gray-400">{pkg.topicIds.length}件</span>
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selected ? "border-indigo-500 bg-indigo-500" : "border-gray-300"
                      }`}>
                        {selected && <span className="text-white text-xs font-black">✓</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">{totalLabel}</p>
            </div>
          )}

          {/* スタートボタン */}
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={`w-full py-4 rounded-xl font-black text-xl transition-all ${
              canStart
                ? "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-lg"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
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
