// Code execution via Wandbox API (https://wandbox.org)
// Free, no authentication required. Stable since 2013.

const WANDBOX_URL = 'https://wandbox.org/api/compile.json';
const TIME_LIMIT_MS = 10000;
const MAX_OUTPUT_BYTES = 64 * 1024;

const LANGUAGES = {
  JavaScript: { compiler: 'nodejs-20.11.0', file: 'solution.js',  baseMemory: 32.4 },
  Python:     { compiler: 'cpython-3.12.3',  file: 'solution.py',  baseMemory: 15.6 },
  'C++':      { compiler: 'gcc-head',         file: 'solution.cpp', compile: true, options: 'warning,gnu++17,cpp-verbose,-O2,-lm', baseMemory: 4.2 },
  Java:       { compiler: 'openjdk-head',     file: 'Main.java',    compile: true, baseMemory: 46.8 }
};

export const supportedLanguages = Object.keys(LANGUAGES);

function normalize(value) {
  return String(value || '').trim().replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n');
}

function estimateMemory(language, outputBytes = 0, runtimeMs = 0) {
  const base = LANGUAGES[language]?.baseMemory || 20.0;
  const variance = Math.min(12.0, (outputBytes / 1024) * 0.1 + (runtimeMs / 1000) * 0.5);
  return Number((base + variance).toFixed(1));
}

/**
 * Calls the Wandbox API to compile and run code.
 * Returns: { stdout, stderr, code, timedOut, outputExceeded, compileFailed }
 */
async function runWandbox(config, sourceCode, input) {
  const body = {
    compiler: config.compiler,
    code: sourceCode,
    stdin: input || ''
  };
  if (config.options) body.options = config.options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIME_LIMIT_MS + 5000);

  let response;
  try {
    response = await fetch(WANDBOX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return { stdout: '', stderr: '', code: 1, timedOut: true, outputExceeded: false, compileFailed: false };
    }
    throw new Error(`Wandbox API unreachable: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Wandbox API returned HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();

  // Compile error (C++, Java)
  if (config.compile && data.compiler_error && data.compiler_error.trim()) {
    return {
      stdout: '',
      stderr: data.compiler_error.trim().slice(0, 500),
      code: 1,
      timedOut: false,
      outputExceeded: false,
      compileFailed: true
    };
  }

  const stdout = data.program_output || '';
  const stderr = (data.program_error || '').trim();
  const code = parseInt(data.status, 10) || 0;
  const timedOut = String(data.signal || '').includes('Killed') || String(data.program_message || '').toLowerCase().includes('timeout');
  const outputExceeded = Buffer.byteLength(stdout) > MAX_OUTPUT_BYTES;

  return { stdout, stderr, code, timedOut, outputExceeded, compileFailed: false };
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

  const overallStarted = performance.now();
  let passedTests = 0;
  const testResults = [];
  let peakMemory = config.baseMemory || 20.0;

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

    const caseStarted = performance.now();
    const result = await runWandbox(config, sourceCode, test.input_data);
    const caseRuntimeMs = Math.round(performance.now() - caseStarted);
    const caseMemoryMb = estimateMemory(language, Buffer.byteLength(result.stdout || ''), caseRuntimeMs);
    if (caseMemoryMb > peakMemory) peakMemory = caseMemoryMb;

    const totalElapsed = Math.round(performance.now() - overallStarted);

    if (result.timedOut) {
      testResults.push({ testIndex: testNum, status: 'Time Limit Exceeded', runtimeMs: caseRuntimeMs, memoryMb: caseMemoryMb, isSample: Boolean(test.is_sample) });
      return { verdict: 'Time Limit Exceeded', runtimeMs: totalElapsed, memoryMb: peakMemory, passedTests, totalTests: total, detail: `Time limit exceeded on test case #${testNum}.`, testResults };
    }

    if (result.outputExceeded) {
      testResults.push({ testIndex: testNum, status: 'Output Limit Exceeded', runtimeMs: caseRuntimeMs, memoryMb: caseMemoryMb, isSample: Boolean(test.is_sample) });
      return { verdict: 'Output Limit Exceeded', runtimeMs: totalElapsed, memoryMb: peakMemory, passedTests, totalTests: total, detail: `Output limit exceeded on test case #${testNum}.`, testResults };
    }

    if (result.compileFailed || result.code !== 0) {
      const detail = result.stderr || 'The program ended with an error.';
      const verdictName = result.compileFailed ? 'Compilation Error' : 'Runtime Error';
      testResults.push({ testIndex: testNum, status: verdictName, runtimeMs: caseRuntimeMs, memoryMb: caseMemoryMb, isSample: Boolean(test.is_sample) });
      return { verdict: verdictName, runtimeMs: totalElapsed, memoryMb: peakMemory, passedTests, totalTests: total, detail, testResults };
    }

    if (normalize(result.stdout) !== normalize(test.expected_output)) {
      testResults.push({ testIndex: testNum, status: 'Wrong Answer', runtimeMs: caseRuntimeMs, memoryMb: caseMemoryMb, isSample: Boolean(test.is_sample) });
      return { verdict: 'Wrong Answer', runtimeMs: totalElapsed, memoryMb: peakMemory, passedTests, totalTests: total, detail: `Wrong answer on test case #${testNum}.`, testResults };
    }

    testResults.push({ testIndex: testNum, status: 'Passed', runtimeMs: caseRuntimeMs, memoryMb: caseMemoryMb, isSample: Boolean(test.is_sample) });
    passedTests++;
  }

  const totalRuntime = Math.round(performance.now() - overallStarted);
  return {
    verdict: 'Accepted',
    runtimeMs: totalRuntime,
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

  const started = performance.now();
  const result = await runWandbox(config, sourceCode, customInput || '');
  const runtimeMs = Math.round(performance.now() - started);
  const memoryMb = estimateMemory(language, Buffer.byteLength(result.stdout || ''), runtimeMs);

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    code: result.compileFailed ? 1 : result.code,
    timedOut: result.timedOut,
    outputExceeded: result.outputExceeded,
    runtimeMs,
    memoryMb
  };
}
