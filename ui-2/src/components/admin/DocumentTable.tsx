import { useState } from 'react';
import {
  Trash2,
  Search,
  Upload,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { getToken } from '../../api/auth';

interface DocumentHistory {
  id: number;
  filename: string;
  size: number;
  mime_type: string;
  created_at: string;
  create_by: string;
  storage_key: string;
}

interface DocumentTableProps {
  documentHistory: DocumentHistory[];
  onDocumentDeleted?: () => void;
  onUploadClick?: () => void;
}

export default function DocumentTable({
  documentHistory,
  onDocumentDeleted,
  onUploadClick,
}: DocumentTableProps) {
  const { t } = useLang();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<{ id: number; filename: string } | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<number | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState<DocumentHistory[] | null>(null);

  const handleDeleteFile = async (fileId: number, filename: string) => {
    console.log('🗑️  [DocumentTable] Deleting file:', {
      fileId,
      filename,
      timestamp: new Date().toISOString(),
    });

    setDeletingFileId(fileId);
    try {
      const token = getToken();
      const response = await fetch(`/dev-api/api/files/${fileId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }

      console.log('✅ [DocumentTable] File deleted successfully:', {
        fileId,
        filename,
      });

      toast.success(t('documentTable.deleteSuccess', { filename }));
      onDocumentDeleted?.();
    } catch (error) {
      console.error('❌ [DocumentTable] Error deleting file:', error);
      toast.error(t('documentTable.deleteError'));
    } finally {
      setDeletingFileId(null);
      setPendingDelete(null);
    }
  };

  const filteredDocs = searchQuery.trim()
    ? documentHistory.filter(doc => doc.filename.toLowerCase().includes(searchQuery.toLowerCase()))
    : documentHistory;

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1e228a] dark:bg-[#00CCFF] rounded-lg transition-colors">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground dark:text-white transition-colors">{t('documentTable.title')}</h2>
        </div>
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <div className="input-icon-absolute pointer-events-none"><Search className="w-4 h-4 text-icon-muted dark:text-dark-text-muted icon-current" /></div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('documentTable.searchPlaceholder')}
              className="w-full input-with-icon pr-4 py-2 bg-surface dark:bg-dark-surface border border-default dark:border-default rounded-xl text-foreground dark:text-dark-text placeholder-muted dark:placeholder-dark-text-muted focus:outline-none focus-ring-accent transition-colors"
            />
          </div>
          <button
            onClick={onUploadClick}
            className="flex items-center gap-2 px-4 py-2 btn-primary dark:bg-accent-strong text-on-accent rounded-xl transition-colors cursor-pointer whitespace-nowrap font-medium shadow-sm"
            title={t('documentTable.upload')}
          >
            <Upload className="w-4 h-4 icon-current" />
            <span className="hidden sm:inline">{t('documentTable.upload')}</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {pendingDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface dark:bg-dark-surface rounded-2xl border border-default shadow-xl max-w-md w-full p-6 space-y-4 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/15">
                <Trash2 className="w-6 h-6 text-error dark:text-error" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground dark:text-[#f1f5f9] transition-colors">
                  {t('documentTable.deleteTitle')}
                </h3>
                <p className="text-sm text-muted dark:text-dark-text-muted transition-colors">
                  {t('documentTable.deleteWarning')}
                </p>
              </div>
            </div> 
            <div className="bg-[#F6F6F6] dark:bg-[#252538] rounded-xl p-4 transition-colors border border-[#E8E8E8] dark:border-[#3d3d4d]">
              <p className="text-xs text-[#6E7680] dark:text-[#9ca3af] mb-1 transition-colors">File Name</p>
              <p className="text-sm font-medium text-[#232333] dark:text-[#e5e7eb] break-all transition-colors">{pendingDelete.filename}</p>
            </div>
            <div className="flex gap-3 pt-2 border-t border-[#E8E8E8] dark:border-[#3d3d4d]">
              <button
                onClick={() => setPendingDelete(null)}
                className="flex-1 px-4 py-3 rounded-xl bg-surface dark:bg-dark-surface hover:bg-surface-alt dark:hover:bg-dark-border text-foreground dark:text-dark-text font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  handleDeleteFile(pendingDelete.id, pendingDelete.filename);
                  setPendingDelete(null);
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-on-accent font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4 icon-current" />
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {pendingBulkDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1a2e] border border-[#E8E8E8] dark:border-[#2d2d3d] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl transition-colors">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/15">
                <Trash2 className="w-6 h-6 text-red-500 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#232333] dark:text-[#f1f5f9] transition-colors">
                  {t('documentTable.deleteSelectedTitle')}
                </h3>
                <p className="text-sm text-[#6E7680] dark:text-[#cbd5e1] transition-colors">
                  {t('documentTable.deleteWarning')}
                </p>
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto bg-[#F6F6F6] dark:bg-[#252538] rounded-xl p-3 space-y-1 border border-[#E8E8E8] dark:border-[#3d3d4d] transition-colors">
              {pendingBulkDelete.map((d) => (
                <div key={d.id} className="text-sm text-[#232333] dark:text-[#e5e7eb] truncate transition-colors" title={d.filename}>• {d.filename}</div>
              ))}
            </div>
            <div className="flex gap-3 pt-2 border-t border-[#E8E8E8] dark:border-[#3d3d4d]">
              <button
                onClick={() => setPendingBulkDelete(null)}
                className="flex-1 px-4 py-3 rounded-xl bg-[#F6F6F6] dark:bg-[#252538] hover:bg-[#E8E8E8] dark:hover:bg-[#3d3d4d] text-[#232333] dark:text-[#e5e7eb] font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={async () => {
                  const docs = pendingBulkDelete;
                  setPendingBulkDelete(null);
                  for (const d of docs) {
                    await handleDeleteFile(d.id, d.filename);
                  }
                  setSelectedDocIds(new Set());
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {t('common.deleteAll')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl overflow-hidden shadow-sm transition-colors">
        {/* Bulk actions above table */}
        <div className="flex items-center justify-between p-3 border-b border-[#E8E8E8] dark:border-dark-border bg-[#F6F6F6] dark:bg-dark-bg-primary transition-colors">
          <div className="text-sm text-[#6E7680] dark:text-dark-text-muted transition-colors">
            {t('documentTable.manage')}
          </div>
          <button
            onClick={() => {
              const selected = Array.from(selectedDocIds);
              if (selected.length === 0) return;
              const docs = documentHistory.filter(d => selected.includes(d.id));
              setPendingBulkDelete(docs);
            }}
            disabled={selectedDocIds.size === 0}
            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
          >
            {t('documentTable.deleteSelected')} ({selectedDocIds.size})
          </button>
        </div>

        <table className="w-full">
          <thead className="bg-[#F6F6F6] dark:bg-dark-bg-primary border-b border-[#E8E8E8] dark:border-dark-border transition-colors">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[#1e228a] dark:accent-[#00CCFF]"
                  checked={filteredDocs.length > 0 && filteredDocs.every(doc => selectedDocIds.has(doc.id))}
                  onChange={(e) => {
                    const next = new Set(selectedDocIds);
                    if (e.target.checked) {
                      filteredDocs.forEach(d => next.add(d.id));
                    } else {
                      filteredDocs.forEach(d => next.delete(d.id));
                    }
                    setSelectedDocIds(next);
                  }}
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
                {t('documentTable.documentName')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
                {t('documentTable.size')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
                {t('documentTable.uploadedBy')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
                {t('documentTable.uploadDate')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
                {t('documentTable.status')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
                {t('documentTable.action')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.length > 0 ? (
              filteredDocs.map((doc) => (
                <tr key={doc.id} className="border-b border-[#E8E8E8] dark:border-dark-border hover:bg-[#F6F6F6] dark:hover:bg-dark-border transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-[#1e228a] dark:accent-[#00CCFF]"
                      checked={selectedDocIds.has(doc.id)}
                      onChange={(e) => {
                        setSelectedDocIds(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(doc.id); else next.delete(doc.id);
                          return next;
                        });
                      }}
                    />
                  </td>
                  <td className="px-4 py-3 text-[#232333] dark:text-dark-text font-medium transition-colors">{doc.filename}</td>
                  <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted transition-colors">
                    {(doc.size / 1024 / 1024).toFixed(2)} MB
                  </td>
                  <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted transition-colors">{doc.create_by || 'System'}</td>
                  <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted transition-colors">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      {t('documentTable.active')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setPendingDelete({ id: doc.id, filename: doc.filename })}
                      disabled={deletingFileId === doc.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deletingFileId === doc.id ? '...' : t('documentTable.delete')}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#6E7680] dark:text-dark-text-muted transition-colors">
                  {t('documentTable.noDocuments')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
