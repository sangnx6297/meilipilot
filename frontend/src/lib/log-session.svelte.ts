import { openStream } from './api/stream';
import { appendLogChunk } from './experimental';
import { isLogLevel, type LogLevel, type LogMode } from './log-session';

class LogSession {
  text = $state('');
  live = $state(false);
  detached = $state(false);
  error = $state('');
  level = $state<LogLevel>('info');
  mode = $state<LogMode>('human');
  private stopStream = () => {};

  private closeSocket() {
    this.stopStream();
    this.stopStream = () => {};
    this.live = false;
  }

  stop() {
    this.closeSocket();
    this.detached = false;
  }

  start() {
    this.closeSocket();
    this.text = '';
    this.error = '';
    this.live = true;
    this.stopStream = openStream(
      'logs',
      'POST',
      '/logs/stream',
      { target: this.level, mode: this.mode },
      (chunk) => {
        this.text = appendLogChunk(this.text, chunk, 2000);
        if (chunk.includes('[error]')) {
          this.error = chunk.trim();
          this.closeSocket();
        }
      }
    );
  }

  setLevel(value: string) {
    if (!isLogLevel(value) || value === this.level) return;
    this.level = value;
    if (this.live) this.start();
  }

  setMode(value: LogMode) {
    if (value === this.mode) return;
    this.mode = value;
    if (this.live) this.start();
  }

  follow(path: string, livePage: boolean) {
    if (this.live && !livePage) this.detached = true;
    if (livePage) this.detached = false;
  }
}

export const logSession = new LogSession();
