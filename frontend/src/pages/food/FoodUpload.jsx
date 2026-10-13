import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, AlertCircle, Info, Keyboard } from 'lucide-react';
import ImageUploader from '../../components/food/ImageUploader';
import recognitionService from '../../services/recognitionService';
import { getErrorMessage } from '../../services/api';

export const FoodUpload = () => {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [addToPantry, setAddToPantry] = useState(true);
  const navigate = useNavigate();

  const handleAnalyze = async (file) => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setUploadProgress(10);

    try {
      const result = await recognitionService.predictFood(
        file,
        (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
        { addToPantry }
      );

      // Prepare local object URL for instant image display on recognition page
      const imagePreviewUrl = URL.createObjectURL(file);

      // Navigate to FoodRecognition with the prediction payload
      navigate('/food-recognition', {
        state: {
          prediction: result,
          imagePreview: imagePreviewUrl,
        },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center sm:text-left">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
          <Camera className="w-3.5 h-3.5" /> Computer Vision Engine
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Scan an Ingredient
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">
          Photograph a vegetable, fruit or egg from your kitchen. The model identifies it, adds it to your pantry, and shows recipes you can make with it.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Zone */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <ImageUploader
          onAnalyze={handleAnalyze}
          loading={loading}
          uploadProgress={uploadProgress}
        />
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={addToPantry}
            onChange={(e) => setAddToPantry(e.target.checked)}
            className="accent-emerald-600"
          />
          Add the recognised ingredient to my pantry automatically
        </label>
      </div>

      <button
        type="button"
        onClick={() => navigate('/pantry')}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-slate-300 text-xs font-semibold text-slate-600 hover:border-emerald-400 hover:text-emerald-700 cursor-pointer"
      >
        <Keyboard className="w-4 h-4" /> Prefer typing? Add ingredients to your pantry by name
      </button>

      {/* Helpful Tips Card */}
      <div className="rounded-2xl p-5 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 border border-emerald-100 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
          <Info className="w-4 h-4" /> Tips for Best Ingredient Recognition:
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
          <li>Photograph one ingredient at a time against a plain background.</li>
          <li>Use good natural light and keep the item centred and in focus.</li>
          <li>If the model is unsure it will suggest the closest matches for you to pick from.</li>
          <li>Supported formats: JPG, JPEG, PNG, WEBP up to 10MB.</li>
        </ul>
      </div>
    </div>
  );
};

export default FoodUpload;
