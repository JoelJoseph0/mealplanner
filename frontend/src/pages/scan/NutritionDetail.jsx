import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChefHat } from 'lucide-react';
import { nutritionService } from '../../services';
import { getErrorMessage } from '../../services/api';
import { usePreferences } from '../../lib/queries';
import { IngredientIcon } from '../../components/food/visuals';
import { Badge, Button, Card, ErrorState, Meter, Skeleton } from '../../components/ui';

export const NutritionDetail = () => {
  const { foodId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['nutrition', foodId],
    queryFn: () => nutritionService.get(foodId),
  });
  const { data: prefs } = usePreferences();

  if (isLoading) return <Skeleton className="mx-auto h-96 max-w-2xl" />;
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const targets = {
    calories: prefs?.daily_calories || 2000,
    protein: prefs?.protein_target || 75,
    carbs: prefs?.carbohydrate_target || 250,
    fat: prefs?.fat_target || 65,
  };
  const rows = [
    ['Protein', data.protein, targets.protein, 'brand'],
    ['Carbohydrates', data.carbohydrates, targets.carbs, 'accent'],
    ['Fat', data.fat, targets.fat, 'info'],
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <button type="button" onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
      </button>
      <Card>
        <div className="flex items-start gap-4">
          <IngredientIcon name={data.food_name} category={data.category} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-fg">{data.food_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {data.category && <Badge tone="brand">{data.category}</Badge>}
              <span className="text-sm text-muted">per {data.serving_size}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-surface-2 p-4">
          <p className="text-sm text-muted">Energy</p>
          <p className="text-3xl font-bold text-fg">
            {data.calories} <span className="text-lg font-semibold text-muted">kcal</span>
          </p>
          <p className="text-sm text-subtle">{Math.round((data.calories / targets.calories) * 100)}% of your daily target</p>
        </div>

        <div className="mt-6 space-y-4">
          {rows.map(([label, value, max, tone]) => (
            <div key={label}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-semibold text-fg">{label}</span>
                <span className="text-muted">
                  {value} g <span className="text-subtle">· {Math.round((value / max) * 100)}% of daily</span>
                </span>
              </div>
              <Meter value={value} max={max} tone={tone} />
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-xs text-subtle">Fibre</p>
            <p className="font-bold text-fg">{data.fiber} g</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-xs text-subtle">Sugar</p>
            <p className="font-bold text-fg">{data.sugar} g</p>
          </div>
        </div>

        <Button
          className="mt-6"
          icon={ChefHat}
          onClick={() => navigate('/cook', { state: { ingredients: [data.food_name] } })}
        >
          Recipes using {data.food_name}
        </Button>
      </Card>
    </div>
  );
};

export default NutritionDetail;
