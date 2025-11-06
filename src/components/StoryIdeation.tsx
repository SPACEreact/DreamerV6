import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  BookOpen,
  Wand2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  User,
  Heart,
  MapPin,
  Clock,
  Target,
  Film,
  CheckCircle,
  ArrowRight,
  Copy,
  Check,
  Loader2
} from 'lucide-react';
import {
  StoryIdeationService,
  StoryContext,
  storyIdeationQuestions,
  StoryIdeationQuestion,
  SmartSuggestion
} from '../services/storyIdeationService';

interface StoryIdeationProps {
  onComplete: (context: Partial<StoryContext>, script: string) => void;
  onClose: () => void;
}

interface QuestionState {
  id: string;
  answer: string;
  completed: boolean;
}

const findNextVisibleQuestion = (
  currentIndex: number,
  context: Partial<StoryContext>
): StoryIdeationQuestion | null => {
  for (let i = currentIndex + 1; i < storyIdeationQuestions.length; i++) {
    const candidate = storyIdeationQuestions[i];
    if (StoryIdeationService.shouldShowQuestion(candidate.id, context)) {
      return candidate;
    }
  }
  return null;
};

const copyToClipboard = async (value: string, onSuccess: () => void) => {
  try {
    await navigator.clipboard.writeText(value);
    onSuccess();
  } catch (error) {
    // Clipboard unsupported or blocked; ignore silently
  }
};

export const StoryIdeation: React.FC<StoryIdeationProps> = ({ onComplete, onClose }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<QuestionState[]>(
    storyIdeationQuestions.map(q => ({ id: q.id, answer: '', completed: false }))
  );
  const [context, setContext] = useState<Partial<StoryContext>>({});
  const [smartSuggestion, setSmartSuggestion] = useState<SmartSuggestion | null>(null);
  const [upcomingQuestion, setUpcomingQuestion] = useState<StoryIdeationQuestion | null>(
    storyIdeationQuestions.length > 1 ? storyIdeationQuestions[1] : null
  );
  const [knowledgeInsights, setKnowledgeInsights] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [detectedGenre, setDetectedGenre] = useState<string | null>(null);
  const [copiedSuggestion, setCopiedSuggestion] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const currentQuestion = storyIdeationQuestions[currentQuestionIndex];
  const currentQuestionState = questions.find(q => q.id === currentQuestion.id);
  const progress = ((currentQuestionIndex + 1) / storyIdeationQuestions.length) * 100;

  const shouldShowCurrentQuestion = StoryIdeationService.shouldShowQuestion(currentQuestion.id, context);

  const storySummary = useMemo(
    () => StoryIdeationService.buildScriptFromContext(context),
    [context]
  );

  useEffect(() => {
    setKnowledgeInsights(StoryIdeationService.getRelevantKnowledge(currentQuestion.id));
  }, [currentQuestion.id]);

  useEffect(() => {
    if (context.protagonist && context.coreWant && context.centralConflict) {
      analyzeGenre();
    }
  }, [context]);

  const analyzeGenre = async () => {
    try {
      const genre = await StoryIdeationService.analyzeStoryForGenre(context);
      if (genre) {
        setDetectedGenre(genre);
        setContext(prev => ({ ...prev, genre }));
      }
    } catch (error) {
      // Silent failure is acceptable for offline heuristics
    }
  };

  const refreshSuggestion = useCallback(async (
    contextOverride?: Partial<StoryContext>,
    questionsOverride?: QuestionState[]
  ) => {
    const questionsToUse = questionsOverride ?? questions;
    const contextToUse = contextOverride ?? context;

    const nextVisible = findNextVisibleQuestion(currentQuestionIndex, contextToUse);
    setUpcomingQuestion(nextVisible);

    if (!nextVisible) {
      setSmartSuggestion(null);
      setIsGeneratingSuggestions(false);
      return;
    }

    setIsGeneratingSuggestions(true);

    try {
      const allAnswers = questionsToUse.reduce((acc, q) => {
        acc[q.id] = q.answer;
        return acc;
      }, {} as Record<string, string>);

      const suggestion = await StoryIdeationService.generateSmartSuggestions(
        nextVisible.id,
        contextToUse,
        allAnswers
      );

      setSmartSuggestion(suggestion);
    } catch (error) {
      setSmartSuggestion(null);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, [context, questions, currentQuestionIndex]);

  const handleAnswerChange = (answer: string) => {
    const trimmedAnswer = answer.trim();
    const updatedQuestions = questions.map(q =>
      q.id === currentQuestion.id
        ? { ...q, answer: trimmedAnswer, completed: trimmedAnswer.length > 0 }
        : q
    );

    const updatedContext: Partial<StoryContext> = { ...context };

    if (trimmedAnswer.length > 0) {
      (updatedContext as Record<string, string>)[currentQuestion.id] = trimmedAnswer;
    } else {
      delete (updatedContext as Record<string, string>)[currentQuestion.id];
    }

    if (currentQuestion.id === 'protagonist') {
      const ageMatch = trimmedAnswer.match(/\b(\d{1,3})\b/);
      if (ageMatch) {
        updatedContext.age = ageMatch[1];
      } else {
        delete updatedContext.age;
      }
    }

    setQuestions(updatedQuestions);
    setContext(updatedContext);

    if (shouldShowCurrentQuestion && trimmedAnswer.length > 0) {
      refreshSuggestion(updatedContext, updatedQuestions);
    } else {
      setIsGeneratingSuggestions(false);
      setSmartSuggestion(null);
      setUpcomingQuestion(findNextVisibleQuestion(currentQuestionIndex, updatedContext));
    }
  };

  const handleSuggestionApply = (suggestion: SmartSuggestion) => {
    if (!suggestion) return;
    if (!currentQuestionState?.answer.trim()) {
      handleAnswerChange(suggestion.recommendation);
    } else {
      handleAnswerChange(`${currentQuestionState.answer}\n\n${suggestion.recommendation}`);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < storyIdeationQuestions.length - 1) {
      let nextIndex = currentQuestionIndex + 1;
      while (
        nextIndex < storyIdeationQuestions.length &&
        !StoryIdeationService.shouldShowQuestion(storyIdeationQuestions[nextIndex].id, context)
      ) {
        nextIndex++;
      }
      setCurrentQuestionIndex(Math.min(nextIndex, storyIdeationQuestions.length - 1));
      setUpcomingQuestion(findNextVisibleQuestion(Math.min(nextIndex, storyIdeationQuestions.length - 1), context));
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      let prevIndex = currentQuestionIndex - 1;
      while (
        prevIndex >= 0 &&
        !StoryIdeationService.shouldShowQuestion(storyIdeationQuestions[prevIndex].id, context)
      ) {
        prevIndex--;
      }
      const safeIndex = prevIndex >= 0 ? prevIndex : 0;
      setCurrentQuestionIndex(safeIndex);
      setUpcomingQuestion(findNextVisibleQuestion(safeIndex, context));
    }
  };

  const canProceed = currentQuestionState?.completed || !currentQuestion.required;
  const isLastQuestion = currentQuestionIndex >= storyIdeationQuestions.length - 1;
  const completedQuestions = questions.filter(q => q.completed).length;

  const handleComplete = () => {
    const script = StoryIdeationService.buildScriptFromContext(context);
    onComplete(context, script);
  };

  const getQuestionIcon = (category: string) => {
    switch (category) {
      case 'character': return User;
      case 'plot': return Film;
      case 'theme': return Heart;
      case 'setting': return MapPin;
      case 'conflict': return Target;
      case 'emotion': return Heart;
      default: return Lightbulb;
    }
  };

  const QuestionIcon = getQuestionIcon(currentQuestion.category);

  if (currentQuestionIndex > 0 && !shouldShowCurrentQuestion) {
    nextQuestion();
    return null;
  }

  const handleCopySuggestion = () => {
    if (!smartSuggestion) return;
    copyToClipboard(smartSuggestion.recommendation, () => {
      setCopiedSuggestion(true);
      setTimeout(() => setCopiedSuggestion(false), 2000);
    });
  };

  const handleCopySummary = () => {
    if (!storySummary.trim()) return;
    copyToClipboard(storySummary, () => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 border border-gray-800 rounded-xl max-w-4xl w-full max-h-[92vh] overflow-hidden"
      >
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
              <Wand2 className="w-6 h-6 text-amber-400" />
              <span>Story Ideation</span>
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Question {currentQuestionIndex + 1} of {storyIdeationQuestions.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-amber-500 to-orange-600 h-2 rounded-full"
                style={{ width: `${progress}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {detectedGenre && (
              <div className="mt-1 p-2 bg-purple-900/20 border border-purple-700/30 rounded-lg">
                <div className="flex items-center space-x-2 text-purple-300 text-sm">
                  <Film className="w-4 h-4" />
                  <span>Detected Genre: <span className="font-medium capitalize">{detectedGenre}</span></span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 overflow-y-auto grid gap-6 md:grid-cols-[2fr_1.2fr]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <QuestionIcon className="w-5 h-5 text-amber-400" />
                  <span className="text-sm text-amber-400 capitalize">{currentQuestion.category}</span>
                  {currentQuestion.required && (
                    <span className="text-xs bg-red-900/20 text-red-400 px-2 py-1 rounded">Required</span>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{currentQuestion.title}</h3>
                <p className="text-gray-300">{currentQuestion.question}</p>
              </div>

              <div className="space-y-4">
                <textarea
                  value={currentQuestionState?.answer || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder={currentQuestion.placeholder}
                  className="w-full h-32 p-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none resize-none"
                />

                {isGeneratingSuggestions && (
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing context for the next best step…</span>
                  </div>
                )}

                {smartSuggestion && upcomingQuestion && (
                  <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-amber-400">Next up: {upcomingQuestion.title}</p>
                        <h4 className="text-white font-semibold mt-1 flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>{smartSuggestion.recommendation}</span>
                        </h4>
                      </div>
                      <button
                        onClick={handleCopySuggestion}
                        className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                        title="Copy suggestion"
                      >
                        {copiedSuggestion ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{smartSuggestion.rationale}</p>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSuggestionApply(smartSuggestion)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-black font-medium rounded-lg transition-colors"
                      >
                        Use Suggestion
                      </button>
                    </div>
                  </div>
                )}

                {knowledgeInsights.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-300 flex items-center space-x-1">
                      <BookOpen className="w-4 h-4 text-blue-400" />
                      <span>Relevant Insights</span>
                    </h4>
                    <div className="space-y-1">
                      {knowledgeInsights.map((insight, index) => (
                        <div key={index} className="text-blue-300 text-xs p-2 bg-blue-900/10 rounded">
                          {insight}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentQuestion.id === 'protagonist' && currentQuestionState?.answer && context.age && (
                  <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                    <h4 className="text-green-400 text-sm font-medium mb-1">💡 Life Stage Insights</h4>
                    <p className="text-green-300 text-xs">
                      {StoryIdeationService.ageContextMap[StoryIdeationService.getAgeGroup(context.age)]}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="space-y-4">
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-200 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Story Summary</span>
                </h4>
                <button
                  onClick={handleCopySummary}
                  disabled={!storySummary.trim()}
                  className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {copiedSummary ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {storySummary ? (
                <pre className="text-xs leading-5 text-gray-300 whitespace-pre-wrap bg-gray-900/40 p-3 rounded-lg">
                  {storySummary}
                </pre>
              ) : (
                <p className="text-xs text-gray-400">
                  Start answering questions to see a rolling summary of your story beats.
                </p>
              )}
            </div>

            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg space-y-2">
              <h4 className="text-sm font-semibold text-gray-200 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Progress</span>
              </h4>
              <p className="text-xs text-gray-400">
                {completedQuestions} of {storyIdeationQuestions.length} questions answered
              </p>
              <div className="h-2 bg-gray-900/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
                  style={{ width: `${(completedQuestions / storyIdeationQuestions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 flex justify-between items-center">
          <button
            onClick={prevQuestion}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="text-sm text-gray-400">
            {upcomingQuestion ? (
              <span>Next: <strong>{upcomingQuestion.title}</strong></span>
            ) : (
              <span>You are on the final question</span>
            )}
          </div>

          {!isLastQuestion ? (
            <button
              onClick={nextQuestion}
              disabled={!canProceed}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <motion.button
              onClick={handleComplete}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg transition-all flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Build Story</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
