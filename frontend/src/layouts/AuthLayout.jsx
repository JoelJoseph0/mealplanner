import { Outlet, Navigate, Link } from 'react-router-dom';
import { Camera, Sparkles, Activity, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const AuthLayout = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Branding Hero Section */}
        <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            MCA Final-Year Project
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Smart Meal Planner <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                Using Computer Vision
              </span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              Snap a food photo or upload an image to automatically recognize dishes, assess calorie counts, monitor macronutrients, and generate personalized dietary meal plans.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-800">AI Vision Engine</span>
                <span className="text-[11px] text-slate-500">Real-time dish prediction</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-800">Macro Tracking</span>
                <span className="text-[11px] text-slate-500">Target calorie balance</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>FastAPI REST Backend Architecture • Fast & Secure</span>
          </div>
        </div>

        {/* Right Auth Form Section */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-100">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
