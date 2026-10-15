import { API_BASE_URL } from '../utils/constants';

const readError = async (response) => {
  try {
    const body = await response.json();
    if (typeof body.detail === 'string') return body.detail;
  } catch {
    return 'The request could not be completed.';
  }
  return 'The request could not be completed.';
};

export const postEventStream = async (path, body, { signal, onEvent } = {}) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new Error('Your session has expired.');
  }
  if (!response.ok) throw new Error(await readError(response));

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const flush = (chunk) => {
    chunk.split('\n').forEach((line) => {
      if (!line.startsWith('data: ')) return;
      try {
        onEvent?.(JSON.parse(line.slice(6)));
      } catch {
        return;
      }
    });
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      flush(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf('\n\n');
    }
  }
  if (buffer.trim()) flush(buffer);
};

export default postEventStream;
