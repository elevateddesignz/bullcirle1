import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock } from 'lucide-react';

interface NewsArticle {
  title: string;
  summary: string;
  url: string;
  datetime: string;
  source: string;
}

const NewsFeed: React.FC = () => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/alpha-news`);
        // Expect the endpoint returns an object with a "news" property.
        setNews(res.data.news);
      } catch (err) {
        console.error('Error fetching news:', err);
        setError('Failed to load news.');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4">Market News</h2>
      {loading && <div>Loading news...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {news.length > 0 ? (
        <ul className="space-y-4">
          {news.map((article, idx) => (
            <li key={idx} className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <h3 className="text-lg font-bold">{article.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{article.summary}</p>
              <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Clock size={14} className="mr-1" />
                <span>{new Date(article.datetime).toLocaleString()}</span>
                <span className="mx-2">|</span>
                <span>{article.source}</span>
              </div>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-blue-500 hover:underline"
              >
                Read Full Article
              </a>
            </li>
          ))}
        </ul>
      ) : (
        !loading && <div>No news available.</div>
      )}
    </div>
  );
};

export default NewsFeed;
