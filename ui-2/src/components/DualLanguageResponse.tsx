/**
 * DualLanguageResponse Component
 * Displays responses in a 2-column layout:
 * Column 1: User's detected language
 * Column 2: Translation to other language
 * Includes page citations for RAG-based responses
 */

import React, { useState } from 'react';
import { Globe, Languages, Copy, FileText, Check } from 'lucide-react';

interface PageCitation {
  filename: string;
  page?: number;
  content?: string;
}

interface DualLanguageResponseProps {
  detectedLanguage: 'en' | 'ja';
  primaryText: string;
  secondaryText: string;
  isRAGBased?: boolean;
  citations?: PageCitation[];
  metadata?: {
    processingPath?: string;
    ragTriggered?: boolean;
    filesUsed?: number;
  };
}

export const DualLanguageResponse: React.FC<DualLanguageResponseProps> = ({
  detectedLanguage,
  primaryText,
  secondaryText,
  isRAGBased = false,
  citations = [],
  metadata,
}) => {
  const [activeTab, setActiveTab] = useState<'both' | 'primary' | 'secondary'>('both');
  const [copied, setCopied] = useState<'primary' | 'secondary' | null>(null);

  const primaryLang = detectedLanguage === 'ja' ? '日本語' : 'English';
  const secondaryLang = detectedLanguage === 'ja' ? 'English' : '日本語';

  const handleCopy = (text: string, type: 'primary' | 'secondary') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="w-full">
      {/* Metadata and control header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {metadata?.processingPath && (
            <span className="text-xs px-2 py-1 rounded-full bg-[#F6F6F6] dark:bg-dark-border border border-[#E8E8E8] dark:border-dark-border text-[#6E7680] dark:text-dark-text-muted transition-colors">
              {metadata.processingPath === 'COMPANY' ? (
                <>
                  <span className="inline-block mr-1">🏢</span>
                  Company Query
                </>
              ) : (
                <>
                  <span className="inline-block mr-1">❓</span>
                  General Query
                </>
              )}
            </span>
          )}
          {metadata?.ragTriggered && (
            <span className="text-xs px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
              <FileText className="w-3 h-3 inline mr-1 text-amber-600" />
              RAG Enabled
              {metadata.filesUsed && ` (${metadata.filesUsed} file${metadata.filesUsed > 1 ? 's' : ''})`}
            </span>
          )}
        </div>

        {/* Language tabs */}
        <div className="flex gap-1 p-1 bg-[#F6F6F6] dark:bg-dark-border border border-[#E8E8E8] dark:border-dark-border rounded-lg transition-colors">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === 'both'
                ? 'bg-[#1d2089] dark:bg-gradient-to-r dark:from-[#60a5fa] dark:to-[#a78bfa] text-white'
                : 'text-[#6E7680] dark:text-dark-text-muted hover:text-[#232333] dark:hover:text-dark-text hover:bg-[#E8E8E8] dark:hover:bg-dark-surface'
            }`}
            title="Show both languages"
          >
            <Languages className="w-3 h-3 inline mr-1" />
            Both
          </button>
          <button
            onClick={() => setActiveTab('primary')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === 'primary'
                ? 'bg-[#1d2089] text-white'
                : 'text-[#6E7680] hover:text-[#232333] hover:bg-[#E8E8E8]'
            }`}
            title={`Show ${primaryLang} only`}
          >
            {primaryLang}
          </button>
          <button
            onClick={() => setActiveTab('secondary')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === 'secondary'
                ? 'bg-[#1d2089] text-white'
                : 'text-[#6E7680] hover:text-[#232333] hover:bg-[#E8E8E8]'
            }`}
            title={`Show ${secondaryLang} only`}
          >
            {secondaryLang}
          </button>
        </div>
      </div>

      {/* Side-by-side content display */}
      {activeTab === 'both' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Primary column (user's detected language) */}
          <div className="p-4 rounded-xl bg-[#F0F4FF] border border-[#1d2089]/20">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1d2089]/10">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#1d2089]" />
                <span className="text-sm font-semibold text-[#1d2089]">
                  {primaryLang}
                  <span className="text-xs text-[#6E7680] ml-2">(Detected)</span>
                </span>
              </div>
              <button
                onClick={() => handleCopy(primaryText, 'primary')}
                className="p-1.5 rounded-md text-[#6E7680] hover:text-[#232333] hover:bg-white transition-colors"
                title="Copy this language"
              >
                {copied === 'primary' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#232333]">
              {primaryText}
            </p>
          </div>

          {/* Secondary column (translation) */}
          <div className="p-4 rounded-xl bg-white border border-[#E8E8E8]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E8E8E8]">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#1d2089]" />
                <span className="text-sm font-semibold text-[#232333]">
                  {secondaryLang}
                  <span className="text-xs text-[#6E7680] ml-2">(Translation)</span>
                </span>
              </div>
              <button
                onClick={() => handleCopy(secondaryText, 'secondary')}
                className="p-1.5 rounded-md text-[#6E7680] dark:text-dark-text-muted hover:text-[#232333] dark:hover:text-dark-text hover:bg-[#F6F6F6] dark:hover:bg-dark-surface transition-colors"
                title="Copy this language"
              >
                {copied === 'secondary' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#232333] dark:text-dark-text transition-colors">
              {secondaryText}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border transition-colors">
          {activeTab === 'primary' ? (
            <>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E8E8E8] dark:border-dark-border">
                <span className="text-sm font-semibold text-[#232333] dark:text-dark-text transition-colors">{primaryLang}</span>
                <button
                  onClick={() => handleCopy(primaryText, 'primary')}
                  className="p-1.5 rounded-md text-[#6E7680] dark:text-dark-text-muted hover:text-[#232333] dark:hover:text-dark-text hover:bg-[#F6F6F6] dark:hover:bg-dark-surface transition-colors"
                >
                  {copied === 'primary' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#232333] dark:text-dark-text transition-colors">
                {primaryText}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E8E8E8] dark:border-dark-border">
                <span className="text-sm font-semibold text-[#232333] dark:text-dark-text transition-colors">{secondaryLang}</span>
                <button
                  onClick={() => handleCopy(secondaryText, 'secondary')}
                  className="p-1.5 rounded-md text-[#6E7680] dark:text-dark-text-muted hover:text-[#232333] dark:hover:text-dark-text hover:bg-[#F6F6F6] dark:hover:bg-dark-surface transition-colors"
                >
                  {copied === 'secondary' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#232333]">
                {secondaryText}
              </p>
            </>
          )}
        </div>
      )}

      {/* Page citations section for RAG responses */}
      {isRAGBased && citations && citations.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">Sources</span>
          </div>
          <div className="space-y-1">
            {citations.map((citation, idx) => (
              <div key={idx} className="text-xs text-amber-700">
                • <span className="text-amber-800">{citation.filename}</span>
                {citation.page && <span className="ml-1">(page {citation.page})</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DualLanguageResponse;
