import React, { useState, useEffect, useMemo } from 'react';
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
  AlertTriangle,
  Film,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import {
  StoryIdeationService,
  StoryContext,
  storyIdeationQuestions,
  SmartSuggestionResult
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

export const StoryIdeation: React.FC<StoryIdeationProps> = ({ onComplete, onClose }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<QuestionState[]>(
    storyIdeationQuestions.map(q => ({ id: q.id, answer: '', completed: false }))
  );
  const [context, setContext] = useState<Partial<StoryContext>>({});
  const [suggestions, setSuggestions] = useState<SmartSuggestionResult | null>(null);
  const [knowledgeInsights, setKnowledgeInsights] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [detectedGenre, setDetectedGenre] = useState<string | null>(null);

  const currentQuestion = storyIdeationQuestions[currentQuestionIndex];
  const currentQuestionState = questions.find(q => q.id === currentQuestion.id);
  const progress = ((currentQuestionIndex + 1) / storyIdeationQuestions.length) * 100;

  const shouldShowCurrentQuestion = StoryIdeationService.shouldShowQuestion(currentQuestion.id, context);

  const storySummary = useMemo(() => StoryIdeationService.buildScriptFromContext(context), [context]);
  const ageGroup = useMemo(() => (context.age ? StoryIdeationService.getAgeGroup(context.age) : null), [context.age]);

  const answersMap = useMemo(() => {
    return questions.reduce((acc, q) => {
      acc[q.id] = q.answer;
      return acc;
    }, {} as Record<string, string>);
  }, [questions]);

  useEffect(() => {
    setKnowledgeInsights(StoryIdeationService.getRelevantKnowledge(currentQuestion.id));
  }, [currentQuestion.id]);

  useEffect(() => {
    // Analyze story for genre when we have enough context
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
      // Genre analysis failed
    }
  };

  const generateSuggestionsForNext = async (
    contextOverride?: Partial<StoryContext>,
    questionsOverride?: QuestionState[]
  ) => {
    setIsGeneratingSuggestions(true);
    try {
      const questionsToUse = questionsOverride ?? questions;
      const contextToUse = contextOverride ?? context;

      const allAnswers = questionsToUse.reduce((acc, q) => {
        acc[q.id] = q.answer;
        return acc;
      }, {} as Record<string, string>);

      const currentIndex = storyIdeationQuestions.findIndex(q => q.id === currentQuestion.id);
      let nextVisibleQuestion: typeof storyIdeationQuestions[number] | undefined;

      for (let idx = currentIndex + 1; idx < storyIdeationQuestions.length; idx += 1) {
        const candidate = storyIdeationQuestions[idx];
        if (StoryIdeationService.shouldShowQuestion(candidate.id, contextToUse)) {
          nextVisibleQuestion = candidate;
          break;
        }
      }

      if (!nextVisibleQuestion) {
        setSuggestions(null);
        return;
      }

      const smartSuggestions = await StoryIdeationService.generateSmartSuggestions(
        nextVisibleQuestion.id,
        contextToUse,
        allAnswers
      );
      setSuggestions(smartSuggestions);
    } catch (error) {
      setSuggestions(null);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

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
      generateSuggestionsForNext(updatedContext, updatedQuestions);
    } else {
      setIsGeneratingSuggestions(false);
      setSuggestions(null);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < storyIdeationQuestions.length - 1) {
      // Skip questions that shouldn't be shown
      let nextIndex = currentQuestionIndex + 1;
      while (nextIndex < storyIdeationQuestions.length &&
             !StoryIdeationService.shouldShowQuestion(storyIdeationQuestions[nextIndex].id, context)) {
        nextIndex++;
      }
      setCurrentQuestionIndex(nextIndex);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      let prevIndex = currentQuestionIndex - 1;
      while (prevIndex >= 0 &&
             !StoryIdeationService.shouldShowQuestion(storyIdeationQuestions[prevIndex].id, context)) {
        prevIndex--;
      }
      setCurrentQuestionIndex(prevIndex >= 0 ? prevIndex : 0);
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

  // Only auto-skip if we're past the first question and the current one shouldn't be shown
  if (currentQuestionIndex > 0 && !shouldShowCurrentQuestion) {
    nextQuestion();
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
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
          
          {/* Progress */}
          <div className="space-y-2">
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
          </div>

          {/* Genre Detection */}
          {detectedGenre && (
            <div className="mt-3 p-2 bg-purple-900/20 border border-purple-700/30 rounded-lg">
              <div className="flex items-center space-x-2 text-purple-400 text-sm">
                <Film className="w-4 h-4" />
                <span>Detected Genre: <span className="font-medium capitalize">{detectedGenre}</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Question Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Question Header */}
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

              {/* Answer Input */}
              <div className="space-y-4">
                <textarea
                  value={currentQuestionState?.answer || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder={currentQuestion.placeholder}
                  className="w-full h-32 p-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none resize-none"
                />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-4">
                    {/* Smart Suggestions */}
                    {(suggestions?.bestSuggestion || isGeneratingSuggestions) && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm text-gray-300">
                          <div className="flex items-center space-x-1">
                            <Lightbulb className="w-4 h-4 text-amber-400" />
                            <span>Next Step Guidance</span>
                          </div>
                          {isGeneratingSuggestions && <span className="text-xs text-amber-300">Thinking...</span>}
                        </div>
                        {suggestions?.bestSuggestion && !isGeneratingSuggestions && (
                          <div className="p-4 bg-gray-800/60 border border-gray-700 rounded-lg space-y-3">
                            <div className="text-xs uppercase tracking-wide text-amber-400">
                              Upcoming: {suggestions.targetQuestionTitle}
                            </div>
                            <p className="text-gray-100 text-sm leading-relaxed">
                              {suggestions.bestSuggestion.text}
                            </p>
                            <p className="text-xs text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-md p-2">
                              {suggestions.bestSuggestion.reason}
                            </p>
                            {suggestions.additionalSuggestions.length > 0 && (
                              <details className="text-xs text-gray-400">
                                <summary className="cursor-pointer text-amber-300">See other ideas</summary>
                                <ul className="list-disc list-inside space-y-1 mt-2 text-gray-300">
                                  {suggestions.additionalSuggestions.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Knowledge Insights */}
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

                    {/* Age Context Enhancement */}
                    {currentQuestion.id === 'protagonist' && currentQuestionState?.answer && context.age && (
                      <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                        <h4 className="text-green-400 text-sm font-medium mb-1">💡 Life Stage Insights</h4>
                        <p className="text-green-300 text-xs">
                          {StoryIdeationService.ageContextMap[StoryIdeationService.getAgeGroup(context.age)]}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Story Summary Panel */}
                  <div className="space-y-3">
                    <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-lg h-full flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>Story Summary</span>
                        </h4>
                      </div>
                      <div className="flex-1 overflow-auto">
                        {storySummary ? (
                          <pre className="whitespace-pre-wrap text-xs text-gray-300 leading-relaxed">
                            {storySummary}
                          </pre>
                        ) : (
                          <p className="text-xs text-gray-500">
                            Answer more questions to see a live summary of your story beats.
                          </p>
                        )}
                      </div>

                      <div className="mt-4 space-y-3">
                        {detectedGenre && (
                          <div className="p-3 bg-purple-900/20 border border-purple-700/40 rounded-lg">
                            <div className="text-xs text-purple-200 font-semibold">Detected Genre: {detectedGenre}</div>
                            <p className="text-[11px] text-purple-200/80 mt-1">
                              Focus on {StoryIdeationService.getGenreEmotionalFocus(detectedGenre)}.
                            </p>
                          </div>
                        )}
                        {context.age && ageGroup && (
                          <div className="p-3 bg-emerald-900/20 border border-emerald-700/40 rounded-lg">
                            <div className="text-xs text-emerald-200 font-semibold">Protagonist Age Insight</div>
                            <p className="text-[11px] text-emerald-200/80 mt-1">
                              {StoryIdeationService.ageContextMap[ageGroup]}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="p-6 border-t border-gray-800 flex justify-between">
          <button
            onClick={prevQuestion}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="text-sm text-gray-400">
            {completedQuestions} of {storyIdeationQuestions.length} completed
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