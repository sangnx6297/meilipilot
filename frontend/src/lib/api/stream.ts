import { StartStream, StopStream } from '../../wailsjs/go/main/App';
import { EventsOn } from '../../wailsjs/wailsjs/runtime/runtime';

export function openStream(
  id: string,
  method: string,
  path: string,
  body: unknown | undefined,
  onChunk: (chunk: string) => void
): () => void {
  const off = EventsOn(`meili:stream:${id}`, (...data: unknown[]) => {
    onChunk(data.map((part) => String(part)).join(''));
  });
  const payload = body === undefined ? '' : JSON.stringify(body);
  void StartStream(id, method, path, payload).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : String(e);
    onChunk(`\n[error] ${message}\n`);
  });
  return () => {
    off();
    void StopStream(id);
  };
}
