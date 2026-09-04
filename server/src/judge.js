// Code execution via Piston API (https://github.com/engineer-man/piston)
// No Docker required — runs fully in the cloud on Railway.

const PISTON_URL = 'https://emkc.org/api/v2/piston/execute';
const TIME_LIMIT_MS = 5000;
const MAX_OUTPUT_BYTES = 64 * 1024;

const LANGUAGES = {
  JavaScript: { pistonLang: 'javascript', pistonVersion: '*', file: 'solution.js',  baseMemory: 32.4 },
  Python:     { pistonLang: 'python',     pistonVersion: '*', file: 'solution.py',  baseMemory: 15.6 },
  'C++':      { pistonLang: 'c++',        pistonVersion: '*', file: 'solution.cpp', compile: true, baseMemory: 4.2  },
  Java:       { pistonLang: 'java',       pistonVersion: '*', file: 'Main.java',    compile: true, baseMemory: 46.8 }
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
 * Calls the Piston API to execute code.
 * Returns: { stdout, stderr, code, timedOut, outputExceeded, compileFailed }
 */
async function runPiston(config, sourceCode, input) {
  const response = await fetch(PISTON_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: config.pistonLang,
      version: config.pistonVersion,
      files: [{ name: config.file, content: sourceCode }],
      stdin: input || '',
      compile_timeout: 10000,
      run_timeout: TIME_LIMIT_MS,
      compile_memory_limit: -1,
      run_memory_limit: -1
    })
  });

  if (!response.ok) {
    throw new Error(`Piston API returned HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();

  // Compiled languages (C++, Java) — check for compilation errors first
  if (data.compile && data.compile.code !== 0) {
    return {
      stdout: '',
      stderr: (data.compile.stderr || data.compile.output || 'Compilation failed.').trim().slice(0, 500),
      code: data.compile.code,
      timedOut: false,
      outputExceeded: false,
      compileFailed: true
    };
  }

  const run = data.run || {};
  const stdout = run.stdout || '';
  const stderr = (run.stderr || '').trim();
  const code = run.code ?? 0;
  const timedOut = run.signal === 'SIGKILL' || String(run.output || '').toLowerCase().includes('timed out');
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
    const result = await runPiston(config, sourceCode, test.input_data);
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
  const result = await runPiston(config, sourceCode, customInput || '');
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
