import React from 'react';
import { MessageSquare, Heart } from 'lucide-react';
import { api } from '../lib/api';
import type { Post } from '../types';

export default function SocialFeed() {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [newPost, setNewPost] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await api.getFeed();
        setPosts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load posts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const post = await api.createPost(newPost);
      setPosts(prev => [post, ...prev]);
      setNewPost('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Social Feed</h1>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Share your trading insights..."
          className="input w-full h-24 resize-none mb-4"
          maxLength={280}
        />
        {error && (
          <div className="p-4 mb-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500">
            {error}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {newPost.length}/280 characters
          </span>
          <button
            type="submit"
            disabled={isSubmitting || !newPost.trim()}
            className="btn btn-primary disabled:opacity-50"
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Loading posts...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-500">{error}</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No posts yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={post.avatar}
                  alt={post.username}
                  className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"
                />
                <div>
                  <h3 className="font-medium">{post.username}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(post.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className="mb-4">{post.content}</p>
              <div className="flex items-center gap-6 text-gray-500 dark:text-gray-400">
                <button className="flex items-center gap-2 hover:text-red-500 transition-colors">
                  <Heart size={18} />
                  <span>{post.likes}</span>
                </button>
                <button className="flex items-center gap-2 hover:text-brand-primary transition-colors">
                  <MessageSquare size={18} />
                  <span>{post.comments}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}