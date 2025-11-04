import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { phaseMetadata } from '../constants-original';

interface ProgressBoxesProps {
  currentPhase: number;
  completedPhases: number[];
  onPhaseClick?: (phase: number) => void;
}

export const ProgressBoxes: React.FC<ProgressBoxesProps> = ({
  currentPhase,
  completedPhases,
  onPhaseClick
}) => {
  const getBoxStatus = (phase: number): 'completed' | 'current' | 'upcoming' => {
    if (completedPhases.includes(phase)) return 'completed';
    if (phase === currentPhase) return 'current';
    return 'upcoming';
  };

  const getBoxStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-amber-500 border-amber-400 shadow-lg shadow-amber-500/20';
      case 'current':
        return 'bg-amber-600 border-amber-300 shadow-lg shadow-amber-600/40 ring-2 ring-amber-400/50';
      case 'upcoming':
        return 'bg-gray-800 border-gray-700';
      default:
        return 'bg-gray-800 border-gray-700';
    }
  };

  return (
    <div className="mb-8">
      {/* Progress boxes */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((phase) => {
          const status = getBoxStatus(phase);
          const metadata = phaseMetadata.find(p => p.phase === phase);
          
          return (
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: phase * 0.05 }}
              className="flex-1 relative group"
            >
              <motion.div
                className={`
                  h-3 rounded border-2 transition-all duration-300 cursor-pointer
                  ${getBoxStyles(status)}
                  ${onPhaseClick ? 'hover:scale-105' : ''}
                `}
                animate={
                  status === 'current'
                    ? {
                        scale: [1, 1.05, 1],
                        transition: {
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'easeInOut'
                        }
                      }
                    : {}
                }
                onClick={() => onPhaseClick && onPhaseClick(phase)}
              >
                {/* Completed checkmark */}
                {status === 'completed' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </motion.div>
                )}

                {/* Current phase indicator */}
                {status === 'current' && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  >
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </motion.div>
                )}
              </motion.div>

              {/* Tooltip on hover */}
              {metadata && (
                <div className="
                  absolute top-full mt-2 left-1/2 -translate-x-1/2 
                  opacity-0 group-hover:opacity-100 
                  transition-opacity duration-200
                  pointer-events-none z-10
                ">
                  <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                    <div className="text-xs font-medium text-amber-400">
                      Phase {phase}
                    </div>
                    <div className="text-xs text-gray-300">
                      {metadata.name}
                    </div>
                  </div>
                  {/* Tooltip arrow */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 border-t border-l border-gray-700 rotate-45" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Phase labels below boxes (optional, can be shown/hidden) */}
      <div className="flex gap-2 text-[0.65rem] text-gray-500">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((phase) => {
          const metadata = phaseMetadata.find(p => p.phase === phase);
          const status = getBoxStatus(phase);
          
          return (
            <div
              key={phase}
              className={`
                flex-1 text-center truncate transition-colors
                ${status === 'current' ? 'text-amber-400 font-medium' : ''}
                ${status === 'completed' ? 'text-amber-500/70' : ''}
              `}
            >
              {phase}
            </div>
          );
        })}
      </div>

      {/* Current phase name display */}
      <div className="mt-4 text-center">
        <div className="text-sm text-gray-500">Current Phase</div>
        <div className="text-lg font-semibold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          {phaseMetadata.find(p => p.phase === currentPhase)?.name || 'Loading...'}
        </div>
      </div>
    </div>
  );
};

export default ProgressBoxes;
