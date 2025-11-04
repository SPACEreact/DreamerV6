/**
 * Dual-Provider Image Generation Component
 * Provides UI for selecting providers, generating images, and comparing results
 */

import React, { useState, useEffect } from 'react';
import { 
  ImageRequest, 
  DualProviderRequest, 
  DualProviderResponse,
  ProviderId,
  HealthStatus,
  DualProviderProgress
} from '../types/imageGeneration';
import { dualProviderImageService } from '../services/dualProviderImageService';
import { Loader2, Check, X, AlertCircle, RefreshCw, ArrowLeftRight } from 'lucide-react';

interface DualProviderImageGenProps {
  onImageGenerated?: (response: DualProviderResponse) => void;
  className?: string;
}

export const DualProviderImageGeneration: React.FC<DualProviderImageGenProps> = ({
  onImageGenerated,
  className = ''
}) => {
  // State
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [providerA, setProviderA] = useState<ProviderId>('stable-diffusion-xl');
  const [providerB, setProviderB] = useState<ProviderId>('gemini');
  const [enableCrossValidation, setEnableCrossValidation] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<DualProviderProgress | null>(null);
  const [result, setResult] = useState<DualProviderResponse | null>(null);
  const [providerHealth, setProviderHealth] = useState<Map<ProviderId, HealthStatus>>(new Map());
  
  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [steps, setSteps] = useState(30);
  const [guidance, setGuidance] = useState(7.5);

  // Check provider health on mount
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const health = await dualProviderImageService.checkProvidersHealth();
      setProviderHealth(health);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      return;
    }

    setIsGenerating(true);
    setResult(null);
    setProgress(null);

    const request: ImageRequest = {
      prompt: prompt.trim(),
      negativePrompt: negativePrompt.trim() || undefined,
      width,
      height,
      steps,
      guidance
    };

    const dualRequest: DualProviderRequest = {
      request,
      providerA,
      providerB,
      enableCrossValidation,
      preferredProvider: providerA
    };

    try {
      // Subscribe to progress updates
      const requestId = `req-${Date.now()}`;
      dualProviderImageService.onProgress(requestId, (prog) => {
        setProgress(prog);
      });

      const response = await dualProviderImageService.generateDualProvider(dualRequest);
      
      setResult(response);
      if (onImageGenerated) {
        onImageGenerated(response);
      }

      // Cleanup progress subscription
      dualProviderImageService.offProgress(requestId);
    } catch (error: any) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const swapProviders = () => {
    const temp = providerA;
    setProviderA(providerB);
    setProviderB(temp);
  };

  const getHealthIcon = (status: HealthStatus) => {
    switch (status) {
      case HealthStatus.UP:
        return <Check className="w-4 h-4 text-green-500" />;
      case HealthStatus.DEGRADED:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case HealthStatus.DOWN:
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getHealthStatus = (providerId: ProviderId): HealthStatus => {
    return providerHealth.get(providerId) || HealthStatus.DOWN;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dual-Provider Image Generation</h2>
        <button
          onClick={checkHealth}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Check Health
        </button>
      </div>

      {/* Prompt Input */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-2">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Negative Prompt (Optional)</label>
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="What to avoid in the image..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={2}
          />
        </div>
      </div>

      {/* Provider Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Provider A */}
        <div className="border border-gray-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium">Provider A (Primary)</label>
            {getHealthIcon(getHealthStatus(providerA))}
          </div>
          <select
            value={providerA}
            onChange={(e) => setProviderA(e.target.value as ProviderId)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={isGenerating}
          >
            <option value="stable-diffusion-xl">Stable Diffusion XL (Hugging Face)</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>

        {/* Swap Button */}
        <div className="hidden md:flex items-center justify-center">
          <button
            onClick={swapProviders}
            className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            disabled={isGenerating}
            title="Swap providers"
          >
            <ArrowLeftRight className="w-5 h-5" />
          </button>
        </div>

        {/* Provider B */}
        <div className="border border-gray-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium">Provider B (Secondary)</label>
            {getHealthIcon(getHealthStatus(providerB))}
          </div>
          <select
            value={providerB}
            onChange={(e) => setProviderB(e.target.value as ProviderId)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={isGenerating}
          >
            <option value="stable-diffusion-xl">Stable Diffusion XL (Hugging Face)</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
      </div>

      {/* Cross-Validation Toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="crossValidation"
          checked={enableCrossValidation}
          onChange={(e) => setEnableCrossValidation(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          disabled={isGenerating}
        />
        <label htmlFor="crossValidation" className="text-sm font-medium cursor-pointer">
          Enable cross-validation and quality comparison
        </label>
      </div>

      {/* Advanced Settings */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
        </button>

        {showAdvanced && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-2">Width</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                min={512}
                max={2048}
                step={64}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Height</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                min={512}
                max={2048}
                step={64}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Steps</label>
              <input
                type="number"
                value={steps}
                onChange={(e) => setSteps(Number(e.target.value))}
                min={1}
                max={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Guidance</label>
              <input
                type="number"
                value={guidance}
                onChange={(e) => setGuidance(Number(e.target.value))}
                min={0}
                max={20}
                step={0.5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={isGenerating}
              />
            </div>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </>
        ) : (
          'Generate Image'
        )}
      </button>

      {/* Progress Display */}
      {progress && (
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium">Generation Progress</h3>
          
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Provider A ({progress.providerA.provider})</span>
                <span>{progress.providerA.status}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress.providerA.progress}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Provider B ({progress.providerB.provider})</span>
                <span>{progress.providerB.status}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress.providerB.progress}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Overall</span>
                <span>{progress.overallProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress.overallProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div>
              <h3 className="font-medium">Generation Complete</h3>
              <p className="text-sm text-gray-600">
                Selected Provider: {result.selectedProvider}
                {result.failoverOccurred && ' (failover)'}
              </p>
              <p className="text-sm text-gray-600">
                Total Time: {result.totalLatencyMs}ms
              </p>
            </div>
          </div>

          {/* Primary Result */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-300">
              <h4 className="font-medium">Primary Result ({result.selectedProvider})</h4>
            </div>
            <div className="p-4">
              {result.primary.images.length > 0 && (
                <img
                  src={result.primary.images[0].url}
                  alt="Generated image (primary)"
                  className="w-full rounded-lg"
                />
              )}
            </div>
          </div>

          {/* Secondary Result (if available) */}
          {result.secondary && (
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="p-3 bg-gray-50 border-b border-gray-300">
                <h4 className="font-medium">Secondary Result (comparison)</h4>
              </div>
              <div className="p-4">
                {result.secondary.images.length > 0 && (
                  <img
                    src={result.secondary.images[0].url}
                    alt="Generated image (secondary)"
                    className="w-full rounded-lg"
                  />
                )}
              </div>
            </div>
          )}

          {/* Cross-Validation Report */}
          {result.crossValidation && (
            <div className="border border-blue-300 rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium mb-3">Cross-Validation Report</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{result.crossValidation.a} Score:</span>
                  <span className="font-medium">{result.crossValidation.results.a.score.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{result.crossValidation.b} Score:</span>
                  <span className="font-medium">{result.crossValidation.results.b.score.toFixed(3)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-200">
                  <span>Winner:</span>
                  <span className="font-medium">{result.crossValidation.consensus?.winner}</span>
                </div>
                <div className="flex justify-between">
                  <span>Composite Score:</span>
                  <span className="font-medium">{result.crossValidation.compositeScore.toFixed(3)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DualProviderImageGeneration;
