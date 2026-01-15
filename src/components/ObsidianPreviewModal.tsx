'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo } from 'react';

interface ObsidianPreviewModalProps {
  isOpen: boolean;
  content: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  isContentTooLong?: boolean;
  saveType?: 'obsidian' | 'download';
}

export function ObsidianPreviewModal({
  isOpen,
  content,
  onConfirm,
  onCancel,
  isSaving = false,
  isContentTooLong = false,
  saveType = 'obsidian',
}: ObsidianPreviewModalProps) {
  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSaving, onCancel]);

  // モーダルが開いている時は背景のスクロールを防ぐ
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // [[キーワード]]をハイライト表示する関数
  const renderContentWithHighlights = useMemo(() => {
    const parts: React.ReactNode[] = [];
    const regex = /(\[\[([^\]]+)\]\])/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(content)) !== null) {
      // マッチ前のテキスト
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${key++}`}>{content.slice(lastIndex, match.index)}</span>
        );
      }
      // ハイライト部分
      parts.push(
        <span
          key={`highlight-${key++}`}
          className="text-blue-600 font-semibold bg-blue-50 px-1 rounded"
        >
          {match[0]}
        </span>
      );
      lastIndex = regex.lastIndex;
    }

    // 残りのテキスト
    if (lastIndex < content.length) {
      parts.push(<span key={`text-${key++}`}>{content.slice(lastIndex)}</span>);
    }

    return parts;
  }, [content]);

  // 背景クリックでモーダルを閉じる
  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSaving) {
      onCancel();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={handleBackgroundClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 id="modal-title" className="text-xl font-semibold text-gray-800">
                {saveType === 'obsidian' ? 'Obsidianに保存' : 'Markdownダウンロード'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                保存する前に内容を確認してください
              </p>
            </div>

            {/* プレビュー領域 */}
            <div className="flex-1 overflow-y-auto p-6">
              {isContentTooLong && saveType === 'obsidian' && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800 font-medium">
                    このコンテンツは長すぎるため、Obsidian URIでの保存ができません。
                    代わりにMarkdownファイルをダウンロードしてください。
                  </p>
                </div>
              )}

              <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 rounded whitespace-pre-wrap font-mono text-sm border border-gray-200">
                {renderContentWithHighlights}
              </div>

              <div className="mt-3 text-xs text-gray-500">
                <p>
                  <span className="text-blue-600 font-semibold bg-blue-50 px-1 rounded">
                    [[キーワード]]
                  </span>{' '}
                  形式でリンクが付与されています
                </p>
              </div>
            </div>

            {/* ボタンエリア */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                disabled={isSaving}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-colors
                  ${
                    isSaving
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }
                `}
              >
                キャンセル
              </button>

              <button
                onClick={onConfirm}
                disabled={isSaving || (isContentTooLong && saveType === 'obsidian')}
                className={`
                  px-6 py-2 rounded-lg font-medium transition-colors
                  flex items-center gap-2
                  ${
                    isSaving || (isContentTooLong && saveType === 'obsidian')
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }
                `}
              >
                {isSaving ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    保存中...
                  </>
                ) : (
                  <>
                    {saveType === 'obsidian' ? (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
                        </svg>
                        保存
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                        </svg>
                        ダウンロード
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
