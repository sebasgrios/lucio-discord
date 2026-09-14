import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ProcessRunner {
  run(command: string, args: string[], timeoutMs?: number): Promise<RunResult>;
  spawn(command: string, args: string[]): ChildProcessWithoutNullStreams;
}

export class NodeProcessRunner implements ProcessRunner {
  run(command: string, args: string[], timeoutMs = 30_000): Promise<RunResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { windowsHide: true });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`${command} superó el tiempo máximo.`));
      }, timeoutMs);
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => (stdout += chunk));
      child.stderr.on('data', (chunk: string) => (stderr += chunk));
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: code ?? -1 });
      });
    });
  }

  spawn(command: string, args: string[]): ChildProcessWithoutNullStreams {
    return spawn(command, args, { windowsHide: true });
  }
}
