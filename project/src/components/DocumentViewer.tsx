import { FileText, Download, Eye } from 'lucide-react';
import { MOCK_DOCUMENTS } from '../constants';

export default function DocumentViewer() {
  const handleViewDocument = (docName: string) => {
    alert(`In a production environment, this would open ${docName} in a document viewer.`);
  };

  const handleDownloadDocument = (docName: string) => {
    alert(`In a production environment, this would download ${docName}.`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-white/10 bg-black/20">
        <h3 className="text-lg font-semibold text-white">HR Policy Documents</h3>
        <p className="text-sm text-slate-400 mt-1">
          Browse and view all available HR policy documents
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-4">
          {MOCK_DOCUMENTS.map((doc) => (
            <div
              key={doc.id}
              className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold mb-1">{doc.name}</h4>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400 mb-3">
                    <span>Version {doc.version}</span>
                    <span>•</span>
                    <span>Uploaded {doc.uploadedAt.toLocaleDateString()}</span>
                    <span>•</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        doc.status === 'active'
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-slate-500/20 text-slate-300'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDocument(doc.name)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => handleDownloadDocument(doc.name)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm border border-white/10 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
