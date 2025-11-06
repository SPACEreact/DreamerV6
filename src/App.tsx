import React, { useMemo, useState } from 'react';
import {
  Film,
  Sparkles,
  Lightbulb,
  Copy,
  Check,
  Loader2,
  Video
} from 'lucide-react';
import { StoryIdeation } from './components/StoryIdeation';
import { StoryContext, StoryIdeationService } from './services/storyIdeationService';
import {
  EnhancedInsight,
  VideoPromptResult,
  getKnowledgeBasedSuggestions,
  generateVideoPrompt
} from './services/geminiService';

const copyToClipboard = async (value: string, onSuccess: () => void) => {
  try {
    await navigator.clipboard.writeText(value);
    onSuccess();
  } catch (error) {
    // Clipboard unsupported; ignore silently
  }
};

const App: React.FC = () => {
  const [script, setScript] = useState('');
  const [storyContext, setStoryContext] = useState<Partial<StoryContext>>({});
  const [isIdeationOpen, setIsIdeationOpen] = useState(false);
  const [insight, setInsight] = useState<EnhancedInsight | null>(null);
  const [videoPrompt, setVideoPrompt] = useState<VideoPromptResult | null>(null);
  const [isFetchingInsight, setIsFetchingInsight] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [copiedInsight, setCopiedInsight] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const storyOutline = useMemo(() => {
    const outlineFromContext = StoryIdeationService.buildScriptFromContext(storyContext);
    return script.trim() || outlineFromContext;
  }, [script, storyContext]);

  const handleStoryIdeationComplete = (context: Partial<StoryContext>, generatedScript: string) => {
    setStoryContext(context);
    setScript(prev => prev || generatedScript);
    setIsIdeationOpen(false);
  };

  const fetchInsight = async () => {
    setIsFetchingInsight(true);
    setErrorMessage(null);

    try {
      const result = await getKnowledgeBasedSuggestions(storyOutline, storyContext);
      setInsight(result);
    } catch (error) {
      setErrorMessage((error as Error).message || 'Unable to fetch enhanced insight.');
    } finally {
      setIsFetchingInsight(false);
    }
  };

  const handleGenerateVideoPrompt = async () => {
    if (!storyOutline.trim()) {
      setErrorMessage('Add story details or run Story Ideation before generating a video prompt.');
      return;
    }

    setIsGeneratingPrompt(true);
    setErrorMessage(null);

    try {
      const prompt = await generateVideoPrompt({
        script: storyOutline,
        context: storyContext,
        mood: storyContext.emotionalTone,
        visualStyle: storyContext.storyType,
      });
      setVideoPrompt(prompt);
    } catch (error) {
      setErrorMessage((error as Error).message || 'Dreamer could not produce a video prompt.');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleCopyInsight = () => {
    if (!insight) return;
    copyToClipboard(
      `${insight.recommendation}\n\n${insight.rationale}`,
      () => {
        setCopiedInsight(true);
        setTimeout(() => setCopiedInsight(false), 2000);
      }
    );
  };

  const handleCopyPrompt = () => {
    if (!videoPrompt) return;
    copyToClipboard(
      `${videoPrompt.prompt}\n\nBeats:\n${videoPrompt.beats.join('\n')}`,
      () => {
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Film className="w-6 h-6 text-amber-400" />
              Dreamer Video Prompt Builder
            </h1>
            <p className="text-sm text-slate-400">
              Focus on story, let Dreamer craft cinematic direction for your video prompts.
            </p>
          </div>
          <button
            onClick={() => setIsIdeationOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Launch Story Ideation
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {errorMessage && (
          <div className="p-4 bg-red-900/20 border border-red-500/40 text-red-200 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold">Story Inputs</h2>
            </div>
            <textarea
              value={script}
              onChange={(event) => setScript(event.target.value)}
              placeholder="Paste your script or jot down the story overview..."
              className="w-full min-h-[180px] rounded-lg bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchInsight}
                disabled={isFetchingInsight}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetchingInsight ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
                <span>Enhanced Insight</span>
              </button>
              <button
                onClick={handleGenerateVideoPrompt}
                disabled={isGeneratingPrompt}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                <span>Generate Video Prompt</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Context Snapshot
              </h2>
            </div>
            {storyOutline ? (
              <pre className="whitespace-pre-wrap text-xs leading-5 bg-slate-950 border border-slate-800 rounded-lg p-4 text-slate-200">
                {storyOutline}
              </pre>
            ) : (
              <p className="text-sm text-slate-400">
                Your combined answers and script will appear here for quick reference.
              </p>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Enhanced Insight
                </h3>
                <p className="text-xs text-slate-400">Dreamer surfaces one best recommendation based on your story so far.</p>
              </div>
              <button
                onClick={handleCopyInsight}
                disabled={!insight}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copiedInsight ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {insight ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-100 leading-relaxed">{insight.recommendation}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{insight.rationale}</p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="px-2 py-1 bg-slate-800/80 rounded">Genre: {insight.metadata.genre}</span>
                  <span className="px-2 py-1 bg-slate-800/80 rounded">Tone: {insight.metadata.tone}</span>
                  <span className="px-2 py-1 bg-slate-800/80 rounded">Visual hook: {insight.metadata.visualHook}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                Run Enhanced Insight to receive a curated cinematography recommendation tailored to your context.
              </p>
            )}
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Video className="w-4 h-4 text-amber-400" />
                  Video Prompt
                </h3>
                <p className="text-xs text-slate-400">Copy-ready prompt with beats and creative tags.</p>
              </div>
              <button
                onClick={handleCopyPrompt}
                disabled={!videoPrompt}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copiedPrompt ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {videoPrompt ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-100 leading-relaxed">{videoPrompt.prompt}</p>
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Beats</h4>
                  <ul className="space-y-1 text-sm text-slate-300">
                    {videoPrompt.beats.map((beat, index) => (
                      <li key={index} className="pl-3 border-l border-amber-500/40">{beat}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                  {videoPrompt.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-slate-800/80 rounded">{tag}</span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                Generate a video prompt to see Dreamer's structured guidance and beats here.
              </p>
            )}
          </div>
        </section>
      </main>

      {isIdeationOpen && (
        <StoryIdeation
          onClose={() => setIsIdeationOpen(false)}
          onComplete={handleStoryIdeationComplete}
        />
      )}
    </div>
  );
};

export default App;
