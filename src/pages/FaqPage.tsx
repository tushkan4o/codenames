import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/layout/NavBar';

interface FaqItem {
  question: string;
  answer: string;
  image?: string; // path relative to public/, e.g. '/faq/example.png'
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Что такое рейтинговый режим?',
    answer: 'В рейтинговом режиме используются стандартные настройки поля, а результаты учитываются в таблице лидеров. Для участия нужно привязать аккаунт к Google или Discord, решить минимум 5 подсказок и отправить 1 подсказку в обычном режиме.',
  },
  {
    question: 'Как привязать к аккаунту Discord/Google?',
    answer: 'Для этого не надо создавать новый аккаунт. Чтобы сохранить текущий прогресс можно привязать к существующему аккаунту Discord или Google в настройках.',
    image: '/faq/attach_account.png'
  },
  {
    question: 'По каким правилам загадывать слова?',
    answer: 'По любым правилам, принятым на мемполисе. Предпочтительнее, конечно, загадывание по смыслу без эксплойтов окончаниями и формой слова. Но если хотите использовать мету - используйте. В любом случае, всегда есть риск что вас не поймут.',
  },  
  {
    question: 'Как начисляются очки?',
    answer: 'За каждое угаданное красное слово +1 балл. За синее слово -1 балл. Нейтральные (белые) слова не влияют на счёт. Чёрное слово (убийца) обнуляет весь счёт.',
  },
  {
    question: 'Как считаются рейтинги?',
    answer: [
      'Рейтинг подсказки (капитан):',
      '• Берётся 75-й перцентиль среди счетов всех решений подсказки и умножается на 40 — это рейтинг подсказки.',
      '',
      'Рейтинг решения (разведчик):',
      '• Формула: 150 + счёт × 40 − рейтинг подсказки.',
      '• Чем сложнее подсказка (выше рейтинг), тем больше очков за правильное решение.',
      '',
      'Рейтинг игрока:',
      '• Капитан — среднее арифметическое рейтингов всех его подсказок.',
      '• Разведчик — среднее арифметическое рейтингов всех его решений.',
      '• Общий — среднее рейтингов капитана и разведчика.',
    ].join('\n'),
  },
];

export default function FaqPage() {
  const navigate = useNavigate();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 pt-4 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-6 text-gray-400 hover:text-white transition-colors z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <h1 className="text-2xl font-extrabold text-white text-center mb-6">FAQ</h1>

        <div className="space-y-2">
          {FAQ_ITEMS.map((item, idx) => (
            <div
              key={idx}
              className={`bg-gray-800/60 border rounded-xl overflow-hidden transition-colors ${
                expandedIdx === idx ? 'border-gray-500' : 'border-gray-700/30'
              }`}
            >
              <button
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-bold text-white text-sm">{item.question}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`text-gray-400 flex-shrink-0 ml-3 transition-transform ${expandedIdx === idx ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {expandedIdx === idx && (
                <div className="px-5 pb-4 text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                  {item.answer}
                  {item.image && (
                    <img src={item.image} alt="" className="mt-3 rounded-lg border border-gray-700 max-w-full" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
