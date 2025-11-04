import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Loader2, Download, Play, Pause, X, Sparkles } from 'lucide-react';
import { DualProviderAudioGeneration } from './DualProviderAudioGeneration';
import { DualProviderAudioResponse } from '../types/audioGeneration';

interface OldSoundTabProps {
  onGenerate?: (audioData: any) => void;
  initialDescription?: string;
}

export const OldSoundTab: React.FC<OldSoundTabProps> = ({
  onGenerate,
  initialDescription = ''
}) => {
  const [soundTypes, setSoundTypes] = useState<string[]>([]);
  const [description, setDescription] = useState(initialDescription);
  const [mood, setMood] = useState('Neutral');
  const [intensity, setIntensity] = useState(5);
  const [duration, setDuration] = useState('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [showAdvancedAudioLab, setShowAdvancedAudioLab] = useState(false);
  const [advancedAudioResult, setAdvancedAudioResult] = useState<DualProviderAudioResponse | null>(null);

  const soundTypeOptions = [
    { id: 'ambient', label: 'Ambient', description: 'Background atmosphere and environment' },
    { id: 'music', label: 'Music', description: 'Musical score or soundtrack' },
    { id: 'sfx', label: 'Sound Effects', description: 'Specific sound effects' },
    { id: 'dialogue', label: 'Dialogue', description: 'Voice and speech' }
  ];

  const moodOptions = [
    'Neutral',
    'Tense',
    'Peaceful',
    'Dramatic',
    'Mysterious',
    'Joyful',
    'Melancholic',
    'Epic',
    'Intimate'
  ];

  const durationOptions = [
    { value: 'short', label: 'Short (5-10s)' },
    { value: 'medium', label: 'Medium (15-30s)' },
    { value: 'long', label: 'Long (45-60s)' }
  ];

  const toggleSoundType = (type: string) => {
    if (soundTypes.includes(type)) {
      setSoundTypes(soundTypes.filter(t => t !== type));
    } else {
      setSoundTypes([...soundTypes, type]);
    }
  };

  const handleGenerate = async () => {
    if (!description.trim() || soundTypes.length === 0) {
      alert('Please provide a description and select at least one sound type');
      return;
    }

    setIsGenerating(true);

    try {
      // This would integrate with dual-provider audio service
      // For now, creating a mock response structure
      const audioData = {
        description,
        types: soundTypes,
        mood,
        intensity,
        duration,
        timestamp: new Date().toISOString()
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In real implementation, this would be:
      // const result = await dualProviderAudioService.generate(audioData);
      // setGeneratedAudio(result);

      setGeneratedAudio(audioData);
      
      if (onGenerate) {
        onGenerate(audioData);
      }
    } catch (error) {
      console.error('Audio generation failed:', error);
      alert('Failed to generate audio. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    const ensureAudioElement = () => {
      if (audioElement) return audioElement;
      const primaryUrl = advancedAudioResult?.primary?.audios?.[0]?.url;
      if (!primaryUrl) return null;
      const newAudio = new Audio(primaryUrl);
      newAudio.onended = () => setIsPlaying(false);
      setAudioElement(newAudio);
      return newAudio;
    };

    const element = ensureAudioElement();
    if (!element) return;

    if (isPlaying) {
      element.pause();
      setIsPlaying(false);
    } else {
      element.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    const url = advancedAudioResult?.primary?.audios?.[0]?.url;
    if (!url) {
      if (generatedAudio) {
        console.log('Download audio:', generatedAudio);
      }
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = `dreamer-audio-${advancedAudioResult.selectedProvider || 'primary'}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (advancedAudioResult?.primary?.audios?.[0]?.url) {
      const url = advancedAudioResult.primary.audios[0].url;
      const audio = new Audio(url);
      audio.onended = () => setIsPlaying(false);
      if (audioElement) {
        audioElement.pause();
      }
      setAudioElement(audio);
      setIsPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancedAudioResult]);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const handleAdvancedAudioGenerated = (response: DualProviderAudioResponse) => {
    setAdvancedAudioResult(response);
    setShowAdvancedAudioLab(false);
    const audioData = {
      description,
      types: soundTypes.length ? soundTypes : ['ambient'],
      mood,
      intensity,
      duration,
      timestamp: new Date().toISOString(),
      advancedAudio: response
    };
    setGeneratedAudio(audioData);
    if (onGenerate) {
      onGenerate(audioData);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showAdvancedAudioLab && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-gray-900 border border-gray-800 rounded-xl p-6"
            >
              <button
                onClick={() => setShowAdvancedAudioLab(false)}
                className="absolute top-3 right-3 p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                aria-label="Close advanced audio lab"
              >
                <X className="w-4 h-4 text-gray-300" />
              </button>
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-300" />
                Dual-Provider Audio Lab (Preview)
              </h3>
              <DualProviderAudioGeneration onAudioGenerated={handleAdvancedAudioGenerated} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-purple-900/20 border border-purple-700/40 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-300 mt-1" />
          <div>
            <h4 className="text-sm font-semibold text-purple-200">Advanced audio mixing coming soon</h4>
            <p className="text-xs text-purple-200/70">Preview our dual-provider audio engine that blends Gemini Audio with AudioLDM for cinematic results.</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAdvancedAudioLab(true)}
          className="self-start md:self-auto px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition-colors"
        >
          Launch Preview
        </motion.button>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Volume2 className="w-6 h-6 text-amber-500" />
        <h3 className="text-2xl font-semibold text-white">Sound Design</h3>
      </div>

      {/* Sound Type Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-400">
          Sound Type (select all that apply)
        </label>
        <div className="space-y-2">
          {soundTypeOptions.map(option => (
            <label
              key={option.id}
              className={`
                flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                ${soundTypes.includes(option.id)
                  ? 'bg-amber-500/10 border-amber-500'
                  : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                }
              `}
            >
              <input
                type="checkbox"
                checked={soundTypes.includes(option.id)}
                onChange={() => toggleSoundType(option.id)}
                className="mt-1 w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
              />
              <div className="flex-1">
                <div className="font-medium text-white">{option.label}</div>
                <div className="text-sm text-gray-400">{option.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-400">
          Sound Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the sound atmosphere you want to create... (e.g., 'Distant thunder with rain falling on windows, creating a tense and melancholic atmosphere')"
          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none resize-none"
          rows={4}
        />
      </div>

      {/* Mood Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-400">
          Mood
        </label>
        <select
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
        >
          {moodOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {/* Intensity Slider */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-400">
          Intensity: {intensity}/10
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={intensity}
          onChange={(e) => setIntensity(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Subtle</span>
          <span>Moderate</span>
          <span>Intense</span>
        </div>
      </div>

      {/* Duration Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-400">
          Duration
        </label>
        <div className="flex gap-2">
          {durationOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setDuration(option.value)}
              className={`
                flex-1 py-3 px-4 rounded-lg font-medium transition-all
                ${duration === option.value
                  ? 'bg-amber-500 text-black'
                  : 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleGenerate}
        disabled={isGenerating || soundTypes.length === 0 || !description.trim()}
        className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-lg font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating Audio...</span>
          </>
        ) : (
          <>
            <Volume2 className="w-5 h-5" />
            <span>Generate Audio</span>
          </>
        )}
      </motion.button>

      {/* Generated Audio Display */}
      {generatedAudio && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-white">Generated Audio</h4>
            <div className="flex gap-2">
              <button
                onClick={handlePlayPause}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>
              <button
                onClick={handleDownload}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Download className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Types:</span>
              <span className="text-white">{generatedAudio.types.join(', ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Mood:</span>
              <span className="text-white">{generatedAudio.mood}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Intensity:</span>
              <span className="text-white">{generatedAudio.intensity}/10</span>
            </div>
          </div>

          {/* Audio player placeholder */}
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="h-16 flex items-center justify-center text-gray-500">
              Audio player will be integrated here
            </div>
          </div>
        </motion.div>
      )}

      {/* Help text */}
      <div className="text-sm text-gray-500 bg-gray-800/50 rounded-lg p-4">
        <p className="font-medium text-gray-400 mb-2">Tips for better audio:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Be specific about the sound sources and environment</li>
          <li>Mention spatial characteristics (distant, close, echoing)</li>
          <li>Include emotional qualities and atmosphere</li>
          <li>Reference timing and rhythm if relevant</li>
        </ul>
      </div>
    </div>
  );
};

export default OldSoundTab;
