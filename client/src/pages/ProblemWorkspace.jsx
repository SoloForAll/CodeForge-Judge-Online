import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Copy, Check, Sparkles } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { CodeEditor, STARTER_TEMPLATES } from '../components/CodeEditor';
import { TestcasePanel } from '../components/TestcasePanel';
import { SplitPaneHorizontal, SplitPaneVertical } from '../components/SplitPane';

const difficultyClass = (d) => (d ? d.toLowerCase() : 'easy');

export function ProblemWorkspace() {
  const { slug } = useParams();
  const { user } = useAuth();

  const [problem, setProblem] = useState(null);
  const [language, setLanguage] = useState('JavaScript');
  const [code, setCode] = useState(STARTER_TEMPLATES['JavaScript']);
  const [customInput, setCustomInput] = useState('');
  const [testCases, setTestCases] = useState(['']);
  const [currentCaseIdx, setCurrentCaseIdx] = useState(0);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const [activeTab, setActiveTab] = useState('testcase'); // 'testcase' | 'results' | 'history'
  const [history, setHistory] = useState([]);
  const [judgeState, setJudgeState] = useState({
    status: 'idle', // 'idle' | 'running_custom' | 'queued' | 'processing' | 'completed' | 'failed'
    message: '',
    verdict: '',
    runtimeMs: 0,
    passedTests: 0,
    totalTests: 0,
    detail: '',
    percent: 0,
    customResult: null
  });

  const eventSourceRef = useRef(null);

  // Fetch problem details
  useEffect(() => {
    api.get(`/problems/${slug}`).then((r) => {
      setProblem(r.data);
      if (r.data.example_input) {
        setCustomInput(r.data.example_input);
        const samples = [];
        if (r.data.samples && r.data.samples.length > 0) {
          r.data.samples.forEach(s => samples.push(s.input_data));
        } else {
          samples.push(r.data.example_input);
        }
        setTestCases(samples);
        setCurrentCaseIdx(0);
      }
    }).catch(() => {});
  }, [slug]);

  // Load user submissions for this problem
  const loadHistory = () => {
    if (!user) return;
    api.get('/submissions/me').then((r) => {
      setHistory(r.data.filter((s) => s.title === problem?.title));
    }).catch(() => {});
  };

  useEffect(() => {
    if (problem) loadHistory();
  }, [problem, user]);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
  };

  const handleCopyExample = (text, isInput) => {
    navigator.clipboard.writeText(text || '');
    if (isInput) {
      setCopiedInput(true);
      setTimeout(() => setCopiedInput(false), 2000);
    } else {
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    }
  };

  // Run Code against Active Testcase Input
  const handleRunCode = async () => {
    const activeInput = testCases && testCases.length > 0 ? testCases[currentCaseIdx] : customInput;

    setActiveTab('results');
    setJudgeState({
      status: 'running_custom',
      message: 'Executing code in secure sandbox...',
      verdict: 'Running',
      percent: 50,
      customResult: null
    });

    try {
      const { data } = await api.post('/judge/run', {
        language,
        sourceCode: code,
        customInput: activeInput
      });

      const expOutput = problem?.example_output?.trim();
      const actualOutput = data.stdout ? data.stdout.trim() : '';
      const isCorrect = expOutput ? actualOutput === expOutput : data.code === 0;

      let verdictText = 'Success';
      if (data.timedOut) {
        verdictText = 'Time Limit Exceeded';
      } else if (data.code !== 0) {
        verdictText = 'Runtime Error';
      } else if (expOutput && !isCorrect && currentCaseIdx === 0) {
        verdictText = 'Wrong Answer';
      }

      setJudgeState({
        status: 'completed',
        message: data.timedOut
          ? 'Time Limit Exceeded (3000 ms)'
          : verdictText === 'Wrong Answer'
          ? 'Output differs from example output'
          : data.code === 0
          ? 'Run Finished Successfully'
          : 'Program Exited With Error',
        verdict: verdictText,
        runtimeMs: data.runtimeMs,
        customResult: data,
        detail: data.stderr || ''
      });
    } catch (e) {
      setJudgeState({
        status: 'failed',
        message: e.response?.data?.message || 'Execution failed.',
        verdict: 'Error'
      });
    }
  };

  // Submit Solution against hidden judge tests with live SSE
  const handleSubmit = async () => {
    if (!user) {
      setActiveTab('results');
      setJudgeState({
        status: 'failed',
        message: 'Please log in before submitting solutions.',
        verdict: 'Auth Required'
      });
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setActiveTab('results');
    setJudgeState({
      status: 'queued',
      message: 'Submitting solution to queue...',
      verdict: 'Queued',
      percent: 10,
      customResult: null
    });

    try {
      const { data } = await api.post('/submissions', {
        problemId: problem.id,
        language,
        sourceCode: code
      });

      const submissionId = data.id;
      setJudgeState({
        status: 'queued',
        message: data.message || `In queue (position #${data.position || 1})`,
        verdict: 'Queued',
        percent: 20
      });

      // Connect to real-time Server-Sent Events (SSE) stream
      const baseURL = api.defaults.baseURL || 'http://localhost:5000/api';
      const es = new EventSource(`${baseURL}/submissions/${submissionId}/stream`);
      eventSourceRef.current = es;

      es.addEventListener('progress', (e) => {
        const update = JSON.parse(e.data);
        setJudgeState((prev) => ({
          ...prev,
          status: 'processing',
          verdict: update.verdict || 'Processing',
          message: update.message || 'Judging in progress...',
          percent: update.percent || 60,
          testIndex: update.testIndex,
          totalTests: update.totalTests
        }));
      });

      es.addEventListener('completed', (e) => {
        const result = JSON.parse(e.data);
        setJudgeState({
          status: 'completed',
          verdict: result.verdict,
          message: result.message || `${result.verdict} (${result.runtimeMs} ms)`,
          runtimeMs: result.runtimeMs,
          passedTests: result.passedTests,
          totalTests: result.totalTests,
          detail: result.detail,
          percent: 100
        });
        es.close();
        loadHistory();
      });

      es.addEventListener('failed', (e) => {
        const failure = JSON.parse(e.data);
        setJudgeState({
          status: 'failed',
          verdict: failure.verdict || 'Failed',
          message: failure.message || 'Judge execution failed.',
          detail: failure.error,
          percent: 100
        });
        es.close();
      });

      es.onerror = () => {
        es.close();
        // Fallback polling check
        api.get(`/submissions/${submissionId}`).then((res) => {
          if (res.data.status === 'completed' || res.data.status === 'failed') {
            setJudgeState({
              status: res.data.status,
              verdict: res.data.verdict,
              message: res.data.error_detail || `Judged in ${res.data.runtime_ms} ms`,
              runtimeMs: res.data.runtime_ms,
              passedTests: res.data.passed_test_cases,
              totalTests: res.data.total_test_cases,
              detail: res.data.error_detail,
              percent: 100
            });
            loadHistory();
          }
        }).catch(() => {});
      };
    } catch (e) {
      setJudgeState({
        status: 'failed',
        message: e.response?.data?.message || 'Submission failed.',
        verdict: 'Error'
      });
    }
  };

  if (!problem) return <div className="loading-state">Loading challenge…</div>;

  const isPending =
    judgeState.status === 'queued' ||
    judgeState.status === 'processing' ||
    judgeState.status === 'running_custom';

  const sampleInputs = problem.samples && problem.samples.length > 0
    ? problem.samples.map(s => s.input_data)
    : problem.example_input ? [problem.example_input] : [];

  // Left Pane Component (Problem Statement)
  const statementPane = (
    <article className="statement">
      <Link className="back" to="/problems">
        ← All problems
      </Link>
      <div className={`difficulty ${difficultyClass(problem.difficulty)}`}>
        {problem.difficulty}
      </div>
      <h1>{problem.title}</h1>
      <p className="tags">{problem.tags}</p>
      <div className="statement-body">
        <p>{problem.description}</p>

        {problem.input_format && (
          <div className="format-section">
            <h3>Input format</h3>
            <p>{problem.input_format}</p>
          </div>
        )}

        {problem.output_format && (
          <div className="format-section">
            <h3>Output format</h3>
            <p>{problem.output_format}</p>
          </div>
        )}

        {problem.example_input && (
          <div className="example">
            <div className="example-block-header">
              <b>Example input</b>
              <button
                className="example-copy-btn"
                onClick={() => handleCopyExample(problem.example_input, true)}
                title="Copy Example Input"
              >
                {copiedInput ? <Check size={13} /> : <Copy size={13} />}
                {copiedInput ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre>{problem.example_input}</pre>

            <div className="example-block-header" style={{ marginTop: '14px' }}>
              <b>Example output</b>
              <button
                className="example-copy-btn"
                onClick={() => handleCopyExample(problem.example_output, false)}
                title="Copy Example Output"
              >
                {copiedOutput ? <Check size={13} /> : <Copy size={13} />}
                {copiedOutput ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre>{problem.example_output}</pre>
          </div>
        )}
      </div>
    </article>
  );

  // Top Editor Pane Component
  const topEditorPane = (
    <CodeEditor
      problemSlug={problem.slug}
      language={language}
      onLanguageChange={handleLanguageChange}
      code={code}
      onChange={setCode}
      onRunCode={handleRunCode}
      onSubmit={handleSubmit}
      isPending={isPending}
    />
  );

  // Bottom Testcase / Results Pane Component
  const bottomTestPane = (
    <TestcasePanel
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      customInput={customInput}
      setCustomInput={setCustomInput}
      testCases={testCases}
      setTestCases={setTestCases}
      currentCaseIdx={currentCaseIdx}
      setCurrentCaseIdx={setCurrentCaseIdx}
      sampleInputs={sampleInputs}
      expectedOutput={currentCaseIdx === 0 ? problem.example_output : ''}
      judgeState={judgeState}
      history={history}
      onRunCode={handleRunCode}
      onSubmit={handleSubmit}
      isLoggedIn={Boolean(user)}
    />
  );

  return (
    <div className="workspace-resizable">
      <SplitPaneHorizontal
        initialRatio={45}
        minRatio={25}
        maxRatio={75}
        storageKey="codeforge_workspace_hratio"
        left={statementPane}
        right={
          <div className="editor-pane-vertical-wrap">
            <SplitPaneVertical
              initialRatio={58}
              minRatio={25}
              maxRatio={80}
              storageKey="codeforge_workspace_vratio"
              top={topEditorPane}
              bottom={bottomTestPane}
            />
          </div>
        }
      />
    </div>
  );
}
