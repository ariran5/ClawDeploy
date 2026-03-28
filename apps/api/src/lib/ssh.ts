import { Client } from 'ssh2';
import { SSH_TIMEOUT_MS } from '../config/constants.js';

interface SshConnectionParams {
  host: string;
  port: number;
  username: string;
  authMethod: 'password' | 'key';
  credential: string;
}

export function executeCommand(params: SshConnectionParams, command: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code: number) => {
          conn.end();
          resolve({ stdout, stderr, code: code ?? 0 });
        });

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
      });
    });

    conn.on('error', (err) => {
      reject(new Error(`SSH to ${params.host}:${params.port} failed: ${err.message}`));
    });

    const connectConfig: Record<string, unknown> = {
      host: params.host,
      port: params.port,
      username: params.username,
      readyTimeout: SSH_TIMEOUT_MS,
    };

    if (params.authMethod === 'password') {
      connectConfig.password = params.credential;
    } else {
      connectConfig.privateKey = params.credential;
    }

    conn.connect(connectConfig as Parameters<Client['connect']>[0]);
  });
}

export async function testConnection(params: SshConnectionParams): Promise<boolean> {
  try {
    const result = await executeCommand(params, 'echo ok');
    return result.stdout.trim() === 'ok';
  } catch {
    return false;
  }
}

export async function uploadFile(
  params: SshConnectionParams,
  remotePath: string,
  content: string,
): Promise<void> {
  // Use heredoc to write file content (single-quoted delimiter disables expansion)
  await executeCommand(params, `mkdir -p $(dirname ${remotePath}) && cat > ${remotePath} << 'OPENCLAW_EOF'\n${content}\nOPENCLAW_EOF`);
}

export async function getServerHealth(params: SshConnectionParams) {
  const result = await executeCommand(params, `
    echo "CPU:$(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' 2>/dev/null || echo 0)"
    echo "MEM:$(free -b | awk '/Mem:/{printf "%d %d", $3, $2}')"
    echo "DISK:$(df -B1 / | awk 'NR==2{printf "%d %d", $3, $2}')"
    echo "UPTIME:$(cat /proc/uptime | awk '{print $1}')"
  `);

  const lines = result.stdout.split('\n');
  const getValue = (prefix: string) => lines.find(l => l.startsWith(prefix))?.slice(prefix.length) || '0';

  const memParts = getValue('MEM:').split(' ');
  const diskParts = getValue('DISK:').split(' ');

  return {
    cpuUsage: parseFloat(getValue('CPU:')) || 0,
    memoryUsage: parseInt(memParts[0]) || 0,
    memoryTotal: parseInt(memParts[1]) || 0,
    diskUsage: parseInt(diskParts[0]) || 0,
    diskTotal: parseInt(diskParts[1]) || 0,
    uptime: parseFloat(getValue('UPTIME:')) || 0,
  };
}
