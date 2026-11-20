import readline from 'node:readline';
import { GarminAuth, GarminLoginRejected } from './client';

// For programs that manage sign-in for someone: one JSON object per line on stdout.
// {"status":"code"} means write the one-time code as a line on stdin.
// It ends with {"status":"ok","token":"..."}, {"status":"rejected"} or {"status":"unavailable"}.
// The password comes from the environment, and nothing is written to disk.

const GIVE_UP_MS = 6 * 60 * 1000;

function send(message: Record<string, string>): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function finish(message: Record<string, string>): never {
  send(message);
  process.exit(0);
}

const email = process.env.GARMIN_EMAIL;
const password = process.env.GARMIN_PASSWORD;
delete process.env.GARMIN_PASSWORD;

if (!email || !password) finish({ status: 'rejected' });

setTimeout(() => finish({ status: 'unavailable' }), GIVE_UP_MS);

const lines = readline.createInterface({ input: process.stdin });
lines.on('close', () => process.exit(0));

function askForCode(): Promise<string> {
  return new Promise((resolve) => {
    lines.once('line', (line) => resolve(line.trim()));
    send({ status: 'code' });
  });
}

const auth = new GarminAuth(email!, password!, askForCode, { mode: 'login' });

auth
  .request('/userprofile-service/socialProfile')
  .then(() => finish({ status: 'ok', token: auth.exportToken() }))
  .catch((error: unknown) => finish({ status: error instanceof GarminLoginRejected ? 'rejected' : 'unavailable' }));
