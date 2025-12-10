import React, { useState, useEffect } from 'react';
import { uploadDocument, listDocuments, downloadDocument, getDocumentUrl, renameDocument, deleteDocument } from '../services/supabaseStorage';
import { Trash2, FileText, Download, List, Grid, Maximize2, Minimize2, Edit2, Check, X as XIcon } from 'lucide-react';
import { Session } from '@supabase/supabase-js';

interface DocumentsPageProps {
  session: Session | null;
}

const DocumentsPage: React.FC<DocumentsPageProps> = ({ session }) => {
  const [view, setView] = useState<'grid-small' | 'grid-large' | 'list' | 'detailed'>('grid-large');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [documents, setDocuments] = useState<Array<{ name: string; size?: number; created_at?: string }>>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View selector UI
  const viewSelector = (
    <div className="flex gap-2 mb-4 items-center">
      <span className="text-xs text-gray-500 mr-2">View:</span>
      <button onClick={() => setView('grid-small')} className={`p-1 rounded ${view==='grid-small' ? 'bg-indigo-100 dark:bg-indigo-900' : ''}`} title="Small Icons"><Minimize2 className="w-4 h-4" /></button>
      <button onClick={() => setView('grid-large')} className={`p-1 rounded ${view==='grid-large' ? 'bg-indigo-100 dark:bg-indigo-900' : ''}`} title="Large Icons"><Maximize2 className="w-4 h-4" /></button>
      <button onClick={() => setView('list')} className={`p-1 rounded ${view==='list' ? 'bg-indigo-100 dark:bg-indigo-900' : ''}`} title="List"><List className="w-4 h-4" /></button>
      <button onClick={() => setView('detailed')} className={`p-1 rounded ${view==='detailed' ? 'bg-indigo-100 dark:bg-indigo-900' : ''}`} title="Detailed"><Grid className="w-4 h-4" /></button>
    </div>
  );

  const fetchDocuments = async () => {
    if (!session) {
      setDocuments([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (e: any) {
      setError(e.message || 'Failed to list documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [session]);

  // Fetch preview URLs for all documents
  useEffect(() => {
    const fetchPreviews = async () => {
      if (!session) {
        setPreviews({});
        return;
      }
      const newPreviews: Record<string, string> = {};
      await Promise.all(
        documents.map(async (doc: { name: string }) => {
          try {
            const url = await getDocumentUrl(doc.name);
            newPreviews[doc.name] = url;
          } catch {}
        })
      );
      setPreviews(newPreviews);
    };
    if (documents.length > 0) fetchPreviews();
    else setPreviews({});
  }, [documents, session]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      setError('You must be logged in to upload documents.');
      return;
    }
    if (!files || files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadDocument(files[i]);
      }
      await fetchDocuments();
    } catch (e: any) {
      setError(e.message || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (filename: string) => {
    setLoading(true);
    setError(null);
    try {
      await downloadDocument(filename);
    } catch (e: any) {
      setError(e.message || 'Download failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (oldName: string) => {
    if (!renameValue || renameValue === oldName) {
      setRenaming(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await renameDocument(oldName, renameValue);
      await fetchDocuments();
      setRenaming(null);
    } catch (e: any) {
      setError(e.message || 'Rename failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      await deleteDocument(filename);
      await fetchDocuments();
    } catch (e: any) {
      setError(e.message || 'Delete failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow min-h-[60vh]">
        <h2 className="text-2xl font-bold mb-4">Important Documents</h2>
        <p className="text-gray-500">Please sign in to access your documents.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow min-h-[60vh]">
      <h2 className="text-2xl font-bold mb-4">Important Documents</h2>
      <form onSubmit={handleUpload} className="mb-6 flex gap-2 items-center">
        <input
          type="file"
          multiple
          onChange={e => setFiles(e.target.files)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50" disabled={loading}>
          Upload
        </button>
      </form>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      <div>
        <h3 className="text-lg font-semibold mb-4">Stored Documents</h3>
        {viewSelector}
        {loading ? (
          <p>Loading...</p>
        ) : documents.length === 0 ? (
          <div className="text-gray-500 col-span-full">No documents found.</div>
        ) : view === 'list' ? (
          <table className="w-full text-sm border rounded overflow-hidden">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Size</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc: { name: string; size?: number; created_at?: string }) => (
                <tr key={doc.name} className="border-b">
                  <td className="p-2">
                    {renaming === doc.name ? (
                      <span className="flex items-center gap-2">
                        <input value={renameValue} onChange={e => setRenameValue(e.target.value)} className="border rounded px-2 py-1 text-xs" />
                        <button onClick={() => handleRename(doc.name)} className="text-green-600" title="Save"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setRenaming(null)} className="text-gray-400" title="Cancel"><XIcon className="w-4 h-4" /></button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        {doc.name}
                        <button onClick={() => { setRenaming(doc.name); setRenameValue(doc.name); }} className="text-xs text-gray-400 hover:text-indigo-600" title="Rename"><Edit2 className="w-3 h-3" /></button>
                      </span>
                    )}
                  </td>
                  <td className="p-2">{doc.size ? (doc.size / 1024).toFixed(1) + ' KB' : ''}</td>
                  <td className="p-2">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}</td>
                  <td className="p-2 flex gap-2">
                    <button onClick={() => handleDownload(doc.name)} className="p-1 rounded bg-indigo-500 hover:bg-indigo-600 text-white" title="Download"><Download className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(doc.name)} className="p-1 rounded bg-red-500 hover:bg-red-600 text-white" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : view === 'detailed' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {documents.map((doc: { name: string; size?: number; created_at?: string }) => {
              const url = previews[doc.name];
              const ext = doc.name.split('.').pop()?.toLowerCase() || '';
              let preview: React.ReactNode = <FileText className="w-14 h-14 text-indigo-500 mb-2" />;
              if (url) {
                if (["jpg","jpeg","png","gif","webp","bmp","svg"].includes(ext)) {
                  preview = <img src={url} alt={doc.name} className="w-32 h-32 object-contain mb-2 rounded shadow" />;
                } else if (["pdf"].includes(ext)) {
                  preview = <iframe src={url} title={doc.name} className="w-32 h-32 mb-2 rounded bg-white" />;
                } else if (["txt","md","csv","json","log"].includes(ext)) {
                  preview = <iframe src={url} title={doc.name} className="w-32 h-32 mb-2 rounded bg-white" />;
                }
              }
              return (
                <div key={doc.name} className="flex flex-col items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-4 shadow-sm group relative">
                  {preview}
                  <span className="truncate w-full text-center font-medium text-gray-800 dark:text-gray-200" title={doc.name}>{doc.name}</span>
                  <span className="text-xs text-gray-500 mt-1">{doc.size ? (doc.size / 1024).toFixed(1) + ' KB' : ''}</span>
                  <span className="text-xs text-gray-400 mt-0.5">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}</span>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleDownload(doc.name)} className="p-2 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white" title="Download"><Download className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(doc.name)} className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`grid ${view==='grid-small' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'} gap-5`}>
            {documents.map((doc: { name: string; size?: number; created_at?: string }) => {
              const url = previews[doc.name];
              const ext = doc.name.split('.').pop()?.toLowerCase() || '';
              let preview: React.ReactNode = <FileText className={`${view==='grid-small' ? "w-8 h-8" : "w-10 h-10"} text-indigo-500 mb-2`} />;
              if (url) {
                if (["jpg","jpeg","png","gif","webp","bmp","svg"].includes(ext)) {
                  preview = <img src={url} alt={doc.name} className={`${view==='grid-small' ? "w-12 h-12" : "w-20 h-20"} object-contain mb-2 rounded shadow`} />;
                } else if (["pdf"].includes(ext)) {
                  preview = <iframe src={url} title={doc.name} className={`${view==='grid-small' ? "w-12 h-12" : "w-20 h-20"} mb-2 rounded bg-white`} />;
                } else if (["txt","md","csv","json","log"].includes(ext)) {
                  preview = <iframe src={url} title={doc.name} className={`${view==='grid-small' ? "w-12 h-12" : "w-20 h-20"} mb-2 rounded bg-white`} />;
                }
              }
              return (
                <div key={doc.name} className="flex flex-col items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-4 shadow-sm group relative">
                  {preview}
                  <span className="truncate w-full text-center font-medium text-gray-800 dark:text-gray-200" title={doc.name}>{doc.name}</span>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleDownload(doc.name)} className="p-2 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white" title="Download"><Download className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(doc.name)} className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    <button onClick={() => { setRenaming(doc.name); setRenameValue(doc.name); }} className="p-2 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-700" title="Rename"><Edit2 className="w-4 h-4" /></button>
                  </div>
                  {renaming === doc.name && (
                    <div className="absolute top-2 left-2 right-2 bg-white dark:bg-gray-900 p-2 rounded shadow flex gap-2 items-center z-10">
                      <input value={renameValue} onChange={e => setRenameValue(e.target.value)} className="border rounded px-2 py-1 text-xs flex-1" />
                      <button onClick={() => handleRename(doc.name)} className="text-green-600" title="Save"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setRenaming(null)} className="text-gray-400" title="Cancel"><XIcon className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentsPage;
