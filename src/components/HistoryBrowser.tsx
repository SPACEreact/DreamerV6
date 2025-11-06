/**
 * History Browser Component
 * Browse, search, and manage generation history
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Search,
  Filter,
  Star,
  Heart,
  Image as ImageIcon,
  Download,
  Trash2,
  X,
  ChevronDown,
  Calendar,
  Tag
} from 'lucide-react';
import { historyService, GenerationHistoryItem, HistoryFilter } from '../services/historyService';
import { StarRating } from './StarRating';
import { exportImage } from '../utils/exportUtils';
import { toast } from 'sonner';

interface HistoryBrowserProps {
  onClose: () => void;
  onSelectItem?: (item: GenerationHistoryItem) => void;
}

export const HistoryBrowser: React.FC<HistoryBrowserProps> = ({
  onClose,
  onSelectItem
}) => {
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<GenerationHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GenerationHistoryItem | null>(null);
  const [stats, setStats] = useState(historyService.getStatistics());

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [history, searchTerm, filter]);

  const loadHistory = () => {
    const allHistory = historyService.getHistory();
    setHistory(allHistory);
    setStats(historyService.getStatistics());
  };

  const applyFilters = () => {
    const filtered = historyService.getFilteredHistory({
      ...filter,
      searchTerm: searchTerm || undefined
    });
    setFilteredHistory(filtered);
  };

  const handleRating = (id: string, rating: number) => {
    historyService.updateRating(id, rating);
    loadHistory();
    toast.success('Rating updated');
  };

  const handleToggleFavorite = (id: string) => {
    historyService.toggleFavorite(id);
    loadHistory();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this item from history?')) {
      historyService.deleteHistoryItem(id);
      loadHistory();
      setSelectedItem(null);
      toast.success('Item deleted');
    }
  };

  const handleExport = async (item: GenerationHistoryItem) => {
    try {
      const timestamp = new Date(item.timestamp).toISOString().split('T')[0];
      const baseName = `dreamer-${item.type}-${timestamp}`;

      if (item.type === 'image') {
        if (item.resultA?.url) {
          await exportImage(item.resultA.url, `${baseName}-provider-a.png`);
        }
        if (item.resultB?.url) {
          await exportImage(item.resultB.url, `${baseName}-provider-b.png`);
        }
      }

      toast.success('Export completed');
    } catch (error) {
      // Export failed
      toast.error('Export failed');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-900 border border-gray-700 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <History className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">Generation History</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Visual Frames" value={stats.byType.image} icon={<ImageIcon className="w-4 h-4" />} />
            <StatCard label="Favorites" value={stats.favorites} icon={<Heart className="w-4 h-4 fill-pink-500 text-pink-500" />} />
            <StatCard label="Rated" value={stats.ratedItems} icon={<Star className="w-4 h-4 text-yellow-400" />} />
          </div>

          {/* Search and Filters */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search prompts, notes, tags..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {/* Filter Options */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-3">
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => setFilter({ ...filter, favoritesOnly: !filter.favoritesOnly })}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        filter.favoritesOnly
                          ? 'bg-pink-500/20 text-pink-300 border border-pink-500'
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}
                    >
                      <Heart className="w-4 h-4 inline mr-1" />
                      Favorites Only
                    </button>
                  </div>

                  <div className="flex gap-3 items-center">
                    <span className="text-sm text-gray-400">Min Rating:</span>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setFilter({ ...filter, minRating: filter.minRating === rating ? undefined : rating })}
                        className={`p-1 rounded transition-colors ${
                          filter.minRating === rating
                            ? 'bg-yellow-500/20'
                            : 'hover:bg-gray-800'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${filter.minRating === rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No history items found</p>
              {searchTerm && (
                <p className="text-sm text-gray-500 mt-2">Try a different search term</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredHistory.map((item) => (
                <HistoryItem
                  key={item.id}
                  item={item}
                  onRate={(rating) => handleRating(item.id, rating)}
                  onToggleFavorite={() => handleToggleFavorite(item.id)}
                  onDelete={() => handleDelete(item.id)}
                  onExport={() => handleExport(item)}
                  onClick={() => onSelectItem?.(item)}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const StatCard: React.FC<{ label: string; value: number; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="bg-gray-800/50 rounded-lg p-3">
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-xs text-gray-400">{label}</span>
    </div>
    <div className="text-xl font-bold text-white">{value}</div>
  </div>
);

const HistoryItem: React.FC<{
  item: GenerationHistoryItem;
  onRate: (rating: number) => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onExport: () => void;
  onClick: () => void;
}> = ({ item, onRate, onToggleFavorite, onDelete, onExport, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded text-xs text-blue-300 bg-blue-500/20">
            <ImageIcon className="w-4 h-4" />
            <span className="capitalize">{item.type === 'image' ? 'Image' : item.type}</span>
          </div>
          <span className="text-xs text-gray-500">
            {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}
          </span>
          {item.favorite && (
            <Heart className="w-4 h-4 fill-pink-500 text-pink-500" />
          )}
        </div>

        <p className="text-white font-medium mb-2 line-clamp-2">{item.prompt}</p>

        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
          <span>Provider A: {item.providerA}</span>
          <span>•</span>
          <span>Provider B: {item.providerB}</span>
          {item.crossValidation && (
            <>
              <span>•</span>
              <span>Similarity: {(item.crossValidation.similarity * 100).toFixed(0)}%</span>
            </>
          )}
        </div>

        <StarRating
          rating={item.rating}
          onChange={onRate}
          size="sm"
          showLabel={false}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title="Toggle favorite"
        >
          <Heart className={`w-4 h-4 ${item.favorite ? 'fill-pink-500 text-pink-500' : 'text-gray-400'}`} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onExport(); }}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title="Export"
        >
          <Download className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  </motion.div>
);
