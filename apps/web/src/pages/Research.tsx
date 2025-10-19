import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { resolveApiPath } from '../lib/backendConfig';

interface NewsArticle {
  title: string;
  summary: string;
  body?: string;
  url: string;
  datetime: string | number; // Accept string or number (if it's a timestamp)
  source: string;
}

export default function Research() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [fullArticleUrl, setFullArticleUrl] = useState<string | null>(null);

  const fetchNews = async () => {
    try {
      const response = await fetch(resolveApiPath('/alpha-news'));
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      setNews(data.news || []);
    } catch (err: any) {
      console.error('Error fetching news:', err);
      setError('Failed to fetch news data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleReadMore = (article: NewsArticle) => {
    setSelectedArticle(article);
  };

  const closePrimaryModal = () => {
    setSelectedArticle(null);
  };

  const openFullArticleModal = (url: string) => {
    setFullArticleUrl(url);
  };

  const closeFullArticleModal = () => {
    setFullArticleUrl(null);
  };

  // This helper function handles date parsing.
  const formatDate = (dateInput: string | number) => {
    let dateObj: Date;
    if (typeof dateInput === 'number') {
      // Assume timestamp is in seconds if it's less than 1e12, otherwise milliseconds.
      dateObj = new Date(dateInput < 1e12 ? dateInput * 1000 : dateInput);
    } else {
      // Try parsing the string directly.
      dateObj = new Date(dateInput);
      if (isNaN(dateObj.getTime())) {
        // Alternatively, if you know the expected format, use a library to parse it.
        // For now, return the original value.
        return dateInput;
      }
    }
    return dateObj.toLocaleDateString();
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">Market Research & News</h1>

      {loading && <p className="text-center text-gray-500">Loading news...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}
      {!loading && !error && news.length === 0 && (
        <p className="text-center text-gray-500">No news found.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.map((article, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between"
          >
            <div>
              <h2 className="text-xl font-semibold mb-2">{article.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {article.summary.length > 150
                  ? `${article.summary.substring(0, 150)}...`
                  : article.summary}
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{formatDate(article.datetime)}</span>
              <button
                onClick={() => handleReadMore(article)}
                className="underline hover:text-brand-primary"
              >
                Read more
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Primary Modal for Article Details */}
      {selectedArticle && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black opacity-50"
            onClick={closePrimaryModal}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-11/12 max-w-2xl z-[210] overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-2xl font-bold">{selectedArticle.title}</h2>
              <button
                onClick={closePrimaryModal}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <span>{formatDate(selectedArticle.datetime)}</span>
                <span className="ml-2">{selectedArticle.source}</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {selectedArticle.body ? selectedArticle.body : selectedArticle.summary}
              </p>
              <button
                onClick={() => openFullArticleModal(selectedArticle.url)}
                className="inline-block mt-2 px-4 py-2 bg-brand-primary text-white rounded-lg shadow hover:bg-brand-primary/90 transition-colors"
              >
                Visit Full Article
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Modal with iframe for full article source */}
      {fullArticleUrl && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black opacity-50"
            onClick={closeFullArticleModal}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 w-11/12 max-w-4xl z-[310] h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-bold">Full Article</h2>
              <button
                onClick={closeFullArticleModal}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <iframe
              src={fullArticleUrl}
              title="Full Article"
              className="w-full h-full mt-4"
              frameBorder="0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
