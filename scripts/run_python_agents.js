import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve repo root relative to this script.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// Build interpreter preference; allow forcing Linux/WSL paths when sandboxing is required.
const isWin = process.platform === 'win32';
const forceSandbox = process.env.FORCE_JOB_SANDBOX === 'true';
const useSandbox = process.env.USE_SANDBOX === 'true';

// When sandbox is requested on Windows, use WSL Python via wsl command
const wslPref = [
  'wsl',  // Will invoke Python through WSL
];

const linuxPref = [
  path.join(repoRoot, '.venv-wsl', 'bin', 'python'), // dedicated WSL/Linux venv
  path.join(repoRoot, '.venv', 'bin', 'python'), // Linux venv at default path
  'python3',
  'python',
];

const winPref = [
  path.join(repoRoot, '.venv', 'Scripts', 'python.exe'),
  path.join(repoRoot, '.venv', 'Scripts', 'python'),
  'python',
];

// If sandbox is enabled and we're on Windows, prefer WSL
const candidates = (isWin && (forceSandbox || useSandbox))
  ? wslPref
  : forceSandbox
    ? [...linuxPref, ...winPref]
    : isWin
      ? winPref
      : linuxPref;

let pythonCmd = candidates.find((cmd) => existsSync(cmd)) || candidates[candidates.length - 1];
let pythonArgs = ['scripts/run_job_agents.py', ...process.argv.slice(2)];

// If using WSL command, adjust arguments and explicitly pass environment variables
if (pythonCmd === 'wsl') {
  // WSL needs environment variables passed via WSLENV or set inline
  // Prepend environment variables to the command
  const envVars = [
    'USE_SANDBOX',
    'FORCE_JOB_SANDBOX',
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GROK_API_KEY',
    'XAI_API_KEY',
    'TARGET_USER_ID',
  ];
  
  const envSetters = envVars
    .filter(key => process.env[key])
    .map(key => `${key}="${process.env[key]}"`)
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
