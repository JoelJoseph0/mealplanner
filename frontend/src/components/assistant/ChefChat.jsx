import { useEffect, useRef, useState } from 'react';
import { ChefHat, Loader2, Send, Square, WifiOff } from 'lucide-react';
import { assistantService } from '../../services';
import { postEventStream } from '../../lib/eventStream';
import { useAssistantStatus } from '../../lib/useCookingGuide';

const suggestionsFor = (currentStep) =>
  [
    currentStep != null && 'Explain this step in more detail',
    'What can I use if I am missing an ingredient?',
    'How do I know when it is done?',
    'Can I make it less spicy?',
    'How should I store the leftovers?',
    'Can I make it ahead of time?',
  ]
    .filter(Boolean)
    .slice(0, 4);

const Dots = () => (
  <span className="inline-flex gap-1" aria-label="Chef is thinking" role="status">
    {[0, 1, 2].map((i) => (
      <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-subtle" style={{ animationDelay: `${i * 160}ms` }} />
    ))}
  </span>
);

export const ChefChat = ({ recipe, currentStep = null, className = '', autoFocus = false }) => {
  const { data: status } = useAssistantStatus(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [problem, setProblem] = useState(null);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);
  const slowTimer = useRef(null);

  useEffect(() => () => {
    abortRef.current?.abort();
    clearTimeout(slowTimer.current);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  const offline = status && status.available === false;
  const primedFor = useRef(null);

  useEffect(() => {
    if (status?.available && primedFor.current !== recipe.id) {
      primedFor.current = recipe.id;
      assistantService.prime(recipe.id).catch(() => null);
    }
  }, [status?.available, recipe.id]);

  const stop = () => {
    abortRef.current?.abort();
    setBusy(false);
    setSlow(false);
    clearTimeout(slowTimer.current);
  };

  const send = async (text) => {
    const question = text.trim();
    if (!question || busy) return;
    const history = messages
      .filter((m) => m.content)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    setProblem(null);
    setInput('');
    setMessages((current) => [...current, { role: 'user', content: question }, { role: 'assistant', content: '' }]);
    setBusy(true);
    setSlow(false);
    clearTimeout(slowTimer.current);
    slowTimer.current = setTimeout(() => setSlow(true), 8000);

    const controller = new AbortController();
    abortRef.current = controller;
    const append = (chunk) =>
      setMessages((current) => {
        const next = [...current];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, content: last.content + chunk };
        return next;
      });

    try {
      await postEventStream(
        `/assistant/recipes/${recipe.id}/ask`,
        { question, history, current_step: currentStep },
        {
          signal: controller.signal,
          onEvent: (event) => {
            if (event.event === 'token') {
              setSlow(false);
              append(event.text);
            } else if (event.event === 'unavailable' || event.event === 'error') {
              setProblem(event.reason || 'The assistant is not available right now.');
            }
          },
        }
      );
    } catch (error) {
      if (error.name !== 'AbortError') setProblem(error.message || 'Something went wrong.');
    } finally {
      clearTimeout(slowTimer.current);
      setBusy(false);
      setSlow(false);
      setMessages((current) => current.filter((m, i) => !(i === current.length - 1 && m.role === 'assistant' && !m.content)));
    }
  };

  const submit = (event) => {
    event.preventDefault();
    send(input);
  };

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {messages.length === 0 && (
          <div className="rounded-2xl bg-surface-2/70 p-4 text-sm text-muted">
            <p className="flex items-center gap-2 font-semibold text-fg">
              <ChefHat className="h-4 w-4 text-brand" aria-hidden="true" />
              Ask me anything about {recipe.name}
            </p>
            <p className="mt-1">Substitutions, timing, techniques, storing or changing the recipe. I know your allergies and what is in your kitchen.</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                message.role === 'user' ? 'rounded-br-md bg-brand text-brand-fg' : 'rounded-bl-md border border-line bg-surface text-fg'
              }`}
            >
              {message.content || <Dots />}
            </div>
          </div>
        ))}

        {busy && slow && (
          <p className="text-xs text-subtle">The assistant runs on your own computer, so the first answer can take a minute while the model loads.</p>
        )}
        {problem && (
          <p className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger" role="alert">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {problem}
          </p>
        )}
      </div>

      {offline ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-warn-soft p-3 text-sm text-fg">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
          Chef Assistant is offline: {status.reason || 'the language model is not running'}. Start Ollama with {status.model} to turn it on.
        </p>
      ) : (
        <>
          {messages.length === 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestionsFor(currentStep).map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => send(text)}
                  disabled={busy}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-left text-sm font-semibold text-muted shadow-card transition-all hover:-translate-y-px hover:border-brand/40 hover:text-fg disabled:opacity-50"
                >
                  {text}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={submit} className="mt-3 flex items-end gap-2">
            <textarea
              value={input}
              autoFocus={autoFocus}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              maxLength={500}
              placeholder="Ask about this recipe"
              aria-label="Ask the chef a question"
              className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-fg placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
            />
            {busy ? (
              <button
                type="button"
                onClick={stop}
                aria-label="Stop answering"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-fg hover:bg-surface-3"
              >
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={input.trim().length < 2}
                aria-label="Send question"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-fg shadow-glow transition-all hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            )}
          </form>
        </>
      )}
    </div>
  );
};

export default ChefChat;
