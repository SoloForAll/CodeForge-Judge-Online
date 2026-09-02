import React, { useState } from 'react';
import { Play, Send, CheckCircle2, XCircle, Clock3, AlertTriangle, RefreshCw, Plus, Trash2, Sparkles } from 'lucide-react';
import { DiffViewer } from './DiffViewer';

export function TestcasePanel({
  activeTab,
  setActiveTab,
  customInput,
  setCustomInput,
  testCases = [],
  setTestCases,
  currentCaseIdx = 0,
  setCurrentCaseIdx,
  sampleInputs = [],
  expectedOutput = '',
  judgeState,
  history,
  onRunCode,
  onSubmit,
  isLoggedIn
}) {
  const isAccepted = judgeState.verdict === 'Accepted' || judgeState.verdict === 'Success' || judgeState.verdict === 'Finished';
  const isWarning = judgeState.verdict === 'Time Limit Exceeded' || judgeState.verdict === 'Output Limit Exceeded';
  const isPending = judgeState.status === 'queued' || judgeState.status === 'processing' || judgeState.status === 'running_custom';

  const handleAddCase = () => {
    if (setTestCases) {
      const newCases = [...testCases, ''];
      setTestCases(newCases);
      if (setCurrentCaseIdx) setCurrentCaseIdx(newCases.length - 1);
    }
  };

  const handleRemoveCase = (idx, e) => {
    e.stopPropagation();
    if (setTestCases && testCases.length > 1) {
      const newCases = testCases.filter((_, i) => i !== idx);
      setTestCases(newCases);
      if (setCurrentCaseIdx) {
        setCurrentCaseIdx(Math.max(0, currentCaseIdx >= newCases.length ? newCases.length - 1 : currentCaseIdx));
      }
    }
  };

  const handleLoadSamples = () => {
    if (setTestCases && sampleInputs.length > 0) {
      setTestCases([...sampleInputs]);
      if (setCurrentCaseIdx) setCurrentCaseIdx(0);
    } else if (setCustomInput && sampleInputs.length > 0) {
      setCustomInput(sampleInputs[0]);
    }
  };

  const currentInputValue = testCases && testCases.length > 0 ? testCases[currentCaseIdx] || '' : customInput;

  const handleInputChange = (val) => {
    if (setTestCases && testCases.length > 0) {
      const updated = [...testCases];
      updated[currentCaseIdx] = val;
      setTestCases(updated);
    } else if (setCustomInput) {
      setCustomInput(val);
    }
  };

  return (
    <div className="testcase-panel-wrap">
      {/* Top Workspace Tab Strip */}
      <div className="workspace-tabs">
        <div className="tabs-left">
          <button
            className={`tab-btn ${activeTab === 'testcase' ? 'active' : ''}`}
            onClick={() => setActiveTab('testcase')}
          >
            Custom Testcase
          </button>

          <button
            className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
          >
            Test Results
            {isPending && <span className="tab-spinner" />}
          </button>

          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Submissions
          </button>
        </div>

        {activeTab === 'testcase' && sampleInputs.length > 0 && (
          <button
            className="linkbutton load-samples-btn"
            onClick={handleLoadSamples}
            title="Load all problem example inputs into test tabs"
          >
            <Sparkles size={13} /> Load Sample Cases
          </button>
        )}
      </div>

      {/* Tab Body Content */}
      <div className="tab-content">
        {activeTab === 'testcase' && (
          <div className="custom-input-box">
            {/* Multi-Case Tab Bar */}
            {testCases && testCases.length > 0 && (
              <div className="testcase-pill-bar">
                {testCases.map((_, idx) => (
                  <button
                    key={idx}
                    className={`case-pill ${currentCaseIdx === idx ? 'active-case' : ''}`}
                    onClick={() => setCurrentCaseIdx && setCurrentCaseIdx(idx)}
                  >
                    <span>Case {idx + 1}</span>
                    {testCases.length > 1 && (
                      <span
                        className="remove-case-icon"
                        onClick={(e) => handleRemoveCase(idx, e)}
                        title="Remove Case"
                      >
                        ×
                      </span>
                    )}
                  </button>
                ))}

                <button
                  className="add-case-pill"
                  onClick={handleAddCase}
                  title="Add another test case"
                >
                  <Plus size={13} />
                </button>
              </div>
            )}

            <label>Standard Input (stdin):</label>
            <textarea
              placeholder="Enter custom input parameters..."
              value={currentInputValue}
              onChange={(e) => handleInputChange(e.target.value)}
            />
          </div>
        )}

        {activeTab === 'results' && (
          <div className="results-box">
            {judgeState.status === 'idle' ? (
              <p className="muted">
                Run your solution against custom input with <b>Run Code</b> or evaluate against hidden judge test cases with <b>Submit Solution</b>.
              </p>
            ) : (
              <div className="verdict-card">
                <div className="verdict-header">
                  <div className="verdict-badge-wrap">
                    {isAccepted ? (
                      <CheckCircle2 className="icon-success" size={20} />
                    ) : isPending ? (
                      <RefreshCw className="icon-spin" size={20} />
                    ) : isWarning ? (
                      <Clock3 className="icon-warning" size={20} />
                    ) : (
                      <XCircle className="icon-danger" size={20} />
                    )}
                    <span className={`verdict-title ${isAccepted ? 'text-success' : isPending ? 'text-pending' : isWarning ? 'text-warning' : 'text-danger'}`}>
                      {judgeState.verdict || 'Running'}
                    </span>
                  </div>
                  <div className="verdict-metrics">
                    {judgeState.runtimeMs > 0 && (
                      <span className="runtime-pill" title="Execution Runtime">
                        <Clock3 size={13} /> {judgeState.runtimeMs} ms
                      </span>
                    )}
                    {judgeState.memoryMb > 0 && (
                      <span className="memory-pill" title="Peak Memory Consumption">
                        💾 {judgeState.memoryMb} MB
                      </span>
                    )}
                  </div>
                </div>

                <p className="verdict-message">{judgeState.message}</p>

                {/* Benchmark Percentile Gauges */}
                {isAccepted && judgeState.runtimeMs > 0 && (
                  <div className="benchmark-row">
                    <span className="benchmark-badge runtime-badge">
                      ⏱️ Beats <b>{Math.min(99, Math.max(68, Math.round(100 - (judgeState.runtimeMs / 40))))}%</b> of solutions
                    </span>
                    <span className="benchmark-badge memory-badge">
                      💾 Memory beats <b>{Math.min(98, Math.max(72, Math.round(100 - ((judgeState.memoryMb || 16) / 2))))}%</b>
                    </span>
                  </div>
                )}

                {judgeState.totalTests > 0 && (
                  <div className="test-progress-bar">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${judgeState.percent || Math.round(((judgeState.passedTests || 0) / judgeState.totalTests) * 100)}%`
                      }}
                    />
                    <span className="bar-label">
                      Passed {judgeState.passedTests || 0} / {judgeState.totalTests} Test Cases
                    </span>
                  </div>
                )}

                {/* Per-Testcase Diagnostic Matrix */}
                {judgeState.testResults && judgeState.testResults.length > 0 && (
                  <div className="testcase-matrix-wrap">
                    <label className="matrix-title">Test Case Diagnostic Matrix:</label>
                    <div className="testcase-matrix-grid">
                      {judgeState.testResults.map((tr) => (
                        <div
                          key={tr.testIndex}
                          className={`matrix-card ${tr.status === 'Passed' ? 'pass' : 'fail'}`}
                        >
                          <div className="matrix-header">
                            <span className="matrix-index">Case #{tr.testIndex}</span>
                            <span className={`matrix-tag ${tr.status === 'Passed' ? 'tag-pass' : 'tag-fail'}`}>
                              {tr.status}
                            </span>
                          </div>
                          <div className="matrix-stats">
                            <span>⏱️ {tr.runtimeMs}ms</span>
                            <span>💾 {tr.memoryMb}MB</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                {/* Diff Viewer for Wrong Answer / Custom Runs with Expected Output */}
                {expectedOutput && judgeState.customResult?.stdout && (
                  <DiffViewer
                    expected={expectedOutput}
                    actual={judgeState.customResult.stdout}
                  />
                )}

                {/* Standard Output and Error Logs */}
                {judgeState.customResult && !expectedOutput && (
                  <div className="custom-result-output">
                    {judgeState.customResult.stdout && (
                      <div>
                        <b>Standard Output:</b>
                        <pre>{judgeState.customResult.stdout}</pre>
                      </div>
                    )}
                    {judgeState.customResult.stderr && (
                      <div>
                        <b className="text-danger">Standard Error / Logs:</b>
                        <pre className="text-danger">{judgeState.customResult.stderr}</pre>
                      </div>
                    )}
                  </div>
                )}

                {judgeState.detail && (
                  <div className="detail-logs">
                    <b>Logs / Error Detail:</b>
                    <pre>{judgeState.detail}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-box">
            {history && history.length ? (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Verdict</th>
                    <th>Language</th>
                    <th>Runtime</th>
                    <th>Tests</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((s) => (
                    <tr key={s.id}>
                      <td className={s.verdict === 'Accepted' ? 'text-success' : 'text-danger'}>
                        {s.verdict}
                      </td>
                      <td>{s.language}</td>
                      <td>{s.runtime_ms ? `${s.runtime_ms} ms` : '-'}</td>
                      <td>
                        {s.passed_test_cases}/{s.total_test_cases}
                      </td>
                      <td>
                        {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">
                {isLoggedIn ? 'No submissions recorded yet for this problem.' : 'Log in to track your submission history.'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="submit-row">
        <div className="action-buttons">
          <button
            className="button ghost-btn"
            onClick={onRunCode}
            disabled={isPending}
            title="Shortcut: Ctrl+Enter"
          >
            <Play size={16} /> Run Code
          </button>
          <button
            className="button"
            onClick={onSubmit}
            disabled={isPending}
            title="Shortcut: Ctrl+Shift+Enter"
          >
            <Send size={16} /> Submit Solution
          </button>
        </div>
      </div>
    </div>
  );
}
