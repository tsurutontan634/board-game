"use client";

import React, { useState, useEffect, useCallback } from "react";
import type {
  AddTopicPayload,
  DeleteTopicPayload,
  AddTopicToPackagePayload,
  CreatePackagePayload,
  DeletePackagePayload,
  OptionKey,
  Package,
  Topic,
} from "@/lib/types";
import { OPTION_KEYS } from "@/lib/types";
import type { PackagesData } from "@/app/hooks/useSocket";

type Props = {
  packagesData: PackagesData | null;
  onRequestList: () => void;
  onCreatePackage: (payload: CreatePackagePayload) => void;
  onDeletePackage: (payload: DeletePackagePayload) => void;
  onAddTopic: (payload: AddTopicPayload) => void;
  onDeleteTopic: (payload: DeleteTopicPayload) => void;
  onAddTopicToPackage: (payload: AddTopicToPackagePayload) => void;
  onClose: () => void;
};

// ============================================================
// サブビュー型
// ============================================================
type View =
  | { type: "packages" }                        // パッケージ一覧
  | { type: "package_detail"; pkgId: string }   // パッケージ内のお題一覧
  | { type: "add_topic"; pkgId: string }         // お題追加フォーム
  | { type: "pick_topic"; pkgId: string }        // 既存お題から選んで追加
  | { type: "new_package" };                     // パッケージ新規作成

// ============================================================
// メインコンポーネント
// ============================================================
export function TopicManager({
  packagesData,
  onRequestList,
  onCreatePackage,
  onDeletePackage,
  onAddTopic,
  onDeleteTopic,
  onAddTopicToPackage,
  onClose,
}: Props) {
  const [view, setView] = useState<View>({ type: "packages" });
  const [flash, setFlash] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const stableRequestList = useCallback(onRequestList, [onRequestList]);

  useEffect(() => {
    stableRequestList();
  }, [stableRequestList]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(t);
  }, [flash]);

  const showOk = (msg: string) => setFlash({ type: "ok", msg });

  const packages = packagesData?.packages ?? [];
  const topics   = packagesData?.topics   ?? [];

  // パッケージIDからパッケージを取得
  const getPkg = (id: string) => packages.find((p) => p.id === id);

  // パッケージ内のお題オブジェクト一覧
  const getTopicsInPkg = (pkg: Package) =>
    pkg.topicIds.map((tid) => topics.find((t) => t.id === tid)).filter(Boolean) as Topic[];

  // ---- タイトルバー ----
  const titleMap: Record<string, string> = {
    packages:        "📦 パッケージ管理",
    package_detail:  `📋 ${view.type === "package_detail" ? (getPkg(view.pkgId)?.name ?? "") : ""}`,
    add_topic:       "➕ お題を追加",
    pick_topic:      "📤 お題を選んで追加",
    new_package:     "📦 新しいパッケージ",
  };
  const title = titleMap[view.type] ?? "お題管理";

  const canGoBack = view.type !== "packages";
  const goBack = () => {
    if (view.type === "package_detail") setView({ type: "packages" });
    else if (view.type === "add_topic" || view.type === "pick_topic")
      setView({ type: "package_detail", pkgId: view.pkgId });
    else setView({ type: "packages" });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* ヘッダー */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
          {canGoBack && (
            <button
              onClick={goBack}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg flex-shrink-0"
            >
              ←
            </button>
          )}
          <h2 className="text-base font-black text-gray-800 flex-1 truncate">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-xl flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* フラッシュメッセージ */}
        {flash && (
          <div className={`mx-4 mt-3 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 flex-shrink-0 ${
            flash.type === "ok"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            {flash.type === "ok" ? "✅" : "⚠️"} {flash.msg}
          </div>
        )}

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto">
          {view.type === "packages" && (
            <PackageListView
              packages={packages}
              topics={topics}
              onSelect={(pkgId) => setView({ type: "package_detail", pkgId })}
              onCreate={() => setView({ type: "new_package" })}
              onDelete={(pkgId) => {
                onDeletePackage({ packageId: pkgId });
                showOk("パッケージを削除しました");
              }}
            />
          )}

          {view.type === "new_package" && (
            <NewPackageView
              onSubmit={(name) => {
                onCreatePackage({ name });
                showOk(`「${name}」を作成しました`);
                setView({ type: "packages" });
              }}
            />
          )}

          {view.type === "package_detail" && (() => {
            const pkg = getPkg(view.pkgId);
            if (!pkg) return <div className="p-8 text-center text-gray-400">パッケージが見つかりません</div>;
            const pkgTopics = getTopicsInPkg(pkg);
            return (
              <PackageDetailView
                pkg={pkg}
                pkgTopics={pkgTopics}
                allTopics={topics}
                onAddNew={() => setView({ type: "add_topic",  pkgId: view.pkgId })}
                onPickExisting={() => setView({ type: "pick_topic", pkgId: view.pkgId })}
                onDelete={(topicId) => {
                  onDeleteTopic({ topicId, packageId: view.pkgId });
                  showOk("お題を削除しました");
                }}
              />
            );
          })()}

          {view.type === "add_topic" && (() => {
            const pkg = getPkg(view.pkgId);
            if (!pkg) return null;
            return (
              <AddTopicView
                pkg={pkg}
                onSubmit={(payload) => {
                  onAddTopic(payload);
                  showOk("お題を追加しました");
                  setView({ type: "package_detail", pkgId: view.pkgId });
                }}
              />
            );
          })()}

          {view.type === "pick_topic" && (() => {
            const pkg = getPkg(view.pkgId);
            if (!pkg) return null;
            const notInPkg = topics.filter((t) => !pkg.topicIds.includes(t.id));
            return (
              <PickTopicView
                pkg={pkg}
                topics={notInPkg}
                onPick={(topicId) => {
                  onAddTopicToPackage({ topicId, packageId: view.pkgId });
                  showOk("お題を追加しました");
                  setView({ type: "package_detail", pkgId: view.pkgId });
                }}
              />
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// パッケージ一覧ビュー
// ============================================================
function PackageListView({
  packages,
  topics,
  onSelect,
  onCreate,
  onDelete,
}: {
  packages: Package[];
  topics: Topic[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="p-4 space-y-3">
      {packages.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">パッケージがありません</p>
        </div>
      ) : (
        packages.map((pkg) => {
          const count = pkg.topicIds.filter((id) => topics.find((t) => t.id === id)).length;
          const isDefault = pkg.id === "pkg-default";
          return (
            <div
              key={pkg.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:border-indigo-300 transition-colors"
            >
              <button
                className="flex-1 flex items-center gap-3 text-left"
                onClick={() => onSelect(pkg.id)}
              >
                <span className="text-2xl">{isDefault ? "📦" : "🗂️"}</span>
                <div>
                  <p className="font-bold text-gray-800">{pkg.name}</p>
                  <p className="text-xs text-gray-400">{count} 件のお題</p>
                </div>
                <span className="ml-auto text-gray-300 text-sm">›</span>
              </button>
              {!isDefault && (
                confirmId === pkg.id ? (
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => { onDelete(pkg.id); setConfirmId(null); }}
                      className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg font-bold"
                    >
                      削除
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg"
                    >
                      戻す
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(pkg.id)}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors text-lg"
                  >
                    🗑
                  </button>
                )
              )}
            </div>
          );
        })
      )}
      <button
        onClick={onCreate}
        className="w-full py-3 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-500 font-bold text-sm hover:bg-indigo-50 transition-colors"
      >
        ＋ 新しいパッケージを作る
      </button>
    </div>
  );
}

// ============================================================
// パッケージ新規作成ビュー
// ============================================================
function NewPackageView({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="text-sm font-bold text-gray-700 block mb-1">
          パッケージ名 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 友達向け、社内イベント用..."
          maxLength={30}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          autoFocus
        />
      </div>
      <button
        onClick={() => name.trim() && onSubmit(name.trim())}
        disabled={!name.trim()}
        className={`w-full py-4 rounded-xl font-black text-lg transition-all ${
          name.trim()
            ? "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-lg"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        📦 作成する
      </button>
    </div>
  );
}

// ============================================================
// パッケージ詳細（お題一覧）ビュー
// ============================================================
function PackageDetailView({
  pkg,
  pkgTopics,
  allTopics,
  onAddNew,
  onPickExisting,
  onDelete,
}: {
  pkg: Package;
  pkgTopics: Topic[];
  allTopics: Topic[];
  onAddNew: () => void;
  onPickExisting: () => void;
  onDelete: (topicId: string) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const outsideCount = allTopics.filter((t) => !pkg.topicIds.includes(t.id)).length;

  return (
    <div className="p-4 space-y-3">
      {/* アクションボタン */}
      <div className="flex gap-2">
        <button
          onClick={onAddNew}
          className="flex-1 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
        >
          ➕ 新しいお題を追加
        </button>
        {outsideCount > 0 && (
          <button
            onClick={onPickExisting}
            className="flex-1 py-2.5 bg-white border-2 border-indigo-300 text-indigo-600 font-bold text-sm rounded-xl hover:bg-indigo-50 active:scale-95 transition-all"
          >
            📤 既存から追加
          </button>
        )}
      </div>

      {/* お題リスト */}
      {pkgTopics.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">まだお題がありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pkgTopics.map((t) => {
            const filled = OPTION_KEYS.filter((k) => t.options[k]?.trim());
            return (
              <div
                key={t.id}
                className="bg-gray-50 rounded-xl p-3 border border-gray-100"
              >
                <div className="flex items-start gap-2">
                  <p className="text-sm font-bold text-gray-800 flex-1">{t.question}</p>
                  {confirmId === t.id ? (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => { onDelete(t.id); setConfirmId(null); }}
                        className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg font-bold"
                      >
                        削除
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg"
                      >
                        戻す
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(t.id)}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      🗑
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {filled.map((k) => (
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
  );
}

// ============================================================
// お題追加フォームビュー
// ============================================================
function AddTopicView({
  pkg,
  onSubmit,
}: {
  pkg: Package;
  onSubmit: (payload: AddTopicPayload) => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<Record<OptionKey, string>>(
    Object.fromEntries(OPTION_KEYS.map((k) => [k, ""])) as Record<OptionKey, string>
  );

  const handleOpt = (k: OptionKey, v: string) =>
    setOptions((prev) => ({ ...prev, [k]: v }));

  const filledCount = OPTION_KEYS.filter((k) => options[k].trim()).length;
  const canSubmit = question.trim() !== "" && filledCount >= 3;

  return (
    <div className="p-4 space-y-4">
      {/* 追加先表示 */}
      <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
        <span className="text-sm text-indigo-500">追加先:</span>
        <span className="text-sm font-bold text-indigo-700">{pkg.name}</span>
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
        <p className="text-xs text-gray-400 mt-0.5 text-right">{question.length}/100</p>
      </div>

      {/* 選択肢 */}
      <div>
        <label className="text-sm font-bold text-gray-700 block mb-1">
          選択肢 <span className="text-gray-400 font-normal">(3つ以上必須)</span>
        </label>
        <div className="space-y-2">
          {OPTION_KEYS.map((k, i) => (
            <div key={k} className="flex items-center gap-2">
              <span className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-black ${
                i < 3 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"
              }`}>
                {k}
              </span>
              <input
                type="text"
                value={options[k]}
                onChange={(e) => handleOpt(k, e.target.value)}
                placeholder={`選択肢 ${k}${i < 3 ? "（必須）" : "（任意）"}`}
                maxLength={40}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">{filledCount} / 7 個入力済み</p>
      </div>

      <button
        onClick={() => canSubmit && onSubmit({ question: question.trim(), options, packageId: pkg.id })}
        disabled={!canSubmit}
        className={`w-full py-4 rounded-xl font-black text-lg transition-all ${
          canSubmit
            ? "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-lg"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        ➕ 追加する
      </button>
    </div>
  );
}

// ============================================================
// 既存お題から選ぶビュー
// ============================================================
function PickTopicView({
  pkg,
  topics,
  onPick,
}: {
  pkg: Package;
  topics: Topic[];
  onPick: (topicId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = topics.filter((t) =>
    t.question.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
        <span className="text-sm text-indigo-500">追加先:</span>
        <span className="text-sm font-bold text-indigo-700">{pkg.name}</span>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="お題を検索..."
        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          {search ? "一致するお題がありません" : "追加できるお題がありません"}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              className="w-full text-left bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-xl p-3 transition-colors"
            >
              <p className="text-sm font-bold text-gray-800">{t.question}</p>
              <p className="text-xs text-gray-400 mt-1">
                {OPTION_KEYS.filter((k) => t.options[k]?.trim()).map((k) => t.options[k]).join(" / ")}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
