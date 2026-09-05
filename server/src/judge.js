// Code execution via Judge0 CE API (https://ce.judge0.com)
// Free, public, no authentication required, specialized for online judge execution.

const JUDGE0_URL = 'https://ce.judge0.com/submissions?wait=true';
const TIME_LIMIT_SECONDS = 5.0;
const MAX_OUTPUT_BYTES = 64 * 1024;

const LANGUAGES = {
  JavaScript: { id: 97,  name: 'JavaScript (Node.js 20.17.0)', compile: false, baseMemory: 32.4 },
  Python:     { id: 100, name: 'Python (3.12.5)',              compile: false, baseMemory: 15.6 },
  'C++':      { id: 105, name: 'C++ (GCC 14.1.0)',             compile: true,  baseMemory: 4.2  },
  Java:       { id: 91,  name: 'Java (JDK 17.0.6)',            compile: true,  baseMemory: 46.8 }
};

export const supportedLanguages = Object.keys(LANGUAGES);

function normalize(value) {
  return String(value || '').trim().replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n');
}

/**
 * Calls Judge0 CE API synchronously with ?wait=true
 * Returns: { stdout, stderr, code, timedOut, outputExceeded, compileFailed, runtimeMs, memoryMb }
 */
async function runJudge0(config, sourceCode, input) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  let response;
  try {
    response = await fetch(JUDGE0_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language_id: config.id,
        source_code: sourceCode,
        stdin: input || '',
        cpu_time_limit: TIME_LIMIT_SECONDS
      }),
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return { stdout: '', stderr: '', code: 1, timedOut: true, outputExceeded: false, compileFailed: false, runtimeMs: 5000, memoryMb: config.baseMemory };
    }
    throw new Error(`Judge0 API unreachable: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Judge0 API returned HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const statusId = data.status?.id || 0;

  const stdout = data.stdout || '';
  const stderr = (data.stderr || '').trim();
  const compileOutput = (data.compile_output || '').trim();
  const timedOut = statusId === 5;
  const compileFailed = statusId === 6;
  const isRuntimeError = statusId >= 7 && statusId <= 14;

  const runtimeMs = data.time != null ? Math.max(1, Math.round(Number(data.time) * 1000)) : 10;
  const memoryMb = data.memory != null ? Number((Number(data.memory) / 1024).toFixed(1)) : config.baseMemory;

  const outputExceeded = Buffer.byteLength(stdout) > MAX_OUTPUT_BYTES;
  const code = (statusId === 3) ? 0 : 1;
  const effectiveStderr = compileFailed ? compileOutput : (stderr || (isRuntimeError ? (data.message || data.status?.description || 'Runtime error') : ''));

  return {
    stdout,
    stderr: effectiveStderr,
    code,
    timedOut,
    outputExceeded,
    compileFailed,
    runtimeMs,
    memoryMb
  };
}

/** Runs a supported language against hidden tests with progress callbacks and deep diagnostic metrics. */
export async function judgeSubmission(language, sourceCode, tests, onProgress) {
  const config = LANGUAGES[language];
  if (!config) {
    const error = new Error('Unsupported programming language.');
    error.code = 'UNSUPPORTED_LANGUAGE';
    throw error;
  }

  if (config.compile && onProgress) {
    onProgress({ state: 'compiling', message: `Compiling ${language} code...`, percent: 5 });
  }

  let passedTests = 0;
  const testResults = [];
  let peakMemory = config.baseMemory || 20.0;
  let accumulatedRuntime = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const testNum = i + 1;
    const total = tests.length;

    if (onProgress) {
      onProgress({
        state: 'running',
        message: `Running test case ${testNum} of ${total}...`,
        testIndex: testNum,
        totalTests: total,
        percent: Math.round((i / total) * 100)
      });
    }

    const result = await runJudge0(config, sourceCode, test.input_data);
    const caseRuntimeMs = result.runtimeMs || 10;
    const caseMemoryMb = result.memoryMb || config.baseMemory;
    accumulatedRuntime += caseRuntimeMs;
    if (caseMemoryMb > peakMemory) peakMemory = caseMemoryMb;

    if (result.timedOut) {
      testResults.push({ testIndex: testNum, status: 'Time Limit Exceeded', runtimeMs: caseRuntimeMs, memoryMb: caseMemoryMb, isSample: Boolean(test.is_sample) });
      return { verdict: 'Time Limit Exceeded', runtimeMs: accumulatedRuntime, memoryMb: peakMemory, passedTests, totalTests: total, detail: `Time limit exceeded on test case #${testNum}.`, testResults };
    }

    if (result.outputExceeded) {
      testResults.push({ testIndex: testNum, status: 'Output Limit Exceeded', runtimeMs: caseRuntimeMs, memoryMb: caseMemoryMb, isSample: Boolean(test.is_sample) });
      return { verdict: 'Output Limit Exceeded', runtimeMs: accumulatedRuntime, memoryMb: peakMemory, passedTests, totalTests: total, detail: `Output limit exceeded on test case #${testNum}.`, testResults };
    }

    if (result.compileFailed || result.code !== 0) {
      const detail = result.stderr || 'The program ended with an error.';
      const verdictName = result.compileFailed ? 'Compilation Error' : 'Runtime Error';
      testResults.push({ testIndex: testNum, status: verdictName, runtimeMs: caseRuntimeMs, memoryMb: caseMemoryMb, isSample: Boolean(test.is_sample) });
      return { verdict: verdictName, runtimeMs: accumulatedRuntime, memoryMb: peakMemory, passedTests, totalTests: total, detail, testResults };
    }

    if (normalize(result.stdout) !== normalize(test.expected_output)) {
      testResults.push({ testIndex: testNum, status: 'Wrong Answer', runtimeMs: caseRuntimeMs, memoryMb: caseMemoryMb, isSample: Boolean(test.is_sample) });
      return { verdict: 'Wrong Answer', runtimeMs: accumulatedRuntime, memoryMb: peakMemory, passedTests, totalTests: total, detail: `Wrong answer on test case #${testNum}.`, testResults };
    }

    testResults.push({ testIndex: testNum, status: 'Passed', runtimeMs: caseRuntimeMs, memoryMb: caseMemoryMb, isSample: Boolean(test.is_sample) });
    passedTests++;
  }

  return {
    verdict: 'Accepted',
    runtimeMs: accumulatedRuntime,
    memoryMb: peakMemory,
    passedTests,
    totalTests: tests.length,
    detail: `All ${tests.length} test case(s) passed.`,
    testResults
  };
}

/** Runs a code snippet against a single custom input without saving. */
export async function runCustomCode(language, sourceCode, customInput) {
  const config = LANGUAGES[language];
  if (!config) {
    const error = new Error('Unsupported programming language.');
    error.code = 'UNSUPPORTED_LANGUAGE';
    throw error;
  }

  const result = await runJudge0(config, sourceCode, customInput || '');
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    code: result.code,
    timedOut: result.timedOut,
    outputExceeded: result.outputExceeded,
    runtimeMs: result.runtimeMs,
    memoryMb: result.memoryMb
  };
}
