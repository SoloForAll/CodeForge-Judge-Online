import React, { useState } from 'react';
import { Copy, Check, AlertCircle } from 'lucide-react';

export function DiffViewer({ expected, actual }) {
  const [copiedExpected, setCopiedExpected] = useState(false);
  const [copiedActual, setCopiedActual] = useState(false);

  const copyText = (text, isExpected) => {
    navigator.clipboard.writeText(text || '');
    if (isExpected) {
      setCopiedExpected(true);
      setTimeout(() => setCopiedExpected(false), 2000);
    } else {
      setCopiedActual(true);
      setTimeout(() => setCopiedActual(false), 2000);
    }
  };

  const expClean = (expected || '').trim();
  const actClean = (actual || '').trim();
  const isMatch = expClean === actClean;

  return (
    <div className="diff-viewer-card">
      <div className="diff-header">
        <span className={`diff-status-pill ${isMatch ? 'match' : 'mismatch'}`}>
          <AlertCircle size={14} />
          {isMatch ? 'Output Matches Expected' : 'Output Mismatch (Wrong Answer)'}
        </span>
      </div>

      <div className="diff-grid">
        {/* Expected Output Box */}
        <div className="diff-box expected-box">
          <div className="diff-box-header">
            <span className="diff-title expected-title">Expected Output</span>
            <button
              className="diff-copy-btn"
              onClick={() => copyText(expected, true)}
              title="Copy Expected Output"
            >
              {copiedExpected ? <Check size={13} /> : <Copy size={13} />}
              {copiedExpected ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="diff-pre expected-pre">{expected || '(empty)'}</pre>
        </div>

        {/* Actual Output Box */}
        <div className="diff-box actual-box">
          <div className="diff-box-header">
            <span className="diff-title actual-title">Your Output</span>
            <button
              className="diff-copy-btn"
              onClick={() => copyText(actual, false)}
              title="Copy Your Output"
            >
              {copiedActual ? <Check size={13} /> : <Copy size={13} />}
              {copiedActual ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="diff-pre actual-pre">{actual || '(empty / no output)'}</pre>
        </div>
      </div>
    </div>
  );
}
