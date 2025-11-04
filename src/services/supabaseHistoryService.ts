/**
 * Supabase History Service
 * Cloud-based history management with cross-device sync
 */

import { supabase, GenerationHistoryRow } from '../lib/supabaseClient';
import { GenerationHistoryItem, HistoryFilter } from './historyService';

// Browser identifier for anonymous users
const getBrowserId = (): string => {
  let browserId = localStorage.getItem('dreamer_browser_id');
  if (!browserId) {
    browserId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('dreamer_browser_id', browserId);
  }
  return browserId;
};

class SupabaseHistoryService {
  private userId: string;

  constructor() {
    // Use browser ID for anonymous users
    this.userId = getBrowserId();
  }

  /**
   * Add a new generation to cloud history
   */
  async addToHistory(item: Omit<GenerationHistoryItem, 'id' | 'timestamp'>): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('generation_history')
        .insert({
          user_id: this.userId,
          type: item.type,
          prompt: item.prompt,
          provider_a: item.providerA,
          provider_b: item.providerB,
          result_a_url: item.resultA?.url,
          result_a_data: item.resultA?.data,
          result_a_quality: item.resultA?.quality,
          result_a_metadata: item.resultA?.metadata,
          result_b_url: item.resultB?.url,
          result_b_data: item.resultB?.data,
          result_b_quality: item.resultB?.quality,
          result_b_metadata: item.resultB?.metadata,
          cross_validation: item.crossValidation,
          rating: item.rating,
          is_favorite: item.favorite || false,
          tags: item.tags,
          notes: item.notes
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Failed to add to history:', error);
        throw error;
      }

      return data?.id || '';
    } catch (error) {
      console.error('Error adding to history:', error);
      throw error;
    }
  }

  /**
   * Get all history items
   */
  async getHistory(): Promise<GenerationHistoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('generation_history')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch history:', error);
        return [];
      }

      return (data || []).map(this.mapToHistoryItem);
    } catch (error) {
      console.error('Error fetching history:', error);
      return [];
    }
  }

  /**
   * Get filtered history
   */
  async getFilteredHistory(filter: HistoryFilter): Promise<GenerationHistoryItem[]> {
    try {
      let query = supabase
        .from('generation_history')
        .select('*')
        .eq('user_id', this.userId);

      // Apply filters
      if (filter.type) {
        query = query.eq('type', filter.type);
      }

      if (filter.minRating) {
        query = query.gte('rating', filter.minRating);
      }

      if (filter.favoritesOnly) {
        query = query.eq('is_favorite', true);
      }

      if (filter.searchTerm) {
        query = query.or(`prompt.ilike.%${filter.searchTerm}%,notes.ilike.%${filter.searchTerm}%`);
      }

      if (filter.dateFrom) {
        query = query.gte('created_at', filter.dateFrom.toISOString());
      }

      if (filter.dateTo) {
        query = query.lte('created_at', filter.dateTo.toISOString());
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch filtered history:', error);
        return [];
      }

      let items = (data || []).map(this.mapToHistoryItem);

      // Tag filtering (not supported by PostgreSQL query directly)
      if (filter.tags && filter.tags.length > 0) {
        items = items.filter(item =>
          item.tags?.some(tag => filter.tags!.includes(tag))
        );
      }

      return items;
    } catch (error) {
      console.error('Error fetching filtered history:', error);
      return [];
    }
  }

  /**
   * Get a single history item by ID
   */
  async getHistoryItem(id: string): Promise<GenerationHistoryItem | null> {
    try {
      const { data, error } = await supabase
        .from('generation_history')
        .select('*')
        .eq('id', id)
        .eq('user_id', this.userId)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return this.mapToHistoryItem(data);
    } catch (error) {
      console.error('Error fetching history item:', error);
      return null;
    }
  }

  /**
   * Update rating for a history item
   */
  async updateRating(id: string, rating: number): Promise<void> {
    try {
      const clampedRating = Math.max(1, Math.min(5, rating));
      
      const { error } = await supabase
        .from('generation_history')
        .update({ rating: clampedRating, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) {
        console.error('Failed to update rating:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error updating rating:', error);
      throw error;
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string): Promise<void> {
    try {
      // First get current state
      const { data: currentData } = await supabase
        .from('generation_history')
        .select('is_favorite')
        .eq('id', id)
        .eq('user_id', this.userId)
        .maybeSingle();

      const newFavoriteState = !currentData?.is_favorite;

      const { error } = await supabase
        .from('generation_history')
        .update({ 
          is_favorite: newFavoriteState,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) {
        console.error('Failed to toggle favorite:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  }

  /**
   * Add/update notes
   */
  async updateNotes(id: string, notes: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('generation_history')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) {
        console.error('Failed to update notes:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error updating notes:', error);
      throw error;
    }
  }

  /**
   * Add tags
   */
  async addTags(id: string, tags: string[]): Promise<void> {
    try {
      // Get current tags
      const { data: currentData } = await supabase
        .from('generation_history')
        .select('tags')
        .eq('id', id)
        .eq('user_id', this.userId)
        .maybeSingle();

      const currentTags = currentData?.tags || [];
      const newTags = [...new Set([...currentTags, ...tags])];

      const { error } = await supabase
        .from('generation_history')
        .update({ tags: newTags, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) {
        console.error('Failed to add tags:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error adding tags:', error);
      throw error;
    }
  }

  /**
   * Remove tag
   */
  async removeTag(id: string, tag: string): Promise<void> {
    try {
      // Get current tags
      const { data: currentData } = await supabase
        .from('generation_history')
        .select('tags')
        .eq('id', id)
        .eq('user_id', this.userId)
        .maybeSingle();

      const currentTags = currentData?.tags || [];
      const newTags = currentTags.filter(t => t !== tag);

      const { error } = await supabase
        .from('generation_history')
        .update({ tags: newTags, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) {
        console.error('Failed to remove tag:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error removing tag:', error);
      throw error;
    }
  }

  /**
   * Delete a history item
   */
  async deleteHistoryItem(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('generation_history')
        .delete()
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) {
        console.error('Failed to delete history item:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting history item:', error);
      throw error;
    }
  }

  /**
   * Clear all history for this user
   */
  async clearHistory(): Promise<void> {
    try {
      const { error } = await supabase
        .from('generation_history')
        .delete()
        .eq('user_id', this.userId);

      if (error) {
        console.error('Failed to clear history:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    try {
      const history = await this.getHistory();
      
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
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        total: 0,
        byType: { image: 0, audio: 0, casting: 0 },
        favorites: 0,
        averageRating: 0,
        ratedItems: 0
      };
    }
  }

  /**
   * Map database row to GenerationHistoryItem
   */
  private mapToHistoryItem(row: GenerationHistoryRow): GenerationHistoryItem {
    return {
      id: row.id,
      type: row.type,
      timestamp: new Date(row.created_at),
      prompt: row.prompt,
      providerA: row.provider_a,
      providerB: row.provider_b,
      resultA: row.result_a_url || row.result_a_data ? {
        url: row.result_a_url,
        data: row.result_a_data,
        quality: row.result_a_quality,
        metadata: row.result_a_metadata
      } : undefined,
      resultB: row.result_b_url || row.result_b_data ? {
        url: row.result_b_url,
        data: row.result_b_data,
        quality: row.result_b_quality,
        metadata: row.result_b_metadata
      } : undefined,
      crossValidation: row.cross_validation,
      rating: row.rating,
      favorite: row.is_favorite,
      tags: row.tags,
      notes: row.notes
    };
  }

  /**
   * Migrate local storage history to Supabase
   */
  async migrateFromLocalStorage(): Promise<number> {
    try {
      const localData = localStorage.getItem('dreamer_generation_history');
      if (!localData) {
        return 0;
      }

      const localHistory = JSON.parse(localData);
      if (!Array.isArray(localHistory) || localHistory.length === 0) {
        return 0;
      }

      let migrated = 0;
      for (const item of localHistory) {
        try {
          await this.addToHistory({
            type: item.type,
            prompt: item.prompt,
            providerA: item.providerA,
            providerB: item.providerB,
            resultA: item.resultA,
            resultB: item.resultB,
            crossValidation: item.crossValidation,
            rating: item.rating,
            favorite: item.favorite,
            tags: item.tags,
            notes: item.notes
          });
          migrated++;
        } catch (error) {
          console.error('Failed to migrate item:', error);
        }
      }

      // Clear local storage after successful migration
      if (migrated > 0) {
        localStorage.removeItem('dreamer_generation_history');
      }

      return migrated;
    } catch (error) {
      console.error('Error during migration:', error);
      return 0;
    }
  }
}

export const supabaseHistoryService = new SupabaseHistoryService();
