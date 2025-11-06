import React from 'react';
import { motion } from 'framer-motion';
import { Palette, Camera, Sparkles, Lightbulb, LayoutGrid } from 'lucide-react';
import { moduleCollaborationService, VisualFocus } from '../services/moduleCollaborationService';

interface CollaborationDashboardProps {
  visible: boolean;
  onClose: () => void;
}

export const CollaborationDashboard: React.FC<CollaborationDashboardProps> = ({ visible, onClose }) => {
  if (!visible) return null;

  const insights = moduleCollaborationService.getAllInsights();
  const recommendations = moduleCollaborationService.getRecommendations();
  const coherence = moduleCollaborationService.analyzeProjectCoherence();

  const focusLabels: Record<VisualFocus, string> = {
    composition: 'Composition',
    lighting: 'Lighting',
    color: 'Color',
    camera: 'Camera',
    general: 'General'
  };

  const focusIcons: Record<VisualFocus, React.ElementType> = {
    composition: LayoutGrid,
    lighting: Lightbulb,
    color: Palette,
    camera: Camera,
    general: Sparkles
  };

  const priorityStyles: Record<'high' | 'medium' | 'low', string> = {
    high: 'border-red-500/40 bg-red-500/10',
    medium: 'border-amber-500/40 bg-amber-500/10',
    low: 'border-blue-500/40 bg-blue-500/10'
  };

  const groupedInsights = insights.reduce<Record<VisualFocus, typeof insights>>((acc, insight) => {
    const focus = insight.focus ?? 'general';
    if (!acc[focus]) {
      acc[focus] = [];
    }
    acc[focus].push(insight);
    return acc;
  }, { composition: [], lighting: [], color: [], camera: [], general: [] });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-gray-900 rounded-lg border border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Visual Collaboration</span>
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Project Coherence Score */}
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-white">Project Coherence</h3>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${coherence.score >= 70 ? 'bg-green-500' : coherence.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                <span className="text-2xl font-bold text-white">{coherence.score}%</span>
              </div>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
              <motion.div
                className={`h-2 rounded-full ${coherence.score >= 70 ? 'bg-green-500' : coherence.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${coherence.score}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="text-green-400 font-medium mb-1">Strengths</h4>
                <ul className="text-gray-300 space-y-1">
                  {coherence.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start space-x-1">
                      <span className="text-green-400 mt-1">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="text-red-400 font-medium mb-1">Areas to Improve</h4>
                <ul className="text-gray-300 space-y-1">
                  {coherence.weaknesses.map((weakness, index) => (
                    <li key={index} className="flex items-start space-x-1">
                      <span className="text-red-400 mt-1">•</span>
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="text-blue-400 font-medium mb-1">Recommendations</h4>
                <ul className="text-gray-300 space-y-1">
                  {coherence.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-1">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Visual Recommendations */}
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <span>Visual Recommendations</span>
            </h3>

            {recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.map((rec, index) => {
                  const FocusIcon = focusIcons[rec.focus];
                  return (
                    <motion.div
                      key={`${rec.suggestion}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-3 rounded-lg border ${priorityStyles[rec.priority]}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center">
                          <FocusIcon className="w-4 h-4 text-amber-300" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white">{focusLabels[rec.focus]}</span>
                            <span className={`text-xs px-2 py-1 rounded-full bg-black/30 ${
                              rec.priority === 'high' ? 'text-red-300' :
                              rec.priority === 'medium' ? 'text-amber-300' : 'text-blue-200'
                            }`}>
                              {rec.priority} priority
                            </span>
                          </div>
                          <p className="text-sm text-gray-200 mb-1">{rec.suggestion}</p>
                          <p className="text-xs text-gray-400">{rec.rationale}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">
                No recommendations yet. Capture insights from storyboard reviews or mood explorations to unlock guidance.
              </p>
            )}
          </div>

          {/* Visual Insights */}
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
              <Palette className="w-5 h-5 text-blue-500" />
              <span>Visual Insights</span>
            </h3>

            {insights.length > 0 ? (
              <div className="space-y-4">
                {( ['composition', 'lighting', 'color', 'camera', 'general'] as VisualFocus[] ).map(focus => {
                  const focusInsights = groupedInsights[focus];
                  if (!focusInsights || focusInsights.length === 0) return null;

                  const FocusIcon = focusIcons[focus];

                  return (
                    <div key={focus} className="border border-gray-700 rounded-lg p-3">
                      <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                        <FocusIcon className="w-4 h-4" />
                        <span>{focusLabels[focus]}</span>
                      </h4>
                      <div className="space-y-2">
                        {focusInsights.map((insight, index) => (
                          <div key={index} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              insight.relevance === 'high' ? 'bg-green-400' :
                              insight.relevance === 'medium' ? 'bg-amber-400' : 'bg-gray-500'
                            }`} />
                            <span>{insight.insight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No visual insights recorded yet. Start by logging composition or lighting notes from your latest pass.</p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};