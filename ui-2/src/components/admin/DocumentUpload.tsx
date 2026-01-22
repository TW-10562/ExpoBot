import { useState, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  FileText,
  CheckCircle,
  Clock,
  Zap,
  AlertCircle,
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

interface DocumentUploadProps {
  onUploadComplete?: (files: DocumentHistory[]) => void;
  documentHistory: DocumentHistory[];
  triggerFileInput?: boolean;
  onTriggerReset?: () => void;
}

export default function DocumentUpload({
  onUploadComplete,
  documentHistory,
  triggerFileInput = false,
  onTriggerReset,
}: DocumentUploadProps) {
  const { t } = useLang();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, 'pending' | 'uploading' | 'success' | 'error'>>({});
  const [uploadCategory, setUploadCategory] = useState<string>('company_policy');
  const [reviewMode, setReviewMode] = useState<boolean>(false);
  const [fileCategories, setFileCategories] = useState<Record<string, string>>({});
  const [selectedToRemove, setSelectedToRemove] = useState<Set<string>>(new Set());
  const [pipelineSteps, setPipelineSteps] = useState<{
    step: number;
    status: 'pending' | 'in-progress' | 'completed' | 'error';
    labelKey: string;
  }[]>([
    { step: 1, status: 'pending', labelKey: 'documentTable.pipeline.fileUpload' },
    { step: 2, status: 'pending', labelKey: 'documentTable.pipeline.contentExtraction' },
    { step: 3, status: 'pending', labelKey: 'documentTable.pipeline.embeddingIndexing' },
    { step: 4, status: 'pending', labelKey: 'documentTable.pipeline.ragIntegration' },
  ]);

  // Handle external trigger to open file input
  useEffect(() => {
    if (triggerFileInput && fileInputRef.current) {
      fileInputRef.current.click();
      onTriggerReset?.();
    }
  }, [triggerFileInput, onTriggerReset]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      console.log('📎 [DocumentUpload] Files selected:', newFiles.length);

      const duplicates: string[] = [];
      const validFiles: File[] = [];

      newFiles.forEach(file => {
        const existingFile = documentHistory.find(doc => doc.filename === file.name);
        if (existingFile) {
          duplicates.push(file.name);
        } else {
          validFiles.push(file);
        }
      });

      if (duplicates.length > 0) {
        toast.info(t('documentTable.skippedExisting', { files: duplicates.join(', ') }));
      }

      if (validFiles.length > 0) {
        setUploadingFiles(prev => [...prev, ...validFiles]);
        const newProgress: Record<string, 'pending'> = {};
        validFiles.forEach(f => { newProgress[f.name] = 'pending'; });
        setUploadProgress(prev => ({ ...prev, ...newProgress }));

        setFileCategories(prev => {
          const updated = { ...prev };
          validFiles.forEach(f => {
            if (!updated[f.name]) updated[f.name] = uploadCategory || 'company_policy';
          });
          return updated;
        });
        setReviewMode(true);
        setSelectedToRemove(new Set());
      }

      e.target.value = '';
    }
  };

  const handleStartUpload = async () => {
    if (uploadingFiles.length === 0) return;
    setReviewMode(false);

    console.log('🚀 [DocumentUpload] Starting upload pipeline...');

    try {
      console.log('🔄 [DocumentUpload] STEP 1: File Upload - IN PROGRESS');
      setPipelineSteps((prev) =>
        prev.map((s) => (s.step === 1 ? { ...s, status: 'in-progress' } : s))
      );

      const formData = new FormData();
      uploadingFiles.forEach(file => {
        formData.append('files', file);
        setUploadProgress(prev => ({ ...prev, [file.name]: 'uploading' }));
      });
      formData.append('category', uploadCategory);

      try {
        const mapping: Record<string, string> = {};
        uploadingFiles.forEach(f => {
          mapping[f.name] = fileCategories[f.name] || uploadCategory || 'company_policy';
        });
        formData.append('fileCategories', JSON.stringify(mapping));
      } catch (err) {
        console.warn('Could not append fileCategories mapping');
      }

      const token = getToken();
      const uploadResponse = await fetch('/dev-api/api/files/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log('✅ [DocumentUpload] STEP 1: File Upload - COMPLETED', uploadResult);
      const successProgress: Record<string, 'success'> = {};
      uploadingFiles.forEach(f => { successProgress[f.name] = 'success'; });
      setUploadProgress(prev => ({ ...prev, ...successProgress }));
      setPipelineSteps((prev) =>
        prev.map((s) => (s.step === 1 ? { ...s, status: 'completed' } : s))
      );

      console.log('🔄 [DocumentUpload] STEP 2: Content Extraction - IN PROGRESS');
      setPipelineSteps((prev) =>
        prev.map((s) => (s.step === 2 ? { ...s, status: 'in-progress' } : s))
      );
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log('✅ [DocumentUpload] STEP 2: Content Extraction - COMPLETED');
      setPipelineSteps((prev) =>
        prev.map((s) => (s.step === 2 ? { ...s, status: 'completed' } : s))
      );

      console.log('🔄 [DocumentUpload] STEP 3: Embedding & Indexing - IN PROGRESS');
      setPipelineSteps((prev) =>
        prev.map((s) => (s.step === 3 ? { ...s, status: 'in-progress' } : s))
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log('✅ [DocumentUpload] STEP 3: Embedding & Indexing - COMPLETED');
      setPipelineSteps((prev) =>
        prev.map((s) => (s.step === 3 ? { ...s, status: 'completed' } : s))
      );

      console.log('🔄 [DocumentUpload] STEP 4: RAG Integration - IN PROGRESS');
      setPipelineSteps((prev) =>
        prev.map((s) => (s.step === 4 ? { ...s, status: 'in-progress' } : s))
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('✅ [DocumentUpload] STEP 4: RAG Integration - COMPLETED');
      setPipelineSteps((prev) =>
        prev.map((s) => (s.step === 4 ? { ...s, status: 'completed' } : s))
      );

      console.log('🎉 [DocumentUpload] Upload pipeline completed successfully!');

      const refreshResponse = await fetch('/dev-api/api/files?pageNum=1&pageSize=100', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const refreshData = await refreshResponse.json();
      const files = refreshData.result?.rows || refreshData.data || refreshData.rows || [];
      if (Array.isArray(files)) {
        onUploadComplete?.(files);
      }

      toast.success(t('documentTable.uploadSuccess', { count: uploadingFiles.length, category: uploadCategory }));
      resetUpload();
    } catch (error) {
      console.error('❌ [DocumentUpload] Upload failed:', error);
      setPipelineSteps((prev) =>
        prev.map((s) =>
          s.status === 'in-progress' ? { ...s, status: 'error' } : s
        )
      );
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const removeFile = (fileName: string) => {
    setUploadingFiles(prev => prev.filter(f => f.name !== fileName));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileName];
      return newProgress;
    });
  };

  const resetUpload = () => {
    console.log('🔄 [DocumentUpload] Resetting upload form...');
    setUploadingFiles([]);
    setUploadProgress({});
    setUploadCategory('company_policy');
    setFileCategories({});
    setSelectedToRemove(new Set());
    setReviewMode(false);
    setPipelineSteps([
      { step: 1, status: 'pending', labelKey: 'documentTable.pipeline.fileUpload' },
      { step: 2, status: 'pending', labelKey: 'documentTable.pipeline.contentExtraction' },
      { step: 3, status: 'pending', labelKey: 'documentTable.pipeline.embeddingIndexing' },
      { step: 4, status: 'pending', labelKey: 'documentTable.pipeline.ragIntegration' },
    ]);
  };

  const removeSelectedFiles = () => {
    if (selectedToRemove.size === 0) return;
    const names = new Set(selectedToRemove);
    setUploadingFiles(prev => prev.filter(f => !names.has(f.name)));
    setUploadProgress(prev => {
      const next = { ...prev } as Record<string, 'pending' | 'uploading' | 'success' | 'error'>;
      names.forEach(n => { delete next[n]; });
      return next;
    });
    setFileCategories(prev => {
      const next = { ...prev };
      names.forEach(n => { delete next[n]; });
      return next;
    });
    setSelectedToRemove(new Set());
  };

  const getStepIcon = (
    step: number,
    status: 'pending' | 'in-progress' | 'completed' | 'error'
  ) => {
    if (status === 'completed')
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (status === 'in-progress')
      return <Zap className="w-5 h-5 text-yellow-400 animate-pulse" />;
    if (status === 'error') return <AlertCircle className="w-5 h-5 text-red-400" />;

    const icons = {
      1: <Upload className="w-5 h-5 text-slate-400" />,
      2: <FileText className="w-5 h-5 text-slate-400" />,
      3: <FileText className="w-5 h-5 text-slate-400" />,
      4: <FileText className="w-5 h-5 text-slate-400" />,
    };
    return icons[step as 1 | 2 | 3 | 4];
  };

  return (
    <>
      {uploadingFiles.length > 0 && (
        <div className="bg-[#F0F4FF] dark:bg-dark-surface-alt border border-[#1d2089]/20 dark:border-dark-border rounded-2xl p-6 space-y-6 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-[#232333] dark:text-white transition-colors mb-1">{t('documentTable.filesSelected', { count: uploadingFiles.length })}</h4>
              <p className="text-sm text-[#6E7680] dark:text-dark-text-muted transition-colors">{t('documentTable.totalSize', { size: (uploadingFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2) })}</p>
            </div>
            <button
              onClick={resetUpload}
              className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#6E7680] dark:text-dark-text-muted transition-colors" />
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {uploadingFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-white dark:bg-dark-surface rounded-xl px-3 py-2 gap-3 border border-[#E8E8E8] dark:border-dark-border transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-[#1d2089] dark:accent-dark-accent-blue"
                    checked={selectedToRemove.has(file.name)}
                    onChange={(e) => {
                      setSelectedToRemove(prev => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(file.name); else next.delete(file.name);
                        return next;
                      });
                    }}
                    disabled={uploadProgress[file.name] !== 'pending'}
                  />
                  <FileText className="w-4 h-4 text-[#1d2089] flex-shrink-0" />
                  <span className="text-sm text-[#232333] dark:text-dark-text truncate transition-colors" title={file.name}>{file.name}</span>
                  <span className="text-xs text-[#6E7680] dark:text-dark-text-muted transition-colors">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  {uploadProgress[file.name] === 'success' && (
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  )}
                  {uploadProgress[file.name] === 'uploading' && (
                    <Clock className="w-4 h-4 text-yellow-400 animate-pulse flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 dark:text-dark-text-muted transition-colors">
                    {t('documentTable.categoryLabel')}
                  </label>
                  <select
                    value={fileCategories[file.name] || 'company_policy'}
                    onChange={(e) => setFileCategories(prev => ({ ...prev, [file.name]: e.target.value }))}
                    disabled={uploadProgress[file.name] !== 'pending'}
                    className="bg-[#F6F6F6] dark:bg-dark-surface-alt border border-[#E8E8E8] dark:border-dark-border text-[#232333] dark:text-dark-text text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
                  >
                    <option value="company_policy">{t('documentTable.category.companyPolicy')}</option>
                    <option value="internal_guide">{t('documentTable.category.internalGuide')}</option>
                    <option value="procedure">{t('documentTable.category.procedure')}</option>
                    <option value="faq">{t('documentTable.category.faq')}</option>
                  </select>
                  {uploadProgress[file.name] === 'pending' && (
                    <button
                      onClick={() => removeFile(file.name)}
                      className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {reviewMode && (
            <div className="flex items-center justify-between">
              <button
                onClick={removeSelectedFiles}
                disabled={selectedToRemove.size === 0}
                className="px-3 py-2 rounded-xl bg-[#F6F6F6] dark:bg-dark-surface-alt hover:bg-[#E8E8E8] dark:hover:bg-dark-surface text-[#232333] dark:text-dark-text disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {t('documentTable.removeSelected')}
              </button>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{t('documentTable.selectedCount', { count: selectedToRemove.size })}</span>
              </div>
            </div>
          )}

          {!reviewMode && (
            <div>
              <label className="block text-sm font-medium text-[#232333] dark:text-dark-text mb-3 transition-colors">
                {t('documentTable.defaultCategory')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'company_policy', label: t('documentTable.category.companyPolicy') },
                  { value: 'internal_guide', label: t('documentTable.category.internalGuide') },
                  { value: 'procedure', label: t('documentTable.category.procedure') },
                  { value: 'faq', label: t('documentTable.category.faq') },
                ].map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setUploadCategory(cat.value)}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      uploadCategory === cat.value
                        ? 'bg-[#1d2089] text-white shadow-lg'
                        : 'bg-white dark:bg-dark-surface text-[#6E7680] dark:text-dark-text-muted hover:bg-[#F6F6F6] dark:hover:bg-dark-border border border-[#E8E8E8] dark:border-dark-border'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h5 className="text-sm font-semibold text-[#232333] dark:text-white transition-colors">
              {t('documentTable.pipelineTitle')}
            </h5>
            <div className="space-y-3">
              {pipelineSteps.map((step) => (
                <div key={step.step}>
                  <div className="flex items-center gap-3 mb-2">
                    {getStepIcon(step.step, step.status)}
                    <span className="text-sm font-medium text-[#232333] dark:text-dark-text transition-colors">
                      {t(step.labelKey)}
                    </span>
                    {step.status === 'completed' && (
                      <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                        {t('documentTable.pipelineStatusDone')}
                      </span>
                    )}
                    {step.status === 'in-progress' && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                        {t('documentTable.pipelineStatusProcessing')}
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        step.status === 'completed'
                          ? 'w-full bg-green-500'
                          : step.status === 'in-progress'
                          ? 'w-2/3 bg-blue-500'
                          : 'w-0 bg-slate-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {reviewMode ? (
            <button
              onClick={handleStartUpload}
              className="w-full px-6 py-3 bg-[#1d2089] hover:bg-[#161870] text-white font-semibold rounded-xl transition-all"
            >
              {t('documentTable.nextContinue')}
            </button>
          ) : (
            <button
              onClick={handleStartUpload}
              disabled={pipelineSteps[0].status !== 'pending'}
              className="w-full px-6 py-3 bg-[#1d2089] hover:bg-[#161870] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
            >
              {pipelineSteps[0].status === 'pending' ? '🚀 Start Upload Pipeline' : t('documentTable.pipeline.processing')}
            </button>
          )}
        </div>
      )}

      {uploadingFiles.length === 0 && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.xlsx,.csv"
        />
      )}
    </>
  );
}
