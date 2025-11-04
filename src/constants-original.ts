// Original Dreamer-V5 Questions (27-28 Questions)
// Organized into 8 phases for 8-box progress indicator

export interface Question {
  id: string;
  phase: number; // 1-8 for 8-box progress system
  category: string;
  question: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number';
  options?: string[];
  placeholder?: string;
  randomOptions?: string[];
}

// PHASE 1: Script Foundation (4 questions)
const phase1Questions: Question[] = [
  {
    id: 'projectTitle',
    phase: 1,
    category: 'Script Foundation',
    question: 'What is the title or working name of your project?',
    type: 'text',
    placeholder: 'The Editing Room, Station Crimson, Surf Whispers...'
  },
  {
    id: 'scriptText',
    phase: 1,
    category: 'Script Foundation',
    question: 'Optional: Share your script fragment or scene description',
    type: 'textarea',
    placeholder: 'Drop in a fragment if you want Dreamer to adapt pacing and continuity from the page.',
    randomOptions: [
      'He edits reels of his past while rain combs the window.',
      'She waits in a station bathed in crimson departures.',
      'They argue in whispers beneath the crashing surf.'
    ]
  },
  {
    id: 'sceneLocation',
    phase: 1,
    category: 'Script Foundation',
    question: 'Where does this scene take place?',
    type: 'text',
    placeholder: 'Dark editing room, train station, motel balcony, candle-lit attic...',
    randomOptions: [
      'A cluttered editing room with rain-streaked windows',
      'An empty train station with red neon signs',
      'A windswept beach at twilight'
    ]
  },
  {
    id: 'sceneTime',
    phase: 1,
    category: 'Script Foundation',
    question: 'What time of day or night is this scene?',
    type: 'select',
    options: ['Dawn', 'Morning', 'Afternoon', 'Golden Hour', 'Dusk', 'Night', 'Midnight', 'Timeless']
  }
];

// PHASE 2: Technical Setup (4 questions)
const phase2Questions: Question[] = [
  {
    id: 'sceneCore',
    phase: 2,
    category: 'Technical Setup',
    question: 'Describe your scene: who, what, emotion + shots + camera + focal length',
    type: 'textarea',
    placeholder: 'A man edits reels of his past in a dark room while rain falls. 5 shots, Arri Alexa 65, 35mm cinematic',
    randomOptions: [
      'A woman reading letters in candlelit attic. 3 shots, Sony Venice 2, 50mm human-eye',
      'Two siblings argue on motel balcony. 7 shots, Red Monstro 8K, 85mm intimate'
    ]
  },
  {
    id: 'cameraChoice',
    phase: 2,
    category: 'Technical Setup',
    question: 'Choose your camera system',
    type: 'select',
    options: [
      'Arri Alexa 65',
      'Sony Venice 2',
      'Red Monstro 8K',
      'Blackmagic Pocket 6K',
      'Canon C300 Mark III',
      'Panasonic Varicam',
      'Other/Custom'
    ]
  },
  {
    id: 'focalLength',
    phase: 2,
    category: 'Technical Setup',
    question: 'Primary focal length for this sequence',
    type: 'select',
    options: [
      '24mm wide epic',
      '35mm cinematic standard',
      '50mm natural human-eye',
      '85mm intimate portrait',
      '135mm compressed telephoto',
      'Variable/Mixed'
    ]
  },
  {
    id: 'depthOfField',
    phase: 2,
    category: 'Technical Setup',
    question: 'Set depth of field for your sequence',
    type: 'select',
    options: [
      'f/1.4 dreamy shallow',
      'f/2.8 cinematic shallow',
      'f/5.6 balanced',
      'f/8 moderate deep',
      'f/11 deep focus',
      'f/16 extreme depth'
    ]
  }
];

// PHASE 3: Visual Composition (3 questions)
const phase3Questions: Question[] = [
  {
    id: 'framing',
    phase: 3,
    category: 'Visual Composition',
    question: 'Choose composition + camera angle + character blocking in one',
    type: 'textarea',
    placeholder: 'Rule of thirds with eye-level witness. Protagonist centered in soft light, edge isolation for conflict.',
    randomOptions: [
      'Negative space with low-angle reverence. Protagonist edge isolation, background silhouettes',
      'Golden ratio with high-angle confession. Centered protagonist, overlapping movement'
    ]
  },
  {
    id: 'shotSize',
    phase: 3,
    category: 'Visual Composition',
    question: 'Primary shot sizes in this sequence (select all that apply)',
    type: 'multiselect',
    options: [
      'Extreme Wide Shot (EWS)',
      'Wide Shot (WS)',
      'Medium Shot (MS)',
      'Close-Up (CU)',
      'Extreme Close-Up (ECU)',
      'Insert/Detail Shot'
    ]
  },
  {
    id: 'compositionRule',
    phase: 3,
    category: 'Visual Composition',
    question: 'Primary composition technique',
    type: 'select',
    options: [
      'Rule of thirds',
      'Golden ratio / Phi grid',
      'Center framing / Symmetry',
      'Negative space dominance',
      'Leading lines',
      'Frame within frame',
      'Dynamic diagonal'
    ]
  }
];

// PHASE 4: Character & Blocking (4 questions)
const phase4Questions: Question[] = [
  {
    id: 'characterCount',
    phase: 4,
    category: 'Character & Blocking',
    question: 'How many characters are visible in this scene?',
    type: 'select',
    options: ['Solo / 1 character', '2 characters', '3 characters', '4+ characters', 'Crowd/Many']
  },
  {
    id: 'characterChoreography',
    phase: 4,
    category: 'Character & Blocking',
    question: 'Describe all character positions and tensions in the frame',
    type: 'textarea',
    placeholder: 'Main: centered in glow of single practical. Secondary: midground silhouettes. Opposition: off-frame shadow creeping along wall.',
    randomOptions: [
      'Main: edge isolation, half in shadow. Secondary: background figures through frosted glass. Opposition: rear silhouette behind gauze curtain.'
    ]
  },
  {
    id: 'characterMovement',
    phase: 4,
    category: 'Character & Blocking',
    question: 'Character movement style',
    type: 'select',
    options: [
      'Static / Motionless',
      'Slow deliberate',
      'Natural walking pace',
      'Energetic / Fast',
      'Chaotic / Frantic',
      'Choreographed / Dance-like'
    ]
  },
  {
    id: 'characterEmotion',
    phase: 4,
    category: 'Character & Blocking',
    question: 'Dominant emotional atmosphere',
    type: 'select',
    options: [
      'Contemplative / Reflective',
      'Tense / Anxious',
      'Joyful / Euphoric',
      'Melancholic / Sad',
      'Angry / Confrontational',
      'Serene / Peaceful',
      'Conflicted / Ambiguous',
      'Mysterious / Enigmatic'
    ]
  }
];

// PHASE 5: Lighting & Atmosphere (4 questions)
const phase5Questions: Question[] = [
  {
    id: 'lightingAtmosphere',
    phase: 5,
    category: 'Lighting & Atmosphere',
    question: 'Lighting mood + technical setup + atmosphere',
    type: 'textarea',
    placeholder: 'Chiaroscuro contrast with 4:1 ratio and halation glow. Slow rain trembling against panes, volumetric fog.',
    randomOptions: [
      'Golden hour glow with twin practicals. Floating dust motes in projector light, tungsten haze.',
      'Silhouette rim with underexposed edges. Moonlit reflection, fluorescent spill.'
    ]
  },
  {
    id: 'lightingStyle',
    phase: 5,
    category: 'Lighting & Atmosphere',
    question: 'Lighting approach',
    type: 'select',
    options: [
      'Natural / Available light only',
      'Three-point classic setup',
      'Chiaroscuro / High contrast',
      'Soft / Diffused beauty',
      'Silhouette / Rim lighting',
      'Practical lights only',
      'Hard dramatic shadows',
      'Volumetric / Atmospheric'
    ]
  },
  {
    id: 'atmosphericEffects',
    phase: 5,
    category: 'Lighting & Atmosphere',
    question: 'Atmospheric effects (select all that apply)',
    type: 'multiselect',
    options: [
      'Fog / Haze',
      'Rain',
      'Snow',
      'Dust motes / Particles',
      'Smoke',
      'Volumetric light shafts',
      'Lens flare',
      'None / Clean air'
    ]
  },
  {
    id: 'lightingRatio',
    phase: 5,
    category: 'Lighting & Atmosphere',
    question: 'Lighting contrast ratio (key to fill)',
    type: 'select',
    options: [
      '1:1 flat / No shadows',
      '2:1 low contrast',
      '4:1 moderate drama',
      '8:1 dramatic contrast',
      '16:1 extreme noir'
    ]
  }
];

// PHASE 6: Color & Film Stock (3 questions)
const phase6Questions: Question[] = [
  {
    id: 'visualStyle',
    phase: 6,
    category: 'Color & Film Stock',
    question: 'Film stock + texture + color grade + palette',
    type: 'textarea',
    placeholder: 'Kodak Vision3 500T 5219 with 35mm grain. Teal-orange tension. Background #1A1F2B, midtone #4A6C6F, highlight #F2C27E',
    randomOptions: [
      'Fuji Eterna with halation bloom. Noir desaturation. Background #120E1A, midtone #3B2F58, highlight #E6B4F6',
      'Polaroid pastel dream with medium ISO texture. Golden warmth. Dominant teal shadows, warm peach highlights.'
    ]
  },
  {
    id: 'filmStock',
    phase: 6,
    category: 'Color & Film Stock',
    question: 'Choose film stock or digital aesthetic',
    type: 'select',
    options: [
      'Kodak Vision3 500T (cinematic)',
      'Kodak Vision3 250D (daylight)',
      'Fuji Eterna (warm nostalgic)',
      'Kodak Portra (portrait beauty)',
      'Digital Clean (modern)',
      'Polaroid / Instant film',
      'VHS / Lo-fi vintage',
      '16mm grainy texture',
      'Super 8 home movie'
    ]
  },
  {
    id: 'colorPalette',
    phase: 6,
    category: 'Color & Film Stock',
    question: 'Primary color palette direction',
    type: 'select',
    options: [
      'Teal and Orange (blockbuster)',
      'Noir Desaturation (b&w leaning)',
      'Golden Hour Warmth',
      'Cool Blue Moonlight',
      'Sepia / Vintage Yellow',
      'Vibrant / Saturated pop',
      'Pastel Dream',
      'Neon Cyberpunk',
      'Earth Tones / Natural'
    ]
  }
];

// PHASE 7: Story Voice & Identity (3 questions)
const phase7Questions: Question[] = [
  {
    id: 'narrativeVoice',
    phase: 7,
    category: 'Story Voice & Identity',
    question: 'Poetic line + visual identity + continuity',
    type: 'textarea',
    placeholder: 'He edits by rhythm now, not reason. Cinematic, painterly, liminal. Tight continuity with mutated seeds.',
    randomOptions: [
      'Her laughter flickers against the wall like a ghost of light. Mythic surrealism, emotional realism. Poetic drift with rhythm-based motif.'
    ]
  },
  {
    id: 'visualIdentity',
    phase: 7,
    category: 'Story Voice & Identity',
    question: 'Overall visual identity / genre aesthetic',
    type: 'select',
    options: [
      'Cinematic / Filmic realism',
      'Painterly / Impressionistic',
      'Documentary / Verite',
      'Surreal / Dreamlike',
      'Mythic / Epic',
      'Noir / Shadow world',
      'Experimental / Avant-garde',
      'Music video / Rhythmic',
      'Memory / Nostalgic'
    ]
  },
  {
    id: 'pacing',
    phase: 7,
    category: 'Story Voice & Identity',
    question: 'Sequence pacing and rhythm',
    type: 'select',
    options: [
      'Contemplative / Slow meditation',
      'Measured / Deliberate unfolding',
      'Natural / Conversational',
      'Energetic / Fast cut',
      'Rhythmic / Musical beat',
      'Chaotic / Disorienting'
    ]
  }
];

// PHASE 8: Output & Finalization (3 questions)
const phase8Questions: Question[] = [
  {
    id: 'outputSettings',
    phase: 8,
    category: 'Final Output',
    question: 'Output format + fidelity + motion style',
    type: 'textarea',
    placeholder: 'Cinematic frame with 4K render and focus pull from background to foreground. Steadycam drift.',
    randomOptions: [
      'Storyboard with filmic softness and breathing zoom drift. Static contemplation.',
      'AI film still with photoreal detail and razor still focus. Orbital pan.'
    ]
  },
  {
    id: 'aspectRatio',
    phase: 8,
    category: 'Final Output',
    question: 'Aspect ratio',
    type: 'select',
    options: [
      '16:9 Standard HD',
      '2.39:1 Anamorphic widescreen',
      '2.35:1 Cinemascope',
      '1.85:1 Classic cinema',
      '4:3 Classic TV / Academy',
      '1:1 Square / Instagram',
      '9:16 Vertical / Mobile'
    ]
  },
  {
    id: 'cameraMovement',
    phase: 8,
    category: 'Final Output',
    question: 'Primary camera movement style',
    type: 'select',
    options: [
      'Static / Locked tripod',
      'Handheld / Documentary',
      'Steadicam / Fluid glide',
      'Dolly / Track movement',
      'Crane / Jib sweep',
      'Gimbal / Smooth follow',
      'Drone / Aerial',
      'Push in / Pull out',
      'Orbital / Circular'
    ]
  }
];

// Combine all questions (total: 28 questions)
export const originalQuestions: Question[] = [
  ...phase1Questions,   // 4 questions
  ...phase2Questions,   // 4 questions
  ...phase3Questions,   // 3 questions
  ...phase4Questions,   // 4 questions
  ...phase5Questions,   // 4 questions
  ...phase6Questions,   // 3 questions
  ...phase7Questions,   // 3 questions
  ...phase8Questions    // 3 questions
];

// Phase metadata for 8-box progress indicator
export const phaseMetadata = [
  { phase: 1, name: 'Script Foundation', icon: 'FileText', color: 'amber' },
  { phase: 2, name: 'Technical Setup', icon: 'Camera', color: 'amber' },
  { phase: 3, name: 'Visual Composition', icon: 'Layout', color: 'amber' },
  { phase: 4, name: 'Character & Blocking', icon: 'Users', color: 'amber' },
  { phase: 5, name: 'Lighting & Atmosphere', icon: 'Zap', color: 'amber' },
  { phase: 6, name: 'Color & Film Stock', icon: 'Palette', color: 'amber' },
  { phase: 7, name: 'Story Voice', icon: 'BookOpen', color: 'amber' },
  { phase: 8, name: 'Output Settings', icon: 'Film', color: 'amber' }
];

// Helper function to get phase for a question index
export const getPhaseForQuestion = (questionIndex: number): number => {
  if (questionIndex < 0) return 1;
  if (questionIndex >= originalQuestions.length) return 8;
  return originalQuestions[questionIndex].phase;
};

// Helper function to get questions for a specific phase
export const getQuestionsForPhase = (phase: number): Question[] => {
  return originalQuestions.filter(q => q.phase === phase);
};

// Helper function to check if all questions in a phase are answered
export const isPhaseComplete = (phase: number, promptData: any): boolean => {
  const phaseQuestions = getQuestionsForPhase(phase);
  return phaseQuestions.every(q => {
    const value = promptData[q.id];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== '';
  });
};

// Export for backward compatibility
export const questions = originalQuestions;
