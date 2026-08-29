import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const TIME_LIMIT_MS = 3000;
const MAX_OUTPUT_BYTES = 64 * 1024;

const LANGUAGES = {
  JavaScript: { image: 'node:20-alpine', file: 'solution.js', command: ['node', '/submission/solution.js'] },
  Python: { image: 'python:3.12-alpine', file: 'solution.py', command: ['python3', '/submission/solution.py'] },
  'C++': { image: 'gcc:14', file: 'solution.cpp', command: ['sh', '-c', 'cp /submission/solution.cpp /work/solution.cpp && g++ -std=c++17 -O2 -pipe /work/solution.cpp -o /work/solution && /work/solution'], compile: true },
  Java: { image: 'eclipse-temurin:21-jdk-alpine', file: 'Main.java', command: ['sh', '-c', 'cp /submission/Main.java /work/Main.java && javac -d /work /work/Main.java && java -cp /work Main'], compile: true }
};

export const supportedLanguages = Object.keys(LANGUAGES);
function normalize(value) { return String(value).trim().replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n'); }
function dockerAvailable() { return spawnSync('docker', ['info'], { stdio: 'ignore', timeout: 5000, windowsHide: true }).status === 0; }
function unavailable(message) { const error = new Error(message); error.code = 'JUDGE_UNAVAILABLE'; return error; }

function runContainer(folder, configuration, input) {
  return new Promise((resolve, reject) => {
    const name = `codeforge-judge-${randomUUID()}`;
    const args = ['run', '--rm', '--name', name, '--network', 'none', '--memory', '256m', '--memory-swap', '256m', '--cpus', '0.5', '--pids-limit', '64', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--tmpfs', '/tmp:rw,noexec,nosuid,size=32m', '--tmpfs', '/work:rw,nosuid,size=32m', '-i', '-v', `${folder}:/submission:ro`, configuration.image, ...configuration.command];
    const child = spawn('docker', args, { windowsHide: true });
    let stdout = '', stderr = '', timedOut = false, outputExceeded = false;
    const stop = () => { spawn('docker', ['kill', name], { windowsHide: true }); child.kill(); };
    const timer = setTimeout(() => { timedOut = true; stop(); }, TIME_LIMIT_MS);
    child.stdout.on('data', (chunk) => { stdout += chunk; if (Buffer.byteLength(stdout) > MAX_OUTPUT_BYTES) { outputExceeded = true; stop(); } });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, timedOut, outputExceeded }); });
    child.stdin.end(input);
  });
}

/** Runs a supported language against hidden tests in a restricted Docker container. */
export async function judgeSubmission(language, sourceCode, tests) {
  const configuration = LANGUAGES[language];
  if (!configuration) { const error = new Error('Unsupported programming language.'); error.code = 'UNSUPPORTED_LANGUAGE'; throw error; }
  if (!dockerAvailable()) throw unavailable('Docker Desktop is not running. Start Docker Desktop, then submit again.');
  const folder = await mkdtemp(join(tmpdir(), 'codeforge-judge-'));
  try {
    await writeFile(join(folder, configuration.file), sourceCode, 'utf8');
    const started = performance.now();
    for (const test of tests) {
      const result = await runContainer(folder, configuration, test.input_data);
      const runtimeMs = Math.round(performance.now() - started);
      if (result.timedOut) return { verdict: 'Time Limit Exceeded', runtimeMs };
      if (result.outputExceeded) return { verdict: 'Output Limit Exceeded', runtimeMs };
      if (result.code !== 0) {
        const detail = result.stderr.trim().slice(0, 500) || 'The program ended with an error.';
        return { verdict: configuration.compile ? 'Compilation Error' : 'Runtime Error', runtimeMs, detail };
      }
      if (normalize(result.stdout) !== normalize(test.expected_output)) return { verdict: 'Wrong Answer', runtimeMs };
    }
    return { verdict: 'Accepted', runtimeMs: Math.round(performance.now() - started) };
  } catch (error) {
    if (error.code === 'ENOENT') throw unavailable('Docker was not found. Restart VS Code after installing Docker Desktop.');
    throw error;
  } finally { await rm(folder, { recursive: true, force: true }); }
}
