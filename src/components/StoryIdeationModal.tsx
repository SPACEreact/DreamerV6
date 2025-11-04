import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, BookOpen, MapPin, Save, Trash2, Sparkles } from 'lucide-react';

interface Character {
  name: string;
  role: string;
  motivation: string;
  arc: string;
  traits: string;
}

interface PlotPoint {
  title: string;
  description: string;
  emotionalBeat: string;
}

interface SceneIdea {
  location: string;
  atmosphere: string;
  visualMotif: string;
  emotionalTone: string;
}

interface StoryIdeation {
  characters: Character[];
  plotPoints: PlotPoint[];
  scenes: SceneIdea[];
}

interface StoryIdeationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ideation: StoryIdeation) => void;
  initialData?: Partial<StoryIdeation>;
}

export const StoryIdeationModal: React.FC<StoryIdeationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [activeTab, setActiveTab] = useState<'characters' | 'plot' | 'scenes'>('characters');
  const [characters, setCharacters] = useState<Character[]>(initialData?.characters || []);
  const [plotPoints, setPlotPoints] = useState<PlotPoint[]>(initialData?.plotPoints || []);
  const [scenes, setScenes] = useState<SceneIdea[]>(initialData?.scenes || []);

  const [currentCharacter, setCurrentCharacter] = useState<Character>({
    name: '',
    role: '',
    motivation: '',
    arc: '',
    traits: ''
  });

  const [currentPlotPoint, setCurrentPlotPoint] = useState<PlotPoint>({
    title: '',
    description: '',
    emotionalBeat: ''
  });

  const [currentScene, setCurrentScene] = useState<SceneIdea>({
    location: '',
    atmosphere: '',
    visualMotif: '',
    emotionalTone: ''
  });

  const handleSave = () => {
    onSave({
      characters,
      plotPoints,
      scenes
    });
    onClose();
  };

  const addCharacter = () => {
    if (currentCharacter.name) {
      setCharacters([...characters, currentCharacter]);
      setCurrentCharacter({ name: '', role: '', motivation: '', arc: '', traits: '' });
    }
  };

  const addPlotPoint = () => {
    if (currentPlotPoint.title) {
      setPlotPoints([...plotPoints, currentPlotPoint]);
      setCurrentPlotPoint({ title: '', description: '', emotionalBeat: '' });
    }
  };

  const addScene = () => {
    if (currentScene.location) {
      setScenes([...scenes, currentScene]);
      setCurrentScene({ location: '', atmosphere: '', visualMotif: '', emotionalTone: '' });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 border border-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-purple-500" />
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                Story Ideation
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setActiveTab('characters')}
              className={`
                flex-1 px-6 py-4 font-medium transition-colors flex items-center justify-center gap-2
                ${activeTab === 'characters'
                  ? 'bg-gray-800 text-purple-400 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }
              `}
            >
              <Users className="w-4 h-4" />
              Characters
            </button>
            <button
              onClick={() => setActiveTab('plot')}
              className={`
                flex-1 px-6 py-4 font-medium transition-colors flex items-center justify-center gap-2
                ${activeTab === 'plot'
                  ? 'bg-gray-800 text-purple-400 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }
              `}
            >
              <BookOpen className="w-4 h-4" />
              Plot
            </button>
            <button
              onClick={() => setActiveTab('scenes')}
              className={`
                flex-1 px-6 py-4 font-medium transition-colors flex items-center justify-center gap-2
                ${activeTab === 'scenes'
                  ? 'bg-gray-800 text-purple-400 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }
              `}
            >
              <MapPin className="w-4 h-4" />
              Scenes
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
            {/* Characters Tab */}
            {activeTab === 'characters' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Character name..."
                    value={currentCharacter.name}
                    onChange={(e) => setCurrentCharacter({ ...currentCharacter, name: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Role (protagonist, antagonist, mentor, etc.)..."
                    value={currentCharacter.role}
                    onChange={(e) => setCurrentCharacter({ ...currentCharacter, role: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                  <textarea
                    placeholder="What do they want? What drives them?"
                    value={currentCharacter.motivation}
                    onChange={(e) => setCurrentCharacter({ ...currentCharacter, motivation: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                    rows={3}
                  />
                  <textarea
                    placeholder="Character arc (how do they change?)..."
                    value={currentCharacter.arc}
                    onChange={(e) => setCurrentCharacter({ ...currentCharacter, arc: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                    rows={3}
                  />
                  <textarea
                    placeholder="Key traits, quirks, visual characteristics..."
                    value={currentCharacter.traits}
                    onChange={(e) => setCurrentCharacter({ ...currentCharacter, traits: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                    rows={2}
                  />
                  <button
                    onClick={addCharacter}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-medium transition-colors"
                  >
                    Add Character
                  </button>
                </div>

                {/* Character list */}
                <div className="space-y-3">
                  {characters.map((char, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-800 border border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-purple-400">{char.name}</h4>
                          <p className="text-sm text-gray-400">{char.role}</p>
                        </div>
                        <button
                          onClick={() => setCharacters(characters.filter((_, i) => i !== idx))}
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                      {char.motivation && <p className="text-sm text-gray-300 mt-2"><span className="text-gray-500">Motivation:</span> {char.motivation}</p>}
                      {char.arc && <p className="text-sm text-gray-300 mt-1"><span className="text-gray-500">Arc:</span> {char.arc}</p>}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Plot Tab */}
            {activeTab === 'plot' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Plot point title (e.g., 'Inciting Incident', 'Midpoint Twist')..."
                    value={currentPlotPoint.title}
                    onChange={(e) => setCurrentPlotPoint({ ...currentPlotPoint, title: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                  <textarea
                    placeholder="What happens in this moment?"
                    value={currentPlotPoint.description}
                    onChange={(e) => setCurrentPlotPoint({ ...currentPlotPoint, description: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                    rows={4}
                  />
                  <input
                    type="text"
                    placeholder="Emotional beat (tension, relief, revelation, etc.)..."
                    value={currentPlotPoint.emotionalBeat}
                    onChange={(e) => setCurrentPlotPoint({ ...currentPlotPoint, emotionalBeat: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={addPlotPoint}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-medium transition-colors"
                  >
                    Add Plot Point
                  </button>
                </div>

                {/* Plot points list */}
                <div className="space-y-3">
                  {plotPoints.map((point, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-800 border border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-purple-400">{point.title}</h4>
                        <button
                          onClick={() => setPlotPoints(plotPoints.filter((_, i) => i !== idx))}
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-300">{point.description}</p>
                      {point.emotionalBeat && (
                        <p className="text-xs text-gray-500 mt-2">
                          <span className="text-pink-500">Emotion:</span> {point.emotionalBeat}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Scenes Tab */}
            {activeTab === 'scenes' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Location/Setting..."
                    value={currentScene.location}
                    onChange={(e) => setCurrentScene({ ...currentScene, location: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                  <textarea
                    placeholder="Atmosphere and mood..."
                    value={currentScene.atmosphere}
                    onChange={(e) => setCurrentScene({ ...currentScene, atmosphere: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                    rows={3}
                  />
                  <input
                    type="text"
                    placeholder="Visual motif (recurring element, symbol)..."
                    value={currentScene.visualMotif}
                    onChange={(e) => setCurrentScene({ ...currentScene, visualMotif: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Emotional tone..."
                    value={currentScene.emotionalTone}
                    onChange={(e) => setCurrentScene({ ...currentScene, emotionalTone: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={addScene}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-medium transition-colors"
                  >
                    Add Scene Idea
                  </button>
                </div>

                {/* Scenes list */}
                <div className="space-y-3">
                  {scenes.map((scene, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-800 border border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-purple-400">{scene.location}</h4>
                        <button
                          onClick={() => setScenes(scenes.filter((_, i) => i !== idx))}
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                      {scene.atmosphere && <p className="text-sm text-gray-300"><span className="text-gray-500">Atmosphere:</span> {scene.atmosphere}</p>}
                      {scene.visualMotif && <p className="text-sm text-gray-300 mt-1"><span className="text-gray-500">Visual Motif:</span> {scene.visualMotif}</p>}
                      {scene.emotionalTone && <p className="text-xs text-gray-500 mt-2"><span className="text-pink-500">Tone:</span> {scene.emotionalTone}</p>}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-800">
            <div className="text-sm text-gray-500">
              {characters.length} characters, {plotPoints.length} plot points, {scenes.length} scenes
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save to Prompt
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StoryIdeationModal;
