import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChefChat from '../components/assistant/ChefChat';

vi.mock('../services', () => ({
  assistantService: {
    status: vi.fn().mockResolvedValue({ available: false, model: 'qwen2.5:latest', reason: 'Ollama is not reachable' }),
    prime: vi.fn().mockResolvedValue({}),
  },
}));

const renderChat = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ChefChat recipe={{ id: 3, name: 'Tomato Rice' }} />
    </QueryClientProvider>
  );
};

describe('ChefChat', () => {
  it('shows what the assistant can do for the recipe', async () => {
    renderChat();
    expect(await screen.findByText(/Ask me anything about Tomato Rice/)).toBeInTheDocument();
  });

  it('explains how to turn the assistant on when Ollama is not reachable', async () => {
    renderChat();
    expect(await screen.findByText(/Chef Assistant is offline: Ollama is not reachable/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Ask the chef a question')).not.toBeInTheDocument();
  });
});
