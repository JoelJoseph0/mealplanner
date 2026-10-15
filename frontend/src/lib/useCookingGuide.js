import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { assistantService } from '../services';
import { postEventStream } from './eventStream';

export const useAssistantStatus = (warm = false) =>
  useQuery({
    queryKey: ['assistant', 'status', warm],
    queryFn: () => assistantService.status(warm),
    staleTime: 30_000,
    retry: 0,
  });

const INITIAL = { phase: 'idle', meta: null, steps: [], tips: [], reason: null };

export const useCookingGuide = (recipeId, { generate = false } = {}) => {
  const client = useQueryClient();
  const queryKey = ['guide', String(recipeId)];
  const base = useQuery({
    queryKey,
    queryFn: () => assistantService.guide(recipeId),
    enabled: Boolean(recipeId),
    staleTime: 60_000,
  });
  const [stream, setStream] = useState(INITIAL);
  const abortRef = useRef(null);
  const startedRef = useRef(false);

  const run = useCallback(
    async (refresh = false) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStream({ ...INITIAL, phase: 'writing' });
      try {
        await postEventStream(`/assistant/recipes/${recipeId}/guide/stream${refresh ? '?refresh=true' : ''}`, null, {
          signal: controller.signal,
          onEvent: (event) => {
            if (event.event === 'meta') {
              setStream((s) => ({ ...s, meta: event }));
            } else if (event.event === 'step') {
              setStream((s) => ({ ...s, steps: [...s.steps, event.step] }));
            } else if (event.event === 'tips') {
              setStream((s) => ({ ...s, tips: event.tips || [] }));
            } else if (event.event === 'done') {
              client.setQueryData(queryKey, (old) => ({ ...(old || {}), guide: event.guide }));
              setStream((s) => ({ ...s, phase: 'ready' }));
            } else if (event.event === 'unavailable' || event.event === 'error') {
              setStream((s) => ({ ...s, phase: event.event === 'unavailable' ? 'unavailable' : 'error', reason: event.reason }));
            }
          },
        });
        setStream((s) =>
          s.phase === 'writing' ? { ...s, phase: 'error', reason: 'The assistant could not finish the guide.' } : s
        );
      } catch (error) {
        if (error.name === 'AbortError') return;
        setStream((s) => ({ ...s, phase: 'error', reason: error.message }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipeId, client]
  );

  const guide = base.data?.guide;
  useEffect(() => {
    if (generate && guide && !guide.ai && !startedRef.current) {
      startedRef.current = true;
      run(false);
    }
  }, [generate, guide, run]);

  useEffect(() => () => abortRef.current?.abort(), []);

  let phase = 'loading';
  if (guide?.ai) phase = 'ready';
  else if (stream.phase !== 'idle') phase = stream.phase;
  else if (!base.isLoading) phase = 'basic';

  return {
    phase,
    guide: guide?.ai ? guide : null,
    fallback: guide && !guide.ai ? guide : null,
    personal: base.data?.personal || null,
    partial: stream,
    isLoading: base.isLoading,
    regenerate: () => run(true),
  };
};
