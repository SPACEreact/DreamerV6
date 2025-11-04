/**
 * History Service
 * Manages generation history, ratings, and favorites
 */

export interface GenerationHistoryItem {
  id: string;
  type: 'image' | 'audio' | 'casting';
  timestamp: Date;
  prompt: string;
  providerA: string;
  providerB: string;
  resultA?: {
    url?: string;
    data?: any;
    quality?: number;
    metadata?: any;
  };
  resultB?: {
    url?: string;
    data?: any;
    quality?: number;
    metadata?: any;
  };
  rating?: number; // 1-5 stars
  favorite?: boolean;
  tags?: string[];
  notes?: string;
  crossValidation?: {
    similarity: number;
    confidence: number;
    recommendation: string;
  };
}

export interface HistoryFilter {
  type?: 'image' | 'audio' | 'casting';
  minRating?: number;
  favoritesOnly?: boolean;
  searchTerm?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
}

class HistoryService {
  private readonly STORAGE_KEY = 'dreamer_generation_history';
  private readonly MAX_HISTORY_ITEMS = 500;

  /**
   * Add a new generation to history
   */
  addToHistory(item: Omit<GenerationHistoryItem, 'id' | 'timestamp'>): string {
    const history = this.getHistory();
    const newItem: GenerationHistoryItem = {
      ...item,
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    history.unshift(newItem);

    // Limit history size
    if (history.length > this.MAX_HISTORY_ITEMS) {
      history.splice(this.MAX_HISTORY_ITEMS);
    }

    this.saveHistory(history);
    return newItem.id;
  }

  /**
   * Get all history items
   */
  getHistory(): GenerationHistoryItem[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];

      const parsed = JSON.parse(data);
      // Convert timestamp strings back to Date objects
      return parsed.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
    } catch (error) {
      console.error('Failed to load history:', error);
      return [];
    }
  }

  /**
   * Get filtered history
   */
  getFilteredHistory(filter: HistoryFilter): GenerationHistoryItem[] {
    let history = this.getHistory();

    if (filter.type) {
      history = history.filter(item => item.type === filter.type);
    }

    if (filter.minRating) {
      history = history.filter(item => (item.rating || 0) >= filter.minRating);
    }

    if (filter.favoritesOnly) {
      history = history.filter(item => item.favorite === true);
    }

    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      history = history.filter(item =>
        item.prompt.toLowerCase().includes(term) ||
        (item.notes?.toLowerCase().includes(term)) ||
        (item.tags?.some(tag => tag.toLowerCase().includes(term)))
      );
    }

    if (filter.dateFrom) {
      history = history.filter(item => item.timestamp >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      history = history.filter(item => item.timestamp <= filter.dateTo!);
    }

    if (filter.tags && filter.tags.length > 0) {
      history = history.filter(item =>
        item.tags?.some(tag => filter.tags!.includes(tag))
      );
    }

    return history;
  }

  /**
   * Get a single history item by ID
   */
  getHistoryItem(id: string): GenerationHistoryItem | null {
    const history = this.getHistory();
    return history.find(item => item.id === id) || null;
  }

  /**
   * Update rating for a history item
   */
  updateRating(id: string, rating: number): void {
    const history = this.getHistory();
    const item = history.find(h => h.id === id);
    if (item) {
      item.rating = Math.max(1, Math.min(5, rating)); // Ensure 1-5 range
      this.saveHistory(history);
    }
  }

  /**
   * Toggle favorite status
   */
  toggleFavorite(id: string): void {
    const history = this.getHistory();
    const item = history.find(h => h.id === id);
    if (item) {
      item.favorite = !item.favorite;
      this.saveHistory(history);
    }
  }

  /**
   * Add/update notes
   */
  updateNotes(id: string, notes: string): void {
    const history = this.getHistory();
    const item = history.find(h => h.id === id);
    if (item) {
      item.notes = notes;
      this.saveHistory(history);
    }
  }

  /**
   * Add tags
   */
  addTags(id: string, tags: string[]): void {
    const history = this.getHistory();
    const item = history.find(h => h.id === id);
    if (item) {
      item.tags = [...new Set([...(item.tags || []), ...tags])];
      this.saveHistory(history);
    }
  }

  /**
   * Remove tag
   */
  removeTag(id: string, tag: string): void {
    const history = this.getHistory();
    const item = history.find(h => h.id === id);
    if (item && item.tags) {
      item.tags = item.tags.filter(t => t !== tag);
      this.saveHistory(history);
    }
  }

  /**
   * Delete a history item
   */
  deleteHistoryItem(id: string): void {
    const history = this.getHistory();
    const filtered = history.filter(item => item.id !== id);
    this.saveHistory(filtered);
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const history = this.getHistory();
    return {
      total: history.length,
      byType: {
        image: history.filter(h => h.type === 'image').length,
        audio: history.filter(h => h.type === 'audio').length,
        casting: history.filter(h => h.type === 'casting').length
      },
      favorites: history.filter(h => h.favorite).length,
      averageRating: history.length > 0
        ? history.reduce((sum, h) => sum + (h.rating || 0), 0) / history.length
        : 0,
      ratedItems: history.filter(h => h.rating).length
    };
  }

  /**
   * Export history as JSON
   */
  exportHistory(): string {
    return JSON.stringify(this.getHistory(), null, 2);
  }

  /**
   * Import history from JSON
   */
  importHistory(jsonData: string): boolean {
    try {
      const parsed = JSON.parse(jsonData);
      if (!Array.isArray(parsed)) return false;
      
      const history = parsed.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
      
      this.saveHistory(history);
      return true;
    } catch (error) {
      console.error('Failed to import history:', error);
      return false;
    }
  }

  /**
   * Save history to localStorage
   */
  private saveHistory(history: GenerationHistoryItem[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }
}

export const historyService = new HistoryService();
