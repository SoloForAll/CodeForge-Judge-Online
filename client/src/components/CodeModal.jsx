import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { X, Copy, Check, Clock3, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import api from '../api';

const MONACO_LANGUAGES = {
  JavaScript: 'javascript',
  Python: 'python',
  'C++': 'cpp',
  Java: 'java'
};

export function CodeModal({ submissionId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!submissionId) return;
    setLoading(true);
    api.get(`/submissions/${submissionId}/code`)
      .then((r) => {
        setData(r.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [submissionId]);

  const handleCopy = () => {
    if (!data?.source_code) return;
    navigator.clipboard.writeText(data.source_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!submissionId) return null;

  const isAccepted = data?.verdict === 'Accepted';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h2>{data?.problem_title || 'Submission Details'}</h2>
            <div className="modal-meta">
              <span className="file-badge">{data?.language}</span>
              {data && (
                <span className={`verdict-tag ${isAccepted ? 'text-success' : 'text-danger'}`}>
                  {isAccepted ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {data.verdict}
                </span>
              )}
              {data?.runtime_ms != null && (
                <span className="runtime-pill">
                  <Clock3 size={13} /> {data.runtime_ms} ms
                </span>
              )}
              {data?.created_at && (
                <span className="muted">{new Date(data.created_at).toLocaleString()}</span>
              )}
            </div>
          </div>

          <div className="modal-header-actions">
            <button className="button small ghost-btn" onClick={handleCopy} disabled={!data?.source_code}>
              {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {loading ? (
            <div className="loading-state">Loading submission source code...</div>
          ) : data ? (
            <Editor
              height="420px"
              language={MONACO_LANGUAGES[data.language] || 'javascript'}
              theme="vs-dark"
              value={data.source_code}
              options={{
                readOnly: true,
                domReadOnly: true,
                fontSize: 14,
                fontFamily: "'DM Mono', Consolas, monospace",
                lineNumbers: 'on',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 }
              }}
            />
          ) : (
            <div className="empty">Submission source code could not be found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

