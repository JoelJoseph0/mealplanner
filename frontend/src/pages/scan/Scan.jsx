import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Camera, Check, ChefHat, ImagePlus, Keyboard, Lightbulb, RefreshCw, ScanLine, Sparkles } from 'lucide-react';
import { nutritionService, recognitionService } from '../../services';
import { getErrorMessage } from '../../services/api';
import { useAddToPantry, usePantry } from '../../lib/queries';
import { validateImageFile } from '../../utils/validators';
import { IngredientIcon } from '../../components/food/visuals';
import { Badge, Button, Card, Chip, Meter, PageHeader, useToast } from '../../components/ui';

const confidenceTone = (value) => (value >= 0.85 ? 'brand' : value >= 0.6 ? 'warn' : 'danger');
const confidenceLabel = (value) => (value >= 0.85 ? 'High confidence' : value >= 0.6 ? 'Medium confidence' : 'Low confidence');

export const Scan = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [added, setAdded] = useState([]);
  const [error, setError] = useState(null);

  const { data: pantry = [] } = usePantry();
  const addToPantry = useAddToPantry();
  const inKitchen = (name) => pantry.some((p) => p.name.toLowerCase() === (name || '').toLowerCase());

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  const nutrition = useQuery({
    queryKey: ['nutrition', selected?.food_id],
    queryFn: () => nutritionService.get(selected.food_id),
    enabled: Boolean(selected?.food_id),
  });

  const choose = (picked) => {
    if (!picked) return;
    const problem = validateImageFile(picked);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setResult(null);
    setSelected(null);
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setSelected(null);
    setError(null);
    setProgress(0);
  };

  const identify = async () => {
    setAnalysing(true);
    setError(null);
    try {
      const data = await recognitionService.predict(file, {
        addToPantry: false,
        onProgress: (event) => event.total && setProgress(Math.round((event.loaded * 100) / event.total)),
      });
      setResult(data);
      const top = data.food_id
        ? { name: data.food_name, food_id: data.food_id }
        : (data.candidates || []).find((c) => c.food_id) || null;
      setSelected(top ? { name: top.name, food_id: top.food_id } : null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAnalysing(false);
    }
  };

  const add = async () => {
    if (!selected) return;
    try {
      await addToPantry.mutateAsync({ names: [selected.name] });
      setAdded((current) => (current.includes(selected.name) ? current : [...current, selected.name]));
      toast.success(`${selected.name} added to your kitchen`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const confident = result?.food_id && !result.is_low_confidence;
  const alternatives = (result?.candidates || []).filter((c) => c.food_id);
  const qualityTips = result?.quality?.warnings || [];
  const macros = nutrition.data;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Scan an ingredient"
        emoji="📸"
        description="Photograph a vegetable, fruit or egg and we will identify it, then add it to your kitchen."
      />

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm font-medium text-danger" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {!preview ? (
        <Card
          className={`border-2 border-dashed py-8 text-center transition-colors ${dragging ? 'border-brand bg-brand-soft' : 'hover:border-brand/40'}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            choose(e.dataTransfer.files?.[0]);
          }}
        >
          <div className="relative mx-auto my-6 h-36 w-36">
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-soft to-saffron-soft" aria-hidden="true" />
            <span className="absolute inset-3 rounded-full border-2 border-dashed border-brand/30" aria-hidden="true" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-[#2bb673] text-white shadow-glow">
                <ScanLine className="h-8 w-8" aria-hidden="true" />
              </span>
            </span>
            <span className="absolute -left-2 top-2 text-3xl animate-float" aria-hidden="true">🍅</span>
            <span className="absolute -right-3 top-8 text-3xl animate-float [animation-delay:1.5s]" aria-hidden="true">🥚</span>
            <span className="absolute bottom-0 left-4 text-3xl animate-float [animation-delay:3s]" aria-hidden="true">🥕</span>
          </div>
          <h2 className="text-2xl font-semibold text-fg">Add a photo</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">One ingredient at a time, in good light, against a plain background works best.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button size="lg" icon={Camera} onClick={() => cameraRef.current?.click()}>
              Take a photo
            </Button>
            <Button size="lg" variant="secondary" icon={ImagePlus} onClick={() => galleryRef.current?.click()}>
              Choose from gallery
            </Button>
          </div>
          <p className="mt-4 text-xs text-subtle">or drag and drop an image here. JPG, PNG or WebP, up to 10 MB.</p>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
          <input ref={galleryRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="grid sm:grid-cols-2">
            <div className="relative aspect-square bg-surface-2 sm:aspect-auto sm:min-h-72">
              <img src={preview} alt="Selected ingredient" className="h-full w-full object-cover" />
              {analysing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 text-white">
                  <RefreshCw className="h-8 w-8 animate-spin" aria-hidden="true" />
                  <p className="font-semibold">{progress < 100 ? `Uploading ${progress}%` : 'Identifying...'}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col p-5">
              {!result ? (
                <>
                  <h2 className="text-xl font-semibold text-fg">Ready to identify</h2>
                  <p className="mt-1 text-sm text-muted">We will compare your photo with 28 common ingredients.</p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-6">
                    <Button icon={Sparkles} loading={analysing} onClick={identify}>
                      Identify ingredient
                    </Button>
                    <Button variant="ghost" onClick={reset} disabled={analysing}>
                      Choose another
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    {selected && <IngredientIcon name={selected.name} size="lg" />}
                    <div className="min-w-0">
                      <p className="text-sm text-muted">
                        {!confident ? 'We are not sure. Is it one of these?' : result.is_ambiguous ? 'This could be' : 'This looks like'}
                      </p>
                      <h2 className="text-3xl font-semibold text-fg">{selected ? selected.name : 'Unknown ingredient'}</h2>
                    </div>
                  </div>

                  {result.food_id && (
                    <div className="mt-3">
                      <Badge tone={confidenceTone(result.confidence)}>
                        {confidenceLabel(result.confidence)} · {Math.round(result.confidence * 100)}%
                      </Badge>
                      <Meter value={result.confidence * 100} max={100} tone={result.confidence >= 0.85 ? 'brand' : 'accent'} className="mt-2" />
                    </div>
                  )}

                  {result.is_ambiguous && confident && alternatives.length > 1 && (
                    <p className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-fg" role="status">
                      {result.message}
                    </p>
                  )}

                  {qualityTips.length > 0 && (!confident || result.is_ambiguous || result.confidence < 0.85) && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-info-soft p-3 text-sm text-fg">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
                      <div>
                        <p className="font-semibold">For a better result</p>
                        <ul className="mt-0.5 list-disc pl-4 text-muted">
                          {qualityTips.map((tip) => (
                            <li key={tip}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {alternatives.length > 1 && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-semibold text-fg">Not right? Pick the correct one</p>
                      <div className="flex flex-wrap gap-2">
                        {alternatives.map((c) => (
                          <Chip key={c.name} active={selected?.name === c.name} onClick={() => setSelected({ name: c.name, food_id: c.food_id })}>
                            {c.name} {Math.round(c.confidence * 100)}%
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}

                  {macros && selected && (
                    <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
                      {[
                        ['kcal', macros.calories],
                        ['Protein', `${macros.protein}g`],
                        ['Carbs', `${macros.carbohydrates}g`],
                        ['Fat', `${macros.fat}g`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-surface-2 p-2">
                          <dd className="font-bold text-fg">{value}</dd>
                          <dt className="text-xs text-subtle">{label}</dt>
                        </div>
                      ))}
                    </dl>
                  )}
                  {macros && selected && <p className="mt-1.5 text-xs text-subtle">Per {macros.serving_size || '100g'}</p>}

                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    {selected && (
                      inKitchen(selected.name) || added.includes(selected.name) ? (
                        <Badge tone="brand" icon={Check} className="px-3 py-2 text-sm">
                          In your kitchen
                        </Badge>
                      ) : (
                        <Button icon={Check} loading={addToPantry.isPending} onClick={add}>
                          Add {selected.name} to kitchen
                        </Button>
                      )
                    )}
                    <Button variant="secondary" icon={RefreshCw} onClick={reset}>
                      Scan another
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {result && selected && (
        <div className="mt-6">
          {confident && result.recommended_recipes?.length > 0 && selected.name === result.food_name ? (
            <Card>
              <h3 className="font-bold text-fg">Recipes using {selected.name}</h3>
              <ul className="mt-3 divide-y divide-line">
                {result.recommended_recipes.map((recipe) => (
                  <li key={recipe.id}>
                    <Link to={`/recipes/${recipe.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-brand">
                      <span className="font-semibold text-fg">{recipe.name}</span>
                      <Badge tone={recipe.pantry_match?.status === 'ready' ? 'brand' : 'warn'}>
                        {recipe.pantry_match?.status === 'ready'
                          ? 'Ready to cook'
                          : `Need ${recipe.pantry_match?.missing?.length ?? 0} more`}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Button variant="soft" icon={ChefHat} onClick={() => navigate('/cook', { state: { ingredients: [selected.name] } })}>
              See recipes with {selected.name}
            </Button>
          )}
        </div>
      )}

      {added.length > 0 && (
        <Card className="mt-6">
          <h3 className="font-bold text-fg">Added this session</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {added.map((name) => (
              <Chip key={name} active>
                {name}
              </Chip>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button to="/cook" icon={ChefHat}>
              What can I cook?
            </Button>
            <Button variant="secondary" to="/pantry">
              Open my kitchen
            </Button>
          </div>
        </Card>
      )}

      <p className="mt-8 text-center text-sm text-muted">
        Prefer typing?{' '}
        <Link to="/pantry" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
          <Keyboard className="h-4 w-4" aria-hidden="true" />
          Add ingredients by name
        </Link>
      </p>
    </div>
  );
};

export default Scan;
