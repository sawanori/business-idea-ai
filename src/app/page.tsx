'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Home() {
  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      title: '音声で自由に話せる',
      description: 'マイクボタンを押して話すだけ。キーボード入力不要で、歩きながらでもアイデアを整理できます。',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: 'AIが思考を整理',
      description: '壁打ち相手として質問を投げかけ、アイデアの強み・弱みを一緒に分析します。',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
      ),
      title: 'Obsidianに自動保存',
      description: '対話の記録をワンタップでObsidianに保存。あなたのナレッジベースにシームレスに統合。',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* ヒーローセクション */}
      <section className="relative overflow-hidden px-4 pt-16 pb-12 sm:pt-20 sm:pb-16 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-6"
          >
            アイデアを
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
              声
            </span>
            で深掘り
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl mx-auto"
          >
            ビジネスアイデアの壁打ち相手として、AIが質問を投げかけ、
            あなたの思考を整理します。
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-full shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all duration-300"
            >
              <span>対話を始める</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section className="px-4 py-12 sm:py-16 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 hover:border-orange-500/50 transition-colors"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="px-4 py-8 border-t border-slate-800">
        <div className="max-w-6xl mx-auto text-center text-slate-500 text-sm">
          <p>© 2026 ビジネスアイデア壁打ちAI</p>
        </div>
      </footer>
    </div>
  );
}
