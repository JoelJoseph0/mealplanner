import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  historyService,
  pantryService,
  planService,
  recipeService,
  shoppingService,
  userService,
} from '../services';

export const useProfile = () => useQuery({ queryKey: ['profile'], queryFn: userService.getProfile });
export const usePreferences = () => useQuery({ queryKey: ['preferences'], queryFn: userService.getPreferences });

export const useSaveProfile = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: userService.updateProfile,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['profile'] });
      client.invalidateQueries({ queryKey: ['preferences'] });
      client.invalidateQueries({ queryKey: ['plan'] });
    },
  });
};

export const useSavePreferences = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: userService.updatePreferences,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['preferences'] });
      client.invalidateQueries({ queryKey: ['suggest'] });
      client.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
};

export const usePantry = () => useQuery({ queryKey: ['pantry'], queryFn: pantryService.list });

const usePantryMutation = (fn) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['pantry'] });
      client.invalidateQueries({ queryKey: ['suggest'] });
    },
  });
};

export const useAddToPantry = () => usePantryMutation(pantryService.add);
export const useUpdatePantryItem = () => usePantryMutation(({ id, changes }) => pantryService.update(id, changes));
export const useRemovePantryItem = () => usePantryMutation(pantryService.remove);
export const useClearPantry = () => usePantryMutation(pantryService.clear);
export const useConsumeIngredients = () =>
  usePantryMutation(({ recipeId, foodIds }) => pantryService.consume(recipeId, foodIds));

export const useSuggestions = (params, enabled = true) =>
  useQuery({
    queryKey: ['suggest', params],
    queryFn: () => pantryService.suggest(params),
    enabled,
    placeholderData: (previous) => previous,
  });

export const useShopping = () => useQuery({ queryKey: ['shopping'], queryFn: shoppingService.list });

const useShoppingMutation = (fn, alsoPantry = false) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['shopping'] });
      if (alsoPantry) {
        client.invalidateQueries({ queryKey: ['pantry'] });
        client.invalidateQueries({ queryKey: ['suggest'] });
      }
    },
  });
};

export const useAddShopping = () => useShoppingMutation(({ names, quantity }) => shoppingService.add(names, quantity));
export const useShoppingFromRecipe = () => useShoppingMutation(shoppingService.fromRecipe);
export const useShoppingFromPlan = () =>
  useShoppingMutation(({ startDate, days }) => shoppingService.fromPlan(startDate, days));
export const useUpdateShopping = () => useShoppingMutation(({ id, changes }) => shoppingService.update(id, changes));
export const useRemoveShopping = () => useShoppingMutation(shoppingService.remove);
export const useClearShopping = () => useShoppingMutation((checkedOnly) => shoppingService.clear(checkedOnly));
export const useCheckoutShopping = () => useShoppingMutation(shoppingService.checkout, true);

export const useRecipes = (params = {}, enabled = true) =>
  useQuery({ queryKey: ['recipes', params], queryFn: () => recipeService.list(params), enabled });
export const useRecipe = (id) => useQuery({ queryKey: ['recipe', String(id)], queryFn: () => recipeService.get(id), enabled: Boolean(id) });
export const useRatings = () => useQuery({ queryKey: ['ratings'], queryFn: recipeService.ratings });

export const useRateRecipe = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, feedback }) => recipeService.rate(id, feedback),
    onMutate: async ({ id, feedback }) => {
      await client.cancelQueries({ queryKey: ['ratings'] });
      const previous = client.getQueryData(['ratings']);
      client.setQueryData(['ratings'], (current = {}) => {
        const next = { ...current };
        if (feedback) next[id] = feedback;
        else delete next[id];
        return next;
      });
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) client.setQueryData(['ratings'], context.previous);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['ratings'] });
      client.invalidateQueries({ queryKey: ['suggest'] });
    },
  });
};

export const useDay = (date) => useQuery({ queryKey: ['plan', 'day', date], queryFn: () => planService.daily(date) });
export const useWeek = (start) => useQuery({ queryKey: ['plan', 'week', start], queryFn: () => planService.weekly(start) });

const usePlanMutation = (fn) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['plan'] });
      client.invalidateQueries({ queryKey: ['history'] });
    },
  });
};

export const useGenerateDay = () => usePlanMutation(({ date, usePantry, force }) => planService.generateDay(date, { usePantry, force }));
export const useGenerateWeek = () => usePlanMutation(({ start, usePantry, force }) => planService.generateWeek(start, { usePantry, force }));
export const useSwapMeal = () => usePlanMutation(({ id, usePantry }) => planService.swap(id, usePantry));
export const useLockMeal = () => usePlanMutation(({ id, locked }) => planService.lock(id, locked));
export const useCompleteMeal = () => usePlanMutation(({ id, completed }) => planService.complete(id, completed));

export const useHistory = () => useQuery({ queryKey: ['history'], queryFn: () => historyService.list() });

export const useLogMeal = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: historyService.log,
    onSuccess: () => client.invalidateQueries({ queryKey: ['history'] }),
  });
};

export const useHistoryFeedback = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, feedback }) => historyService.feedback(id, feedback),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['history'] });
      client.invalidateQueries({ queryKey: ['ratings'] });
      client.invalidateQueries({ queryKey: ['suggest'] });
    },
  });
};
