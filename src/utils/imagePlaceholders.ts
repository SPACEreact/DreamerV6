type PlaceholderCategory = 'cinematic' | 'explainer';

export interface PlaceholderStyle {
  id: string;
  title: string;
  tagline: string;
  gradient: [string, string];
  accent: string;
  accentSecondary: string;
  category: PlaceholderCategory;
  keywords: string[];
}

const FALLBACK_STYLES: PlaceholderStyle[] = [
  {
    id: 'dramatic-atmosphere',
    title: 'Cinematic Atmosphere',
    tagline: 'Dramatic lighting & storytelling depth',
    gradient: ['#0f172a', '#1e293b'],
    accent: '#f97316',
    accentSecondary: '#fbbf24',
    category: 'cinematic',
    keywords: ['dramatic', 'shadow', 'haze', 'rain', 'noir', 'night']
  },
  {
    id: 'warm-interior',
    title: 'Warm Interior',
    tagline: 'Golden hour intimacy & soft focus',
    gradient: ['#1f1d2b', '#312c45'],
    accent: '#f59e0b',
    accentSecondary: '#f87171',
    category: 'cinematic',
    keywords: ['warm', 'coffee', 'interior', 'practical', 'glow', 'evening']
  },
  {
    id: 'landscape-scope',
    title: 'Epic Scope',
    tagline: 'Sweeping vistas & expansive worlds',
    gradient: ['#0b1120', '#1d283a'],
    accent: '#38bdf8',
    accentSecondary: '#0ea5e9',
    category: 'cinematic',
    keywords: ['landscape', 'sunset', 'wide', 'mountain', 'ocean', 'journey']
  },
  {
    id: 'action-momentum',
    title: 'Dynamic Momentum',
    tagline: 'Motion, energy & kinetic framing',
    gradient: ['#111827', '#1f2937'],
    accent: '#ef4444',
    accentSecondary: '#f97316',
    category: 'cinematic',
    keywords: ['action', 'chase', 'fight', 'movement', 'momentum', 'speed']
  },
  {
    id: 'character-focus',
    title: 'Character Focus',
    tagline: 'Emotional portraits & intimate light',
    gradient: ['#111b2b', '#1f2a3b'],
    accent: '#c084fc',
    accentSecondary: '#f472b6',
    category: 'cinematic',
    keywords: ['character', 'close-up', 'emotion', 'portrait', 'eyes', 'intimate']
  },
  {
    id: 'explainer-clean',
    title: 'Explainer Studio',
    tagline: 'Clarity, balance & friendly storytelling',
    gradient: ['#0f172a', '#0e7490'],
    accent: '#22d3ee',
    accentSecondary: '#a855f7',
    category: 'explainer',
    keywords: ['explainer', 'infographic', 'instructional', 'educational', 'product']
  },
  {
    id: 'explainer-playful',
    title: 'Playful Narrative',
    tagline: 'Vivid palettes & approachable visuals',
    gradient: ['#111827', '#7c3aed'],
    accent: '#f472b6',
    accentSecondary: '#facc15',
    category: 'explainer',
    keywords: ['friendly', 'playful', 'bright', 'whimsical', 'colorful']
  }
];

export const MINIMAL_PLACEHOLDER_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHgwLjPNl16QAAAABJRU5ErkJggg==';

const SPECIAL_TERM_BONUS: Array<{ terms: string[]; score: number }> = [
  { terms: ['close-up', 'closeup', 'eyes', 'face', 'portrait'], score: 3 },
  { terms: ['wide', 'landscape', 'establishing', 'horizon'], score: 3 },
  { terms: ['interior', 'cafe', 'room', 'studio'], score: 2 },
  { terms: ['action', 'dynamic', 'movement', 'chase'], score: 3 },
  { terms: ['light', 'lighting', 'shadow', 'atmosphere'], score: 2 },
  { terms: ['explain', 'tutorial', 'guide', 'educate'], score: 2 }
];

const DEFAULT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '1:1': { width: 1024, height: 1024 },
  '4:3': { width: 1280, height: 960 },
  '3:4': { width: 960, height: 1280 }
};

const getDimensions = (aspectRatio: string): { width: number; height: number } => {
  return DEFAULT_DIMENSIONS[aspectRatio] || DEFAULT_DIMENSIONS['16:9'];
};

const normalize = (value: string) => value.trim().toLowerCase();

const summarizeDocKeywords = (keywords: string[]): string => {
  return Array.from(new Set(keywords.map(keyword => keyword.trim()))).filter(Boolean).join(', ');
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): number => {
  const words = text.split(/\s+/g);
  let line = '';
  let currentY = y;
  let lineCount = 0;

  for (let i = 0; i < words.length; i += 1) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, currentY);
      line = words[i];
      currentY += lineHeight;
      lineCount += 1;
      if (lineCount >= maxLines) {
        const remaining = words.slice(i).join(' ');
        const truncated = truncateText(remaining, Math.floor(maxWidth / (ctx.measureText('M').width || 1)));
        ctx.fillText(`${truncated}…`, x, currentY);
        return currentY + lineHeight;
      }
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }

  return currentY;
};

const truncateText = (text: string, maxChars: number): string => {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  return truncated.replace(/\s+\S*$/, '').trim();
};

const sanitizePrompt = (prompt: string): string => {
  return (prompt || '')
    .replace(/\s+/g, ' ')
    .replace(/["'<>{}]/g, '')
    .trim();
};

const scoreStyle = (promptLower: string, style: PlaceholderStyle): number => {
  let score = 0;
  style.keywords.forEach(keyword => {
    if (promptLower.includes(keyword)) {
      score += 2;
    }
  });

  SPECIAL_TERM_BONUS.forEach(({ terms, score: bonus }) => {
    terms.forEach(term => {
      if (promptLower.includes(term)) {
        score += bonus;
      }
    });
  });

  return score;
};

export const selectFallbackStyle = (
  prompt: string,
  category: PlaceholderCategory = 'cinematic'
): PlaceholderStyle => {
  const promptLower = prompt.toLowerCase();
  const candidates = FALLBACK_STYLES.filter(style => style.category === category);
  const pool = candidates.length > 0 ? candidates : FALLBACK_STYLES;

  const scored = pool.map(style => ({
    style,
    score: scoreStyle(promptLower, style) + (style.category === category ? 1 : 0)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.style || FALLBACK_STYLES[0];
};

export const renderPlaceholderBase64 = (
  prompt: string,
  aspectRatio: string,
  style: PlaceholderStyle
): string => {
  try {
    if (typeof document === 'undefined') {
      return MINIMAL_PLACEHOLDER_BASE64;
    }

    const { width, height } = getDimensions(aspectRatio);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return MINIMAL_PLACEHOLDER_BASE64;
    }

    // Background gradient
    const background = ctx.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, style.gradient[0]);
    background.addColorStop(1, style.gradient[1]);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    // Accent overlay
    const accent = ctx.createLinearGradient(0, height * 0.6, width, height);
    accent.addColorStop(0, `${style.accent}AA`);
    accent.addColorStop(1, `${style.accentSecondary}80`);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, height * 0.55);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Decorative shapes
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = style.accent;
    ctx.beginPath();
    ctx.ellipse(width * 0.85, height * 0.2, width * 0.2, height * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(width * 0.2, height * 0.7, width * 0.25, height * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const padding = Math.round(width * 0.08);
    const sanitizedPrompt = sanitizePrompt(prompt);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(height * 0.08)}px "Inter", "Helvetica", sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(style.title, padding, padding);

    // Tagline
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `500 ${Math.round(height * 0.045)}px "Inter", "Helvetica", sans-serif`;
    const taglineY = padding + Math.round(height * 0.1);
    wrapText(ctx, style.tagline, padding, taglineY, width - padding * 2, Math.round(height * 0.05), 2);

    // Prompt summary block
    const summaryY = padding + Math.round(height * 0.22);
    const summaryHeight = Math.round(height * 0.28);
    ctx.fillStyle = '#0f172aAA';
    ctx.fillRect(padding, summaryY, width - padding * 2, summaryHeight);

    ctx.fillStyle = '#fbbf24';
    ctx.font = `600 ${Math.round(height * 0.04)}px "Inter", "Helvetica", sans-serif`;
    ctx.fillText('Scene Preview', padding + Math.round(width * 0.02), summaryY + Math.round(height * 0.03));

    ctx.fillStyle = '#e2e8f0';
    ctx.font = `400 ${Math.round(height * 0.035)}px "Inter", "Helvetica", sans-serif`;
    const promptStartY = summaryY + Math.round(height * 0.08);
    wrapText(
      ctx,
      truncateText(sanitizedPrompt, 220),
      padding + Math.round(width * 0.02),
      promptStartY,
      width - padding * 2 - Math.round(width * 0.04),
      Math.round(height * 0.045),
      3
    );

    // Footer metadata
    ctx.fillStyle = '#cbd5f5';
    ctx.font = `500 ${Math.round(height * 0.035)}px "Inter", "Helvetica", sans-serif`;
    const footerY = height - padding - Math.round(height * 0.08);
    ctx.fillText('Dreamer AI Fallback Preview', padding, footerY);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `400 ${Math.round(height * 0.03)}px "Inter", "Helvetica", sans-serif`;
    ctx.fillText(`Optimized for ${style.category === 'cinematic' ? 'cinematic storytelling' : 'explainer clarity'}`, padding, footerY + Math.round(height * 0.045));

    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.split(',')[1] || MINIMAL_PLACEHOLDER_BASE64;
  } catch (error) {
    return MINIMAL_PLACEHOLDER_BASE64;
  }
};

export const describeStyle = (style: PlaceholderStyle): string => {
  return `${style.title} — ${style.tagline}. Keywords: ${summarizeDocKeywords(style.keywords)}`;
};

export { FALLBACK_STYLES };

