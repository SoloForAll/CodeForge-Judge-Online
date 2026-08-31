import React from 'react';
import { Play, Send, CheckCircle2, XCircle, Clock3, AlertTriangle, RefreshCw } from 'lucide-react';

export function TestcasePanel({
  activeTab,
  setActiveTab,
  customInput,
  setCustomInput,
  judgeState,
  history,
  onRunCode,
  onSubmit,
  isLoggedIn
}) {
  const isAccepted = judgeState.verdict === 'Accepted' || judgeState.verdict === 'Success' || judgeState.verdict === 'Finished';
  const isWarning = judgeState.verdict === 'Time Limit Exceeded' || judgeState.verdict === 'Output Limit Exceeded';
  const isPending = judgeState.status === 'queued' || judgeState.status === 'processing' || judgeState.status === 'running_custom';

  return (
    <div className="testcase-panel-wrap">
      {/* Tab Header */}
      <div className="workspace-tabs">
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

      {/* Tab Body */}
      <div className="tab-content">
        {activeTab === 'testcase' && (
          <div className="custom-input-box">
            <label>Standard Input:</label>
            <textarea
              placeholder="Enter custom input to test your code..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
            />
          </div>
        )}

        {activeTab === 'results' && (
          <div className="results-box">
            {judgeState.status === 'idle' ? (
              <p className="muted">
                Run your solution against custom input with <b>Run Code</b> or test against hidden judge test cases with <b>Submit Solution</b>.
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
                  {judgeState.runtimeMs > 0 && (
                    <span className="runtime-pill">
                      <Clock3 size={14} /> {judgeState.runtimeMs} ms
                    </span>
                  )}
                </div>

                <p className="verdict-message">{judgeState.message}</p>

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

                {judgeState.customResult && (
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

