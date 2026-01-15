'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateObsidianUri, openObsidianUri, downloadAsMarkdown, getDefaultVaultName, processWithKeywordLinks } from '@/lib/obsidian';
import { ObsidianPreviewModal } from './ObsidianPreviewModal';
import type { SummarizeRequest, SummarizeResponse } from '@/types/api';

interface ObsidianSaveButtonProps {
  content: string;
  fileName?: string;
  vaultName?: string;
  disabled?: boolean;
  compact?: boolean;
}

type MessageType = 'success' | 'warning' | 'error' | null;

export const ObsidianSaveButton: React.FC<ObsidianSaveButtonProps> = ({
  content,
  fileName = 'idea',
  vaultName,
  disabled = false,
  compact = false,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: MessageType } | null>(null);

  // プレビューモーダル用の状態
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [processedContent, setProcessedContent] = useState('');
  const [saveType, setSaveType] = useState<'obsidian' | 'download'>('obsidian');
  const [isContentTooLong, setIsContentTooLong] = useState(false);

  // 要約機能用の状態
  const [showSummarizeOption, setShowSummarizeOption] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const vault = vaultName || getDefaultVaultName();

  // URI長チェック: コンテンツが長すぎてObsidianに保存できないか判定
  const checkIfContentNeedsSummarization = (content: string): boolean => {
    const date = new Date().toISOString().split('T')[0];
    const fullFileName = `${fileName}-${date}.md`;
    const testResult = generateObsidianUri(vault, fullFileName, content);
    return testResult.truncated;
  };

  // 要約処理
  const handleSummarize = async () => {
    setIsSummarizing(true);
    setMessage({ text: '会話を要約中...', type: null });
    setShowSummarizeOption(false);

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          maxLength: 1000,
        } satisfies SummarizeRequest),
      });

      if (!response.ok) {
        throw new Error('要約に失敗しました');
      }

      const data: SummarizeResponse = await response.json();

      // 重要: キーワード抽出APIは呼ばない（要約時に既にリンク付き）
      setProcessedContent(data.summary);
      setSaveType('obsidian');
      setIsContentTooLong(false); // 要約されたので長さ問題は解決
      setIsPreviewOpen(true);
      setMessage(null);

    } catch (error) {
      // エラー時のフォールバックオプション表示
      setMessage({
        text: error instanceof Error ? error.message : '要約に失敗しました',
        type: 'error',
      });
      // エラー時は要約なしでダウンロードを提案
      setShowOptions(true);
    } finally {
      setIsSummarizing(false);
    }
  };

  // 共通のコンテンツ準備処理
  const handlePrepareContent = async (type: 'obsidian' | 'download') => {
    if (!content.trim()) {
      setMessage({
        text: type === 'obsidian' ? '保存する内容がありません' : 'ダウンロードする内容がありません',
        type: 'error'
      });
      return;
    }

    if (type === 'obsidian' && !vault) {
      setMessage({ text: 'Vault名が設定されていません', type: 'error' });
      setShowOptions(true);
      return;
    }

    // Obsidian保存の場合、コンテンツ長をチェック
    if (type === 'obsidian') {
      const needsSummarization = checkIfContentNeedsSummarization(content);

      if (needsSummarization) {
        // 要約確認ダイアログを表示
        setShowSummarizeOption(true);
        setMessage({
          text: `コンテンツが長すぎてObsidianに直接保存できません（${content.length}文字）`,
          type: 'warning',
        });
        return;
      }
    }

    setIsSaving(true);
    setSaveType(type);
    setMessage({ text: 'キーワードを抽出中...', type: null });

    try {
      // タイムアウト付きでキーワード処理を試みる
      let processed: string;
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        );
        processed = await Promise.race([
          processWithKeywordLinks(content),
          timeoutPromise
        ]);
      } catch {
        // キーワード処理が失敗またはタイムアウトした場合、元のコンテンツを使用
        console.log('キーワード処理をスキップ、元のコンテンツを使用');
        processed = content;
      }

      setProcessedContent(processed);

      if (type === 'obsidian') {
        // URI長チェック
        const date = new Date().toISOString().split('T')[0];
        const fullFileName = `${fileName}-${date}.md`;
        const result = generateObsidianUri(vault, fullFileName, processed);
        setIsContentTooLong(result.truncated);
      } else {
        setIsContentTooLong(false);
      }

      setIsPreviewOpen(true);
      setMessage(null);
    } catch (err) {
      // それでも失敗した場合、元のコンテンツでモーダルを表示
      console.error('保存準備エラー:', err);
      setProcessedContent(content);
      setIsContentTooLong(false);
      setIsPreviewOpen(true);
      setMessage(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToObsidian = () => {
    console.log('ObsidianSaveButton: handleSaveToObsidian called', {
      isEmpty,
      disabled,
      isSaving,
      contentLength: content.length
    });
    handlePrepareContent('obsidian');
  };

  const handleDownloadMarkdown = () => {
    console.log('ObsidianSaveButton: handleDownloadMarkdown called');
    handlePrepareContent('download');
  };

  // モーダルの保存ボタン押下時の処理
  const handleConfirmSave = () => {
    setIsPreviewOpen(false);

    if (saveType === 'download') {
      // ダウンロード処理
      const date = new Date().toISOString().split('T')[0];
      const fullFileName = `${fileName}-${date}`;
      downloadAsMarkdown(fullFileName, processedContent);
      setMessage({ text: 'ダウンロードしました', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      // Obsidian保存処理
      const date = new Date().toISOString().split('T')[0];
      const fullFileName = `${fileName}-${date}.md`;
      const result = generateObsidianUri(vault, fullFileName, processedContent);

      if (result.truncated) {
        setMessage({
          text: `内容が長すぎます（${result.originalLength}文字）。代わりにMarkdownファイルをダウンロードしてください。`,
          type: 'warning',
        });
        setShowOptions(true);
      } else {
        openObsidianUri(result.uri);
        setMessage({ text: 'Obsidianで開きました', type: 'success' });
        setTimeout(() => setMessage(null), 3000);
      }
    }
  };

  // モーダルのキャンセルボタン押下時の処理
  const handleCancelPreview = () => {
    setIsPreviewOpen(false);
    setProcessedContent('');
  };

  const isEmpty = !content.trim();

  return (
    <>
      {/* コンパクトモード: アイコンのみ表示 */}
      {compact ? (
        <button
          onClick={handleSaveToObsidian}
          disabled={disabled || isEmpty || isSaving}
          className={`
            p-3 rounded-lg transition-colors min-w-[44px] min-h-[44px]
            flex items-center justify-center
            ${isEmpty || disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
            }
          `}
          aria-label="Obsidianに保存"
          title={isEmpty ? '保存する内容がありません' : 'Obsidianに保存'}
          data-compact="true"
        >
          {isSaving ? (
            <motion.div
              className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
            </svg>
          )}
        </button>
      ) : (
        /* 通常モード: フル機能表示 */
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <motion.button
              onClick={handleSaveToObsidian}
              disabled={disabled || isEmpty || isSaving}
              className={`
                flex-1 px-6 py-3 rounded-lg font-medium
                transition-all duration-200 shadow-md
                ${isEmpty || disabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700'
                }
              `}
              whileTap={!(isEmpty || disabled || isSaving) ? { scale: 0.98 } : undefined}
              aria-label="Obsidianに保存"
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  保存中...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
                  </svg>
                  Obsidianに保存
                </span>
              )}
            </motion.button>

            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="その他のオプション"
            >
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
          </div>

          {/* オプションメニュー */}
          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  {/* 新規追加: AI要約ボタン */}
                  <button
                    onClick={handleSummarize}
                    disabled={isEmpty || isSummarizing}
                    className={`
                      w-full px-4 py-2 rounded-md font-medium text-sm
                      transition-colors
                      ${isEmpty || isSummarizing
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                      }
                    `}
                  >
                    {isSummarizing ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.div
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                        要約中...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                        </svg>
                        AIで要約して保存
                      </span>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadMarkdown}
                    disabled={isEmpty}
                    className={`
                      w-full px-4 py-2 rounded-md font-medium text-sm
                      transition-colors
                      ${isEmpty
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }
                    `}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                      </svg>
                      Markdownファイルをダウンロード
                    </span>
                  </button>

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>
                      <strong>Obsidian Advanced URI プラグインが必要です</strong>
                    </p>
                    <a
                      href="https://github.com/Vinzent03/obsidian-advanced-uri"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline"
                    >
                      インストールガイドを見る →
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* フィードバックメッセージ */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium
                  ${message.type === 'success' && 'bg-green-100 text-green-800'}
                  ${message.type === 'warning' && 'bg-yellow-100 text-yellow-800'}
                  ${message.type === 'error' && 'bg-red-100 text-red-800'}
                  ${message.type === null && 'bg-blue-100 text-blue-800'}
                `}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 要約確認ダイアログ */}
          <AnimatePresence>
            {showSummarizeOption && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3"
              >
                <p className="text-sm text-yellow-800 font-medium">
                  コンテンツが長いため、Obsidianに直接保存できません。
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleSummarize}
                    disabled={isSummarizing}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {isSummarizing ? '要約中...' : 'AIで要約して保存'}
                  </button>
                  <button
                    onClick={() => {
                      setShowSummarizeOption(false);
                      handleDownloadMarkdown();
                    }}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm font-medium"
                  >
                    ダウンロード
                  </button>
                  <button
                    onClick={() => {
                      setShowSummarizeOption(false);
                      setMessage(null);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
                  >
                    キャンセル
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* プレビューモーダル - 常にレンダリング（compact/normalモード共通） */}
      <ObsidianPreviewModal
        isOpen={isPreviewOpen}
        content={processedContent}
        onConfirm={handleConfirmSave}
        onCancel={handleCancelPreview}
        isSaving={false}
        isContentTooLong={isContentTooLong}
        saveType={saveType}
      />
    </>
  );
};
