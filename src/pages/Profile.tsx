import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { api, supabase } from '../lib/api';
import { Camera } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.getProfile();
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, or GIF file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 800, useWebWorker: true, fileType: file.type as 'image/jpeg' | 'image/png' | 'image/gif' };
      const compressedFile = await imageCompression(file, options);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-bucket`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to ensure storage bucket exists');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      if (user.avatar_url) {
        const oldFileName = user.avatar_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from('avatars').remove([oldFileName]);
        }
      }

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, compressedFile, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      if (updateError) throw updateError;

      setUser(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success('Avatar updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
      toast.error('Failed to update avatar');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Loading profile...</p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No profile data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div 
              className="w-24 h-24 rounded-full border-4 border-brand-primary overflow-hidden cursor-pointer"
              onClick={handleAvatarClick}
            >
              <img
                src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                alt={user.username}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.username}</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Member since {new Date(user.joinDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Additional sections such as Trading Stats, Achievements, Subscription, etc. would follow here */}
    </div>
  );
}
