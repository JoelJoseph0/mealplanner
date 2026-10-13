import { useState, useRef } from 'react';
import { UploadCloud, Camera, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import Button from '../common/Button';
import { validateImageFile } from '../../utils/validators';

export const ImageUploader = ({
  onImageSelected,
  onAnalyze,
  loading = false,
  uploadProgress = 0,
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleFile = (file) => {
    setError(null);
    if (!file) return;

    const validationErr = validateImageFile(file);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    if (onImageSelected) {
      onImageSelected(file, url);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onImageSelected) {
      onImageSelected(null, null);
    }
  };

  // Camera capture handlers
  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setIsCameraActive(true);
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 200);
    } catch (err) {
      setError('Camera access denied or camera not found on this device.');
      console.error(err);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera_capture_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        stopCamera();
        handleFile(file);
      }
    }, 'image/jpeg', 0.92);
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  return (
    <div className="w-full">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
      />

      {/* Hidden Canvas for Camera Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Live Modal / Stream View */}
      {isCameraActive ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" /> Live Ingredient Camera
            </span>
            <button
              type="button"
              onClick={stopCamera}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative aspect-video rounded-xl bg-black overflow-hidden my-3 flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={stopCamera}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Camera}
              onClick={capturePhoto}
              className="shadow-lg"
            >
              Capture Ingredient Photo
            </Button>
          </div>
        </div>
      ) : previewUrl ? (
        /* Image Preview Card */
        <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-hidden">
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
            <img
              src={previewUrl}
              alt="Selected Ingredient Preview"
              className="w-full h-full object-contain"
            />
            <button
              type="button"
              onClick={handleRemove}
              disabled={loading}
              className="absolute top-3 right-3 p-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-xl backdrop-blur-xs transition-colors cursor-pointer"
              title="Remove image"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-left w-full sm:w-auto">
              <p className="text-sm font-semibold text-slate-800 truncate max-w-xs">
                {selectedFile?.name}
              </p>
              <p className="text-xs text-slate-500">
                {(selectedFile?.size / (1024 * 1024)).toFixed(2)} MB • Ready for AI Computer Vision
              </p>
            </div>

            <div className="flex gap-2.5 w-full sm:w-auto justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRemove}
                disabled={loading}
              >
                Change Image
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={loading}
                onClick={() => onAnalyze && onAnalyze(selectedFile)}
              >
                Identify Ingredient
              </Button>
            </div>
          </div>

          {/* Upload Progress Bar if active */}
          {loading && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Uploading to AI Vision Server...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Drag and Drop Zone */
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all duration-200 text-center ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
              : 'border-slate-300 bg-white hover:border-emerald-400 hover:bg-slate-50/50'
          }`}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100/70 text-emerald-600 mb-4 shadow-xs">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h4 className="text-base font-bold text-slate-800 mb-1">
            Drag & Drop your ingredient photo here
          </h4>
          <p className="text-xs text-slate-500 mb-6 max-w-sm">
            Supported formats: JPG, JPEG, PNG, WEBP (Up to 10MB). Crisp, well-lit photos give the highest recognition accuracy.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="sm"
              icon={ImageIcon}
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Photo
            </Button>
            {navigator.mediaDevices && (
              <Button
                variant="secondary"
                size="sm"
                icon={Camera}
                onClick={startCamera}
              >
                Use Camera
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Validation Error Display */}
      {error && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs font-medium rounded-xl border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
