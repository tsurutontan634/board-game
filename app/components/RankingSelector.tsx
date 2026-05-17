"use client";

import React, { useState } from "react";
import type { OptionKey, Topic } from "@/lib/types";
import { OPTION_KEYS } from "@/lib/types";

type Props = {
  topic: Topic;
  onSubmit: (ranking: [OptionKey, OptionKey, OptionKey]) => void;
  label?: string; // 「1位〜3位を選択」 or 「予想」
  submitLabel?: string;
};

const RANK_LABELS = ["🥇 1位", "🥈 2位", "🥉 3位"] as const;

export function RankingSelector({ topic, onSubmit, label, submitLabel }: Props) {
  const [selected, setSelected] = useState<(OptionKey | null)[]>([null, null, null]);

  const handleSelect = (rankIdx: number, key: OptionKey) => {
    setSelected((prev) => {
      const next = [...prev] as (OptionKey | null)[];
      // 既に別の順位で選ばれている場合は外す
      const existingIdx = next.indexOf(key);
      if (existingIdx !== -1 && existingIdx !== rankIdx) {
        next[existingIdx] = null;
      }
      // トグル
      next[rankIdx] = next[rankIdx] === key ? null : key;
      return next;
    });
  };

  const isComplete = selected.every((v) => v !== null);

  const handleSubmit = () => {
    if (!isComplete) return;
    onSubmit(selected as [OptionKey, OptionKey, OptionKey]);
  };

  return (
    <div className="space-y-4">
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}

      {/* 3つの順位セレクター */}
      <div className="space-y-3">
        {RANK_LABELS.map((rankLabel, rankIdx) => (
          <div key={rankIdx}>
            <div className="text-sm font-bold text-gray-800 mb-1">{rankLabel}</div>
            <div className="flex flex-wrap gap-2">
              {OPTION_KEYS.map((key) => {
                const isSelectedHere = selected[rankIdx] === key;
                const isSelectedElsewhere =
                  selected.some((v, i) => v === key && i !== rankIdx);
                return (
                  <button
                    key={key}
                    onClick={() => handleSelect(rankIdx, key)}
                    disabled={isSelectedElsewhere}
                    className={`
                      px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all
                      ${
                        isSelectedHere
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-105"
                          : isSelectedElsewhere
                          ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50"
                      }
                    `}
                  >
                    <span className="font-bold">{key}</span>
                    <span className="ml-1 text-xs">{topic.options[key]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 選択中プレビュー */}
      <div className="flex gap-2 py-2 px-3 bg-gray-50 rounded-lg">
        {selected.map((v, i) => (
          <div key={i} className="flex items-center gap-1 text-sm">
            <span className="text-gray-500">{i + 1}位:</span>
            <span className={v ? "font-bold text-indigo-700" : "text-gray-300"}>
              {v ?? "---"}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isComplete}
        className={`
          w-full py-3 rounded-xl font-bold text-lg transition-all
          ${
            isComplete
              ? "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-lg"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }
        `}
      >
        {submitLabel ?? "確定する"}
      </button>
    </div>
  );
}
