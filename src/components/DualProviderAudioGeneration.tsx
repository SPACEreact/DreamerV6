/**
 * Dual-Provider Audio Generation Component
 * Provides UI for selecting providers, generating audio, and comparing results
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  AudioRequest, 
  DualProviderAudioRequest, 
  DualProviderAudioResponse,
  AudioProviderId,
  HealthStatus,
  DualProviderAudioProgress,
  AudioMode
} from '../types/audioGeneration';
import { dualProviderAudioService } from '../services/dualProviderAudioService';
import { 
  Loader2, 
  Check, 
  X, 
  AlertCircle, 
  RefreshCw, 
  ArrowLeftRight,
  Play,
  Pause,
  Volume2,
  Download
} from 'lucide-react';

interface DualProviderAudioGenProps {
  onAudioGenerated?: (response: DualProviderAudioResponse) => void;
  className?: string;
}

export const DualProviderAudioGeneration: React.FC<DualProviderAudioGenProps> = ({
  onAudioGenerated,
  className = ''
}) => {
  // State
  const [text, setText] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [mode, setMode] = useState<AudioMode>('text-to-audio');
  const [providerA, setProviderA] = useState<AudioProviderId>('audioldm2');
  const [providerB, setProviderB] = useState<AudioProviderId>('gemini-audio');
  const [enableCrossValidation, setEnableCrossValidation] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<DualProviderAudioProgress | null>(null);
  const [result, setResult] = useState<DualProviderAudioResponse | null>(null);
  const [providerHealth, setProviderHealth] = useState<Map<AudioProviderId, HealthStatus>>(new Map());
  
  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [duration, setDuration] = useState(5.0);
  const [sampleRate, setSampleRate] = useState(16000);
  const [style, setStyle] = useState('');
  const [voice, setVoice] = useState('');
  
  // Audio playback state
  const [playingPrimary, setPlayingPrimary] = useState(false);
  const [playingSecondary, setPlayingSecondary] = useState(false);
  const audioRefPrimary = useRef<HTMLAudioElement>(null);
  const audioRefSecondary = useRef<HTMLAudioElement>(null);

  // Check provider health on mount
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const health = await dualProviderAudioService.checkProvidersHealth();
      setProviderHealth(health);
    } catch (error) {
      // Health check failed
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      return;
    }

    setIsGenerating(true);
    setResult(null);
    setProgress(null);

    const request: AudioRequest = {
      mode,
      text: text.trim(),
      negativePrompt: negativePrompt.trim() || undefined,
      duration,
      sampleRate,
      style: style.trim() || undefined,
      voice: voice.trim() || undefined
    };

    const dualRequest: DualProviderAudioRequest = {
      request,
      providerA,
      providerB,
      enableCrossValidation,
      preferredProvider: providerA
    };

    try {
      // Subscribe to progress updates
      const requestId = `audio-req-${Date.now()}`;
      dualProviderAudioService.onProgress(requestId, (prog) => {
        setProgress(prog);
      });

      const response = await dualProviderAudioService.generateDualProvider(dualRequest);
      
      setResult(response);
      if (onAudioGenerated) {
        onAudioGenerated(response);
      }

      // Cleanup progress subscription
      dualProviderAudioService.offProgress(requestId);
    } catch (error: any) {
      // Audio generation failed
    } finally {
      setIsGenerating(false);
    }
  };

  const swapProviders = () => {
    const temp = providerA;
    setProviderA(providerB);
    setProviderB(temp);
  };

  const togglePlayPrimary = () => {
    if (audioRefPrimary.current) {
      if (playingPrimary) {
        audioRefPrimary.current.pause();
      } else {
        audioRefPrimary.current.play();
      }
      setPlayingPrimary(!playingPrimary);
    }
  };

  const togglePlaySecondary = () => {
    if (audioRefSecondary.current) {
      if (playingSecondary) {
        audioRefSecondary.current.pause();
      } else {
        audioRefSecondary.current.play();
      }
      setPlayingSecondary(!playingSecondary);
    }
  };

  const downloadAudio = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  const getHealthStatus = (providerId: AudioProviderId): HealthStatus => {
    return providerHealth.get(providerId) || HealthStatus.DOWN;
  };

  const getModeLabel = (m: AudioMode): string => {
    const labels: Record<AudioMode, string> = {
      'tts': 'Text-to-Speech',
      'text-to-audio': 'Text-to-Audio',
      'text-to-music': 'Text-to-Music',
      'sound-effect': 'Sound Effect'
    };
    return labels[m];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dual-Provider Audio Generation</h2>
        <button
          onClick={checkHealth}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Check Health
        </button>
      </div>

      {/* Audio Mode Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Audio Generation Mode</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['text-to-audio', 'text-to-music', 'sound-effect', 'tts'] as AudioMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                mode === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              disabled={isGenerating}
            >
              {getModeLabel(m)}
            </button>
          ))}
        </div>
      </div>

      {/* Text Input */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-2">
            {mode === 'tts' ? 'Text to Speak' : 'Audio Description'}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              mode === 'tts' 
                ? 'Enter the text you want to convert to speech...'
                : mode === 'text-to-music'
                ? 'Describe the music you want to generate...'
                : mode === 'sound-effect'
                ? 'Describe the sound effect...'
                : 'Describe the audio you want to generate...'
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Negative Prompt (Optional)</label>
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="What to avoid in the audio..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={2}
          />
        </div>
      </div>

      {/* Provider Selection */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4">
        {/* Provider A */}
        <div className="border border-gray-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium">Provider A (Primary)</label>
            {getHealthIcon(getHealthStatus(providerA))}
          </div>
          <select
            value={providerA}
            onChange={(e) => setProviderA(e.target.value as AudioProviderId)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={isGenerating}
          >
            <option value="audioldm2">AudioLDM 2 (Hugging Face)</option>
            <option value="gemini-audio">Gemini Audio</option>
          </select>
        </div>

        {/* Swap Button */}
        <div className="flex items-center justify-center">
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
            onChange={(e) => setProviderB(e.target.value as AudioProviderId)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={isGenerating}
          >
            <option value="audioldm2">AudioLDM 2 (Hugging Face)</option>
            <option value="gemini-audio">Gemini Audio</option>
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
              <label className="block text-sm font-medium mb-2">Duration (seconds)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseFloat(e.target.value))}
                min={0.5}
                max={30}
                step={0.5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Sample Rate (Hz)</label>
              <select
                value={sampleRate}
                onChange={(e) => setSampleRate(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isGenerating}
              >
                <option value={16000}>16000 Hz</option>
                <option value={22050}>22050 Hz</option>
                <option value={44100}>44100 Hz (CD Quality)</option>
                <option value={48000}>48000 Hz (Studio)</option>
              </select>
            </div>

            {mode === 'text-to-music' && (
              <div>
                <label className="block text-sm font-medium mb-2">Style</label>
                <input
                  type="text"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="e.g., ambient, electronic"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={isGenerating}
                />
              </div>
            )}

            {mode === 'tts' && (
              <div>
                <label className="block text-sm font-medium mb-2">Voice</label>
                <input
                  type="text"
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  placeholder="e.g., male, female"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={isGenerating}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !text.trim()}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Audio...
          </>
        ) : (
          <>
            <Volume2 className="w-5 h-5" />
            Generate Audio
          </>
        )}
      </button>

      {/* Progress Indicator */}
      {progress && (
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">Generation Progress</span>
            <span className="text-sm font-medium text-blue-900">{progress.overallProgress}%</span>
          </div>
          
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.overallProgress}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="font-medium text-gray-700 mb-1">Provider A: {progress.providerA.provider}</div>
              <div className="flex items-center gap-2">
                {progress.providerA.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                {progress.providerA.status === 'succeeded' && <Check className="w-3 h-3 text-green-600" />}
                {progress.providerA.status === 'failed' && <X className="w-3 h-3 text-red-600" />}
                <span className="text-gray-600">{progress.providerA.status}</span>
              </div>
            </div>

            <div>
              <div className="font-medium text-gray-700 mb-1">Provider B: {progress.providerB.provider}</div>
              <div className="flex items-center gap-2">
                {progress.providerB.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                {progress.providerB.status === 'succeeded' && <Check className="w-3 h-3 text-green-600" />}
                {progress.providerB.status === 'failed' && <X className="w-3 h-3 text-red-600" />}
                <span className="text-gray-600">{progress.providerB.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Generated Audio</h3>
            {result.failoverOccurred && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                Failover Occurred
              </span>
            )}
          </div>

          {/* Primary Result */}
          <div className="border border-gray-300 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Primary Audio</h4>
                <p className="text-sm text-gray-600">Provider: {result.selectedProvider}</p>
                {result.primary.duration_ms && (
                  <p className="text-sm text-gray-600">
                    Duration: {(result.primary.duration_ms / 1000).toFixed(1)}s
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlayPrimary}
                  className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                >
                  {playingPrimary ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => downloadAudio(result.primary.audios[0].url, `audio-${result.selectedProvider}.wav`)}
                  className="p-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

            <audio
              ref={audioRefPrimary}
              src={result.primary.audios[0].url}
              onEnded={() => setPlayingPrimary(false)}
              className="w-full"
              controls
            />
          </div>

          {/* Secondary Result (if available) */}
          {result.secondary && (
            <div className="border border-gray-300 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Secondary Audio</h4>
                  <p className="text-sm text-gray-600">
                    Provider: {result.selectedProvider === providerA ? providerB : providerA}
                  </p>
                  {result.secondary.duration_ms && (
                    <p className="text-sm text-gray-600">
                      Duration: {(result.secondary.duration_ms / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlaySecondary}
                    className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    {playingSecondary ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => downloadAudio(result.secondary!.audios[0].url, `audio-secondary.wav`)}
                    className="p-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <audio
                ref={audioRefSecondary}
                src={result.secondary.audios[0].url}
                onEnded={() => setPlayingSecondary(false)}
                className="w-full"
                controls
              />
            </div>
          )}

          {/* Cross-Validation Report */}
          {result.crossValidation && (
            <div className="border border-green-300 bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-3">Cross-Validation Report</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-700 font-medium">Provider A ({result.crossValidation.a})</p>
                  <p className="text-gray-600">
                    Score: {(result.crossValidation.results.a.score * 100).toFixed(1)}%
                  </p>
                  <p className="text-gray-600">
                    Valid: {result.crossValidation.results.a.valid ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-700 font-medium">Provider B ({result.crossValidation.b})</p>
                  <p className="text-gray-600">
                    Score: {(result.crossValidation.results.b.score * 100).toFixed(1)}%
                  </p>
                  <p className="text-gray-600">
                    Valid: {result.crossValidation.results.b.valid ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-green-200">
                <p className="text-sm text-green-900 font-medium">
                  Winner: {result.crossValidation.consensus?.winner}
                </p>
                <p className="text-sm text-gray-700">
                  Strategy: {result.crossValidation.consensus?.strategy}
                </p>
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          <div className="text-sm text-gray-600">
            <p>Total Generation Time: {(result.totalLatencyMs / 1000).toFixed(2)}s</p>
            {result.primary.timings?.latency_ms && (
              <p>Primary Latency: {(result.primary.timings.latency_ms / 1000).toFixed(2)}s</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DualProviderAudioGeneration;
