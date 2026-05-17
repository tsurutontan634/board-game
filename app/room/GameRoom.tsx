"use client";

import React, { useState } from "react";
import type { UseSocketReturn } from "../hooks/useSocket";
import { Board } from "../components/Board";
import { PhaseIndicator } from "../components/PhaseIndicator";
import { TopicManager } from "../components/TopicManager";
import { WaitingPhase } from "../components/phases/WaitingPhase";
import { HostRankingPhase } from "../components/phases/HostRankingPhase";
import { GuessingPhase } from "../components/phases/GuessingPhase";
import { RevealingPhase } from "../components/phases/RevealingPhase";
import { RoundResultPhase } from "../components/phases/RoundResultPhase";
import { GameEndPhase } from "../components/phases/GameEndPhase";

// useSocket の戻り値をそのまま props で受け取る
type Props = Pick<
  UseSocketReturn,
  | "roomState"
  | "error"
  | "startGame"
  | "submitRanking"
  | "submitGuess"
  | "revealNext"
  | "nextRound"
  | "clearError"
  | "addTopic"
  | "requestTopicsList"
  | "topicsData"
>;

export default function GameRoom({
  roomState,
  error,
  startGame,
  submitRanking,
  submitGuess,
  revealNext,
  nextRound,
  clearError,
  addTopic,
  requestTopicsList,
  topicsData,
}: Props) {
  const [boardOpen, setBoardOpen] = useState(true);
  const [showTopicManager, setShowTopicManager] = useState(false);

  if (!roomState) return null;

  const room = roomState;
  const host = room.players[room.hostIndex];
  const availableGenres = topicsData?.genres ?? [];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xl">🎲</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 font-mono">#{room.roomId}</span>
              <PhaseIndicator
                phase={room.phase}
                round={room.round || undefined}
                maxRounds={room.maxRounds || undefined}
              />
            </div>
            {host && room.phase !== "WAITING" && room.phase !== "GAME_END" && (
              <div className="flex items-center gap-1 mt-0.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: host.color }}
                />
                <span className="text-xs text-gray-500">出題者: {host.name}</span>
              </div>
            )}
          </div>

          {/* お題管理ボタン (WAITING フェーズのみ表示) */}
          {room.phase === "WAITING" && (
            <button
              onClick={() => setShowTopicManager(true)}
              className="text-xs text-amber-600 font-bold bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 hover:bg-amber-100 transition-colors flex-shrink-0"
            >
              📋 お題
            </button>
          )}

          {/* プレイヤー一覧ミニ表示 */}
          <div className="flex -space-x-1">
            {room.players.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="w-7 h-7 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: p.color }}
                title={`${p.name}: ${p.score}点`}
              />
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* エラーバナー */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
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

        {/* 盤面トグル */}
        <div>
          <button
            onClick={() => setBoardOpen((v) => !v)}
            className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-800"
          >
            <span>{boardOpen ? "▾" : "▸"}</span>
            <span>🗺 盤面を{boardOpen ? "隠す" : "表示"}</span>
          </button>
          {boardOpen && (
            <div className="mt-2 bg-white border border-gray-200 rounded-xl p-3">
              <Board players={room.players} />
            </div>
          )}
        </div>

        {/* フェーズ別コンテンツ */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          {room.phase === "WAITING" && (
            <WaitingPhase
              room={room}
              onStart={startGame}
              availableGenres={availableGenres}
            />
          )}
          {room.phase === "HOST_RANKING" && (
            <HostRankingPhase room={room} onSubmitRanking={submitRanking} />
          )}
          {room.phase === "GUESSING" && (
            <GuessingPhase room={room} onSubmitGuess={submitGuess} />
          )}
          {room.phase === "REVEALING" && (
            <RevealingPhase room={room} onRevealNext={revealNext} />
          )}
          {room.phase === "ROUND_RESULT" && (
            <RoundResultPhase room={room} onNextRound={nextRound} />
          )}
          {room.phase === "GAME_END" && (
            <GameEndPhase room={room} />
          )}
        </div>
      </div>

      {/* お題管理モーダル */}
      {showTopicManager && (
        <TopicManager
          topicsData={topicsData}
          onAdd={addTopic}
          onRequestList={requestTopicsList}
          onClose={() => setShowTopicManager(false)}
        />
      )}
    </main>
  );
}
