import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { CodeEditor, STARTER_TEMPLATES } from '../components/CodeEditor';
import { TestcasePanel } from '../components/TestcasePanel';

const difficultyClass = (d) => (d ? d.toLowerCase() : 'easy');

export function ProblemWorkspace() {
  const { slug } = useParams();
  const { user } = useAuth();

  const [problem, setProblem] = useState(null);
  const [language, setLanguage] = useState('JavaScript');
  const [code, setCode] = useState(STARTER_TEMPLATES['JavaScript']);
  const [customInput, setCustomInput] = useState('');
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

  // Run Code against Custom Input
  const handleRunCode = async () => {
    setActiveTab('results');
    setJudgeState({
      status: 'running_custom',
      message: 'Running code in Docker sandbox container...',
      verdict: 'Running',
      percent: 50,
      customResult: null
    });

    try {
      const { data } = await api.post('/judge/run', {
        language,
        sourceCode: code,
        customInput
      });

      setJudgeState({
        status: 'completed',
        message: data.timedOut
          ? 'Time Limit Exceeded (3000 ms)'
          : data.code === 0
          ? 'Run Finished Successfully'
          : 'Program Exited With Error',
        verdict: data.timedOut ? 'Time Limit Exceeded' : data.code === 0 ? 'Success' : 'Error',
        runtimeMs: data.runtimeMs,
        customResult: data
      });
    } catch (e) {
      setJudgeState({
        status: 'failed',
        message: e.response?.data?.message || 'Execution failed.',
        verdict: 'Error'
      });
    }
  };

  // Submit Solution against hidden judge tests with SSE
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

  return (
    <div className="workspace">
      {/* Left Statement Pane */}
      <article className="statement">
        <Link className="back" to="/problems">
          ← All problems
        </Link>
        <div className={`difficulty ${difficultyClass(problem.difficulty)}`}>
          {problem.difficulty}
        </div>
        <h1>{problem.title}</h1>
        <p className="tags">{problem.tags}</p>
        <p>{problem.description}</p>

        {problem.input_format && (
          <>
            <h3>Input format</h3>
            <p>{problem.input_format}</p>
          </>
        )}

        {problem.output_format && (
          <>
            <h3>Output format</h3>
            <p>{problem.output_format}</p>
          </>
        )}

        {problem.example_input && (
          <div className="example">
            <b>Example input</b>
            <pre>{problem.example_input}</pre>
            <b>Example output</b>
            <pre>{problem.example_output}</pre>
          </div>
        )}
      </article>

      {/* Right Monaco Editor + Testcase/Results Pane */}
      <aside className="editor-pane">
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

        <TestcasePanel
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          customInput={customInput}
          setCustomInput={setCustomInput}
          judgeState={judgeState}
          history={history}
          onRunCode={handleRunCode}
          onSubmit={handleSubmit}
          isLoggedIn={Boolean(user)}
        />
      </aside>
    </div>
  );
}

