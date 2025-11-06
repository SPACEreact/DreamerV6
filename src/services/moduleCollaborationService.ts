/**
 * Visual Collaboration Service
 * Lightweight utility for tracking visual insights and generating
 * recommendations for storyboard and style development.
 */

export type VisualFocus = 'composition' | 'lighting' | 'color' | 'camera' | 'general';

export interface ModuleInsight {
  module: 'visual';
  focus: VisualFocus;
  insight: string;
  relevance: 'high' | 'medium' | 'low';
  actionable: boolean;
  sharedData?: any;
}

export interface VisualRecommendation {
  focus: VisualFocus;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
}

export class ModuleCollaborationService {
  private static instance: ModuleCollaborationService;
  private insights: ModuleInsight[] = [];

  static getInstance(): ModuleCollaborationService {
    if (!ModuleCollaborationService.instance) {
      ModuleCollaborationService.instance = new ModuleCollaborationService();
    }
    return ModuleCollaborationService.instance;
  }

  /**
   * Store a new visual insight.
   */
  addVisualInsight(
    insight: string,
    options: {
      focus?: VisualFocus;
      relevance?: 'high' | 'medium' | 'low';
      actionable?: boolean;
      sharedData?: any;
    } = {}
  ): void {
    const {
      focus = 'general',
      relevance = 'medium',
      actionable = true,
      sharedData
    } = options;

    const newInsight: ModuleInsight = {
      module: 'visual',
      focus,
      insight,
      relevance,
      actionable,
      sharedData
    };

    this.insights.push(newInsight);
  }

  /**
   * Retrieve all recorded insights.
   */
  getAllInsights(): ModuleInsight[] {
    return [...this.insights];
  }

  /**
   * Remove all stored insights – useful when starting a fresh project.
   */
  clearInsights(): void {
    this.insights = [];
  }

  /**
   * Generate recommendations based on current insight coverage.
   */
  getRecommendations(): VisualRecommendation[] {
    if (this.insights.length === 0) {
      return [
        {
          focus: 'general',
          suggestion: 'Document key takeaways from recent reviews to guide the next visual pass.',
          priority: 'medium',
          rationale: 'No visual insights have been captured yet.'
        }
      ];
    }

    const focusCounts: Record<VisualFocus, number> = {
      composition: 0,
      lighting: 0,
      color: 0,
      camera: 0,
      general: 0
    };

    const highRelevanceByFocus: Record<VisualFocus, number> = {
      composition: 0,
      lighting: 0,
      color: 0,
      camera: 0,
      general: 0
    };

    const lowInsights = this.insights.filter(i => i.relevance === 'low').length;

    for (const insight of this.insights) {
      focusCounts[insight.focus] += 1;
      if (insight.relevance === 'high') {
        highRelevanceByFocus[insight.focus] += 1;
      }
    }

    const recommendations: VisualRecommendation[] = [];

    const focusGuidance: Record<Exclude<VisualFocus, 'general'>, VisualRecommendation> = {
      composition: {
        focus: 'composition',
        suggestion: 'Capture staging notes so blocking stays aligned with story beats.',
        priority: 'medium',
        rationale: 'Composition insights are missing – outline subject placement for upcoming shots.'
      },
      lighting: {
        focus: 'lighting',
        suggestion: 'Define lighting ratios or key motifs to preserve the intended mood.',
        priority: 'medium',
        rationale: 'Lighting direction has not been documented for this sequence.'
      },
      color: {
        focus: 'color',
        suggestion: 'Summarize palette decisions to keep grading consistent between frames.',
        priority: 'medium',
        rationale: 'Color considerations are absent from the current insight set.'
      },
      camera: {
        focus: 'camera',
        suggestion: 'Outline camera moves and lens choices to coordinate previs with production.',
        priority: 'medium',
        rationale: 'Camera movement notes are missing and should be recorded.'
      }
    };

    (Object.keys(focusGuidance) as Array<Exclude<VisualFocus, 'general'>>).forEach(focus => {
      if (focusCounts[focus] === 0) {
        recommendations.push(focusGuidance[focus]);
      }
    });

    const dominantFocus = (['composition', 'lighting', 'color', 'camera'] as VisualFocus[])
      .map(focus => ({ focus, high: highRelevanceByFocus[focus] }))
      .sort((a, b) => b.high - a.high)[0];

    if (dominantFocus && dominantFocus.high >= 2) {
      recommendations.push({
        focus: dominantFocus.focus,
        suggestion: `Elevate the ${dominantFocus.focus} work into a style reference for the team.`,
        priority: 'medium',
        rationale: 'Multiple high-value insights target this focus area – consolidate them into a shareable artifact.'
      });
    }

    if (lowInsights > 0) {
      recommendations.push({
        focus: 'general',
        suggestion: 'Review low-confidence notes and clarify any open visual questions.',
        priority: lowInsights > 2 ? 'high' : 'medium',
        rationale: `${lowInsights} insight${lowInsights === 1 ? '' : 's'} marked low relevance may need follow-up.`
      });
    }

    return recommendations;
  }

  /**
   * Analyse overall project coherence from the collected insights.
   */
  analyzeProjectCoherence(): {
    score: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } {
    if (this.insights.length === 0) {
      return {
        score: 40,
        strengths: ['Visual collaboration has not started yet.'],
        weaknesses: ['No visual insights captured to guide decision making.'],
        recommendations: [
          'Log the latest storyboard feedback before the next iteration.',
          'Add lighting or color notes to establish the project mood.'
        ]
      };
    }

    const highCount = this.insights.filter(i => i.relevance === 'high').length;
    const lowCount = this.insights.filter(i => i.relevance === 'low').length;
    const focusCoverage = new Set(
      this.insights
        .filter(i => i.focus !== 'general')
        .map(i => i.focus)
    );

    let score = 55;
    score += highCount * 8;
    score += focusCoverage.size * 6;
    score -= lowCount * 4;
    score = Math.max(0, Math.min(100, score));

    const strengths: string[] = [];
    if (highCount > 0) {
      strengths.push('High-value visual insights captured.');
    }
    if (focusCoverage.size >= 3) {
      strengths.push('Multiple visual disciplines are represented in the notes.');
    }
    if (strengths.length === 0) {
      strengths.push('Initial visual insights available for review.');
    }

    const weaknesses: string[] = [];
    if (focusCoverage.size < 2) {
      weaknesses.push('Visual documentation is concentrated in a single area.');
    }
    if (lowCount > highCount) {
      weaknesses.push('Several insights are low-confidence and require clarification.');
    }

    const recommendations = this.getRecommendations().slice(0, 3).map(r => r.suggestion);

    return {
      score,
      strengths,
      weaknesses,
      recommendations
    };
  }
}

export const moduleCollaborationService = ModuleCollaborationService.getInstance();
