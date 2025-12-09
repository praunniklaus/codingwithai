import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve repo root relative to this script.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// Build interpreter preference
// API server needs FastAPI which is only installed in WSL/Linux venv
const isWin = process.platform === 'win32';

const wslPref = [
  'wsl',  // Will invoke Python through WSL
];

const linuxPref = [
  path.join(repoRoot, '.venv-wsl', 'bin', 'python'),
  path.join(repoRoot, '.venv', 'bin', 'python'),
  'python3',
  'python',
];

const winPref = [
  path.join(repoRoot, '.venv', 'Scripts', 'python.exe'),
  path.join(repoRoot, '.venv', 'Scripts', 'python'),
  'python',
];

// Always prefer WSL on Windows for API server (FastAPI is installed there)
const candidates = isWin
  ? wslPref
  : linuxPref;

let pythonCmd = candidates.find((cmd) => existsSync(cmd)) || candidates[candidates.length - 1];
let pythonArgs = ['scripts/run_api_server.py', ...process.argv.slice(2)];

// If using WSL command, adjust arguments and explicitly pass environment variables
if (pythonCmd === 'wsl') {
  // Load environment variables from .dev.vars if not already set
  const devVarsPath = path.join(repoRoot, '.dev.vars');
  const envVars = {};
  
  if (existsSync(devVarsPath)) {
    const content = readFileSync(devVarsPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        if (!process.env[key]) {
          envVars[key] = value;
        }
      }
    }
  }
  
  // Combine with existing environment variables
  const allEnvVars = { ...envVars, ...process.env };
  
  // Prepend environment variables to the command
  const envVarNames = [
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GROK_API_KEY',
    'XAI_API_KEY',
  ];
  
  const envSetters = envVarNames
    .filter(key => allEnvVars[key])
    .map(key => `${key}="${allEnvVars[key]}"`)
    .join(' ');
  
  // Convert Windows path to WSL path and activate venv before running
  const wslRepoPath = repoRoot.replace(/\\/g, '/').replace(/^([A-Z]):/, (_, drive) => `/mnt/${drive.toLowerCase()}`);
  const venvActivate = `source ${wslRepoPath}/.venv-wsl/bin/activate || source ${wslRepoPath}/.venv/bin/activate`;
  pythonArgs = ['bash', '-c', `cd ${wslRepoPath} && ${venvActivate} && ${envSetters} python3 ${pythonArgs.join(' ')}`];
}

const result = spawnSync(pythonCmd, pythonArgs, {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error(`Failed to launch python via ${pythonCmd}:`, result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
