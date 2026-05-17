"use client";

import React, { useState, useEffect } from "react";
import type { AddTopicPayload, OptionKey, Topic } from "@/lib/types";
import { OPTION_KEYS, GENRE_EMOJI } from "@/lib/types";

type Props = {
  topicsData: { topics: Topic[]; genres: string[] } | null;
  onAdd: (payload: AddTopicPayload) => void;
  onRequestList: () => void;
  onClose: () => void;
};

const KNOWN_GENRES = Object.keys(GENRE_EMOJI);

export function TopicManager({ topicsData, onAdd, onRequestList, onClose }: Props) {
  const [tab, setTab] = useState<"list" | "add">("list");
  const [filterGenre, setFilterGenre] = useState<string>("すべて");
  const [addSuccess, setAddSuccess] = useState(false);

  // フォームの状態
  const [genre, setGenre] = useState(KNOWN_GENRES[0]);
  const [customGenre, setCustomGenre] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<Record<OptionKey, string>>(
    Object.fromEntries(OPTION_KEYS.map((k) => [k, ""])) as Record<OptionKey, string>
  );

  useEffect(() => {
    onRequestList();
  }, [onRequestList]);

  // 追加成功メッセージをリセット
  useEffect(() => {
    if (addSuccess) {
      const t = setTimeout(() => setAddSuccess(false), 3000);
      return () => clearTimeout(t);
    }
  }, [addSuccess]);

  const handleOptionChange = (key: OptionKey, value: string) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const filledOptions = OPTION_KEYS.filter((k) => options[k].trim() !== "");
  const canSubmit =
    question.trim() !== "" && filledOptions.length >= 3;
  const actualGenre = genre === "__custom__" ? customGenre.trim() : genre;

  const handleSubmit = () => {
    if (!canSubmit || !actualGenre) return;

    // 空のオプションを除去してRecord化（空の場合は何かダミーを入れる必要があるため使用オプションのみ送る）
    const filledRecord = Object.fromEntries(
      OPTION_KEYS.map((k) => [k, options[k].trim()])
    ) as Record<OptionKey, string>;

    onAdd({
      genre: actualGenre,
      question: question.trim(),
      options: filledRecord,
    });

    // フォームをリセット
    setQuestion("");
    setOptions(Object.fromEntries(OPTION_KEYS.map((k) => [k, ""])) as Record<OptionKey, string>);
    setAddSuccess(true);
    setTab("list");
  };

  const allGenres = topicsData ? ["すべて", ...topicsData.genres] : ["すべて"];
  const displayedTopics = topicsData
    ? filterGenre === "すべて"
      ? topicsData.topics
      : topicsData.topics.filter((t) => t.genre === filterGenre)
    : [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-800">📋 お題管理</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-xl"
          >
            ×
          </button>
        </div>

        {/* タブ */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab("list")}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              tab === "list"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            📖 一覧 ({topicsData?.topics.length ?? "…"})
          </button>
          <button
            onClick={() => setTab("add")}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              tab === "add"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            ➕ お題を追加
          </button>
        </div>

        {/* 追加成功バナー */}
        {addSuccess && (
          <div className="mx-4 mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm text-green-700 font-medium flex items-center gap-2">
            <span>✅</span> お題を追加しました！
          </div>
        )}

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto">
          {/* 一覧タブ */}
          {tab === "list" && (
            <div className="p-4 space-y-3">
              {/* ジャンルフィルター */}
              <div className="flex gap-2 flex-wrap">
                {allGenres.map((g) => {
                  const emoji = g === "すべて" ? "🗂️" : (GENRE_EMOJI[g] ?? "📌");
                  return (
                    <button
                      key={g}
                      onClick={() => setFilterGenre(g)}
                      className={`
                        flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all border
                        ${
                          filterGenre === g
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                        }
                      `}
                    >
                      {emoji} {g}
                    </button>
                  );
                })}
              </div>

              {/* お題リスト */}
              {displayedTopics.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="text-sm">お題がありません</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedTopics.map((t) => {
                    const emoji = GENRE_EMOJI[t.genre] ?? "📌";
                    return (
                      <div
                        key={t.id}
                        className="bg-gray-50 rounded-xl p-3 border border-gray-100"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                            {emoji} {t.genre}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-800 mb-2">{t.question}</p>
                        <div className="flex flex-wrap gap-1">
                          {OPTION_KEYS.filter((k) => t.options[k]).map((k) => (
                            <span
                              key={k}
                              className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-gray-600"
                            >
                              <span className="font-bold text-gray-400">{k}:</span> {t.options[k]}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 追加タブ */}
          {tab === "add" && (
            <div className="p-4 space-y-4">
              {/* ジャンル選択 */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">
                  ジャンル <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {KNOWN_GENRES.map((g) => {
                    const emoji = GENRE_EMOJI[g] ?? "📌";
                    return (
                      <button
                        key={g}
                        onClick={() => setGenre(g)}
                        className={`
                          flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all text-left
                          ${
                            genre === g
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          }
                        `}
                      >
                        <span>{emoji}</span>
                        <span>{g}</span>
                        {genre === g && <span className="ml-auto text-indigo-400 text-xs">✓</span>}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setGenre("__custom__")}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all
                      ${
                        genre === "__custom__"
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                      }
                    `}
                  >
                    ✏️ 自由入力
                    {genre === "__custom__" && <span className="ml-auto text-indigo-400 text-xs">✓</span>}
                  </button>
                </div>
                {genre === "__custom__" && (
                  <input
                    type="text"
                    value={customGenre}
                    onChange={(e) => setCustomGenre(e.target.value)}
                    placeholder="ジャンル名を入力..."
                    maxLength={20}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                )}
              </div>

              {/* お題文 */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">
                  お題文 <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="例: あなたが大事にしていることを3位まで選んでください"
                  maxLength={100}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{question.length}/100</p>
              </div>

              {/* 選択肢 A〜G */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">
                  選択肢 <span className="text-gray-400 font-normal">(A〜Gのうち3つ以上必須)</span>
                </label>
                <div className="space-y-2">
                  {OPTION_KEYS.map((k, i) => (
                    <div key={k} className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-black ${
                          i < 3 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {k}
                      </span>
                      <input
                        type="text"
                        value={options[k]}
                        onChange={(e) => handleOptionChange(k, e.target.value)}
                        placeholder={`選択肢 ${k}${i < 3 ? " (必須)" : " (任意)"}`}
                        maxLength={30}
                        className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {filledOptions.length} / 7 個入力済み
                </p>
              </div>

              {/* 送信ボタン */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || (genre === "__custom__" && !customGenre.trim())}
                className={`
                  w-full py-4 rounded-xl font-black text-lg transition-all
                  ${
                    canSubmit && (genre !== "__custom__" || customGenre.trim())
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-lg"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }
                `}
              >
                ➕ お題を追加する
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
