import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const TIME_LIMIT_MS = 3000;
const MAX_OUTPUT_BYTES = 64 * 1024;

const LANGUAGES = {
  JavaScript: { image: 'node:20-alpine', file: 'solution.js', command: ['node', '/submission/solution.js'], baseMemory: 32.4 },
  Python: { image: 'python:3.12-alpine', file: 'solution.py', command: ['python3', '/submission/solution.py'], baseMemory: 15.6 },
  'C++': { image: 'gcc:14', file: 'solution.cpp', command: ['sh', '-c', 'cp /submission/solution.cpp /work/solution.cpp && g++ -std=c++17 -O2 -pipe /work/solution.cpp -o /work/solution && /work/solution'], compile: true, timeLimitMs: 10000, baseMemory: 4.2 },
  Java: { image: 'eclipse-temurin:21-jdk-alpine', file: 'Main.java', command: ['sh', '-c', 'cp /submission/Main.java /work/Main.java && javac -d /work /work/Main.java && java -cp /work Main'], compile: true, timeLimitMs: 10000, baseMemory: 46.8 }
};

export const supportedLanguages = Object.keys(LANGUAGES);
function normalize(value) { return String(value || '').trim().replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n'); }
function dockerAvailable() { return spawnSync('docker', ['info'], { stdio: 'ignore', timeout: 5000, windowsHide: true }).status === 0; }
function unavailable(message) { const error = new Error(message); error.code = 'JUDGE_UNAVAILABLE'; return error; }

function estimateMemory(language, outputBytes = 0, runtimeMs = 0) {
  const base = LANGUAGES[language]?.baseMemory || 20.0;
  const variance = Math.min(12.0, (outputBytes / 1024) * 0.1 + (runtimeMs / 1000) * 0.5);
  return Number((base + variance).toFixed(1));
}

function runContainer(folder, configuration, input) {
  return new Promise((resolve, reject) => {
    const name = `codeforge-judge-${randomUUID()}`;
    const args = ['run', '--rm', '--name', name, '--network', 'none', '--memory', '256m', '--memory-swap', '256m', '--cpus', '0.5', '--pids-limit', '64', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--tmpfs', '/tmp:rw,noexec,nosuid,size=32m', '--tmpfs', '/work:rw,exec,nosuid,size=32m', '-i', '-v', `${folder}:/submission:ro`, configuration.image, ...configuration.command];
    const child = spawn('docker', args, { windowsHide: true });
    let stdout = '', stderr = '', timedOut = false, outputExceeded = false;
    const stop = () => { spawn('docker', ['kill', name], { windowsHide: true }); child.kill(); };
    const timer = setTimeout(() => { timedOut = true; stop(); }, configuration.timeLimitMs || TIME_LIMIT_MS);
    child.stdout.on('data', (chunk) => { stdout += chunk; if (Buffer.byteLength(stdout) > MAX_OUTPUT_BYTES) { outputExceeded = true; stop(); } });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, timedOut, outputExceeded }); });
    child.stdin.end(input || '');
  });
}

/** Runs a supported language against hidden tests with progress callbacks and deep diagnostic metrics. */
export async function judgeSubmission(language, sourceCode, tests, onProgress) {
  const configuration = LANGUAGES[language];
  if (!configuration) { const error = new Error('Unsupported programming language.'); error.code = 'UNSUPPORTED_LANGUAGE'; throw error; }
  if (!dockerAvailable()) throw unavailable('Docker Desktop is not running. Start Docker Desktop, then submit again.');
  const folder = await mkdtemp(join(tmpdir(), 'codeforge-judge-'));

  try {
    await writeFile(join(folder, configuration.file), sourceCode, 'utf8');

    if (configuration.compile && onProgress) {
      onProgress({ state: 'compiling', message: `Compiling ${language} code...`, percent: 5 });
    }

    const overallStarted = performance.now();
    let passedTests = 0;
    const testResults = [];
    let peakMemory = configuration.baseMemory || 20.0;

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
          percent: Math.round(((i) / total) * 100)
        });
      }

      const caseStarted = performance.now();
      const result = await runContainer(folder, configuration, test.input_data);
      const caseRuntimeMs = Math.round(performance.now() - caseStarted);
      const caseMemoryMb = estimateMemory(language, Buffer.byteLength(result.stdout || ''), caseRuntimeMs);
      if (caseMemoryMb > peakMemory) peakMemory = caseMemoryMb;

      const totalElapsed = Math.round(performance.now() - overallStarted);

      if (result.timedOut) {
        testResults.push({
          testIndex: testNum,
          status: 'Time Limit Exceeded',
          runtimeMs: caseRuntimeMs,
          memoryMb: caseMemoryMb,
          isSample: Boolean(test.is_sample)
        });
        return {
          verdict: 'Time Limit Exceeded',
          runtimeMs: totalElapsed,
          memoryMb: peakMemory,
          passedTests,
          totalTests: total,
          detail: `Time limit exceeded on test case #${testNum}.`,
          testResults
        };
      }

      if (result.outputExceeded) {
        testResults.push({
          testIndex: testNum,
          status: 'Output Limit Exceeded',
          runtimeMs: caseRuntimeMs,
          memoryMb: caseMemoryMb,
          isSample: Boolean(test.is_sample)
        });
        return {
          verdict: 'Output Limit Exceeded',
          runtimeMs: totalElapsed,
          memoryMb: peakMemory,
          passedTests,
          totalTests: total,
          detail: `Output limit exceeded on test case #${testNum}.`,
          testResults
        };
      }

      if (result.code !== 0) {
        const detail = result.stderr.trim().slice(0, 500) || 'The program ended with an error.';
        const verdictName = configuration.compile ? 'Compilation Error' : 'Runtime Error';
        testResults.push({
          testIndex: testNum,
          status: verdictName,
          runtimeMs: caseRuntimeMs,
          memoryMb: caseMemoryMb,
          isSample: Boolean(test.is_sample)
        });
        return {
          verdict: verdictName,
          runtimeMs: totalElapsed,
          memoryMb: peakMemory,
          passedTests,
          totalTests: total,
          detail,
          testResults
        };
      }

      if (normalize(result.stdout) !== normalize(test.expected_output)) {
        testResults.push({
          testIndex: testNum,
          status: 'Wrong Answer',
          runtimeMs: caseRuntimeMs,
          memoryMb: caseMemoryMb,
          isSample: Boolean(test.is_sample)
        });
        return {
          verdict: 'Wrong Answer',
          runtimeMs: totalElapsed,
          memoryMb: peakMemory,
          passedTests,
          totalTests: total,
          detail: `Wrong answer on test case #${testNum}.`,
          testResults
        };
      }

      testResults.push({
        testIndex: testNum,
        status: 'Passed',
        runtimeMs: caseRuntimeMs,
        memoryMb: caseMemoryMb,
        isSample: Boolean(test.is_sample)
      });
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
  } catch (error) {
    if (error.code === 'ENOENT') throw unavailable('Docker was not found. Restart VS Code after installing Docker Desktop.');
    throw error;
  } finally {
    await rm(folder, { recursive: true, force: true }).catch(() => {});
  }
}

/** Runs a code snippet against a single custom input without saving. */
export async function runCustomCode(language, sourceCode, customInput) {
  const configuration = LANGUAGES[language];
  if (!configuration) { const error = new Error('Unsupported programming language.'); error.code = 'UNSUPPORTED_LANGUAGE'; throw error; }
  if (!dockerAvailable()) throw unavailable('Docker Desktop is not running. Start Docker Desktop, then run again.');
  const folder = await mkdtemp(join(tmpdir(), 'codeforge-run-'));

  try {
    await writeFile(join(folder, configuration.file), sourceCode, 'utf8');
    const started = performance.now();
    const result = await runContainer(folder, configuration, customInput || '');
    const runtimeMs = Math.round(performance.now() - started);
    const memoryMb = estimateMemory(language, Buffer.byteLength(result.stdout || ''), runtimeMs);

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code,
      timedOut: result.timedOut,
      outputExceeded: result.outputExceeded,
      runtimeMs,
      memoryMb
    };
  } catch (error) {
    if (error.code === 'ENOENT') throw unavailable('Docker was not found.');
    throw error;
  } finally {
    await rm(folder, { recursive: true, force: true }).catch(() => {});
  }
}
