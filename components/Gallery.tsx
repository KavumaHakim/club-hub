import React, { useEffect, useState } from 'react';
import { User, GalleryItem } from '../types';
import * as api from '../services/apiService';
import { useData } from '../DataContext';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { CameraIcon } from './icons/CameraIcon';
import { XIcon } from './icons/XIcon';

interface GalleryProps {
  currentUser: User;
}

const Gallery: React.FC<GalleryProps> = ({ currentUser }) => {
  const { showToast } = useData();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadGalleryItems = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getGalleryItems();
      setItems(data);
    } catch (error: any) {
      console.error('Failed to load gallery items', error);
      setErrorMessage('Unable to load gallery at the moment.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGalleryItems();
  }, []);

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      setErrorMessage(null);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!selectedFile) {
      setErrorMessage('Please upload an image to add to the gallery.');
      return;
    }

    setIsSaving(true);
    try {
      const imageUrl = await api.uploadGalleryImage(selectedFile);
      await api.addGalleryItem(currentUser.uid, title.trim(), description.trim(), imageUrl);
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      setPreviewUrl(null);
      showToast('Image added to the gallery.', 'success');
      await loadGalleryItems();
    } catch (error: any) {
      console.error('Failed to save gallery item', error);
      setErrorMessage('Unable to upload image. Please try again.');
      showToast('Gallery upload failed.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Patron Gallery</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">Upload club photos, visuals, event snaps, or inspiration boards for members to browse.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200 px-3 py-1 text-xs font-semibold">
            Patron only
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Optional caption"
                className="w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
              <input
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional details"
                className="w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Upload an image</label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="inline-flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer hover:border-sky-400 hover:text-sky-600">
                <CameraIcon className="w-5 h-5" />
                <span>{selectedFile ? 'Change image' : 'Select image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    handleFileChange(file);
                  }}
                />
              </label>
              {previewUrl && (
                <div className="relative rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-700 w-full sm:w-40 h-40">
                  <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleFileChange(null)}
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                    aria-label="Remove image"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-200">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Only patrons can add gallery images. Images are stored immediately on upload.</p>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 text-white px-5 py-3 text-sm font-semibold shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <PlusCircleIcon className="w-5 h-5" />
              {isSaving ? 'Uploading...' : 'Add to gallery'}
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 text-center text-gray-500 dark:text-gray-400">Loading gallery...</div>
        ) : items.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 text-center text-gray-500 dark:text-gray-400">No gallery images yet. Upload the first one to get started.</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="group overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm transition-transform hover:-translate-y-1">
              <div className="relative h-64 overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img src={item.imageUrl} alt={item.title || 'Gallery image'} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{item.title || 'Untitled image'}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Uploaded by {item.userName}</p>
                  </div>
                  <span className="inline-flex rounded-full bg-slate-100 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-2 py-1">Gallery</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{item.description || 'No description provided.'}</p>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default Gallery;
