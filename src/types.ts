export interface ExtractedKnowledge {
  themes?: string[];
  visualStyles?: string[];
  characters?: string[];
  techniques?: string[];
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  content: string;
  extractedKnowledge?: ExtractedKnowledge;
  uploadedAt?: Date;
}

export interface PreloadedKnowledge extends KnowledgeDocument {
  extractedKnowledge: Required<ExtractedKnowledge>;
}
