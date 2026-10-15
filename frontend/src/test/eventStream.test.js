import { describe, it, expect, vi, afterEach } from 'vitest';
import { postEventStream } from '../lib/eventStream';

const streamOf = (chunks) => {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
};

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('postEventStream', () => {
  it('parses events that are split across network chunks', async () => {
    const payload = 'data: {"event":"token","text":"Hel"}\n\ndata: {"event":"token","text":"lo"}\n\ndata: {"event":"done"}\n\n';
    const cut = [payload.slice(0, 20), payload.slice(20, 55), payload.slice(55)];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, body: streamOf(cut) }));

    const seen = [];
    await postEventStream('/assistant/recipes/1/ask', { question: 'hi' }, { onEvent: (e) => seen.push(e) });
    expect(seen).toEqual([
      { event: 'token', text: 'Hel' },
      { event: 'token', text: 'lo' },
      { event: 'done' },
    ]);
  });

  it('sends the saved token and ignores malformed lines', async () => {
    localStorage.setItem('token', 'abc123');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: streamOf(['data: not json\n\n', 'data: {"event":"done"}\n\n']),
    });
    vi.stubGlobal('fetch', fetchMock);

    const seen = [];
    await postEventStream('/x', null, { onEvent: (e) => seen.push(e) });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc123');
    expect(seen).toEqual([{ event: 'done' }]);
  });

  it('raises the server message on errors and flags expired sessions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ detail: 'Recipe 9 not found' }) }));
    await expect(postEventStream('/x', null)).rejects.toThrow('Recipe 9 not found');

    const expired = vi.fn();
    window.addEventListener('auth:unauthorized', expired);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }));
    await expect(postEventStream('/x', null)).rejects.toThrow();
    expect(expired).toHaveBeenCalled();
    window.removeEventListener('auth:unauthorized', expired);
  });
});
