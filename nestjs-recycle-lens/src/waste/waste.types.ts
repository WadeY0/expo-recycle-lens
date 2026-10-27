export interface Provenance {
  title: string;
  url: string;
  publisher: string;
  scope: string;
  verification: 'reference_not_live_verified';
}
export interface WasteGuidance {
  recycling:
    | 'conditional'
    | 'special_collection'
    | 'not_curbside'
    | 'compostable';
  uncertainty: string;
  preparation: string[];
  disposal: string[];
  warnings: string[];
  hazardous: boolean;
  keywords: string[];
  examples: string[];
  illustration: { emoji: string; alt: string };
  provenance: Provenance[];
  localContext: string;
  version: string;
  reviewState: 'general_guidance_check_local_rules';
}
export interface WasteSummary {
  slug: string;
  articleId: string;
  name: string;
  nameEn: string;
  materials: string[];
  guidance: WasteGuidance;
}
export type ScanStatus =
  | 'recognized'
  | 'matched'
  | 'uncertain'
  | 'unknown'
  | 'hazardous';
export interface NormalizedScan {
  schemaVersion: 1;
  status: ScanStatus;
  label: string;
  recognitionStatus?: 'recognized' | 'uncertain' | 'unknown';
  material?: string | null;
  content?: string | null;
  contentFormat?: 'html';
  source?: 'third_party_vision';
  items?: string[];
  libraryMatchStatus?:
    | 'matched'
    | 'not_found'
    | 'withheld'
    | 'unavailable'
    | 'not_requested';
  observations: string | null;
  modelReportedConfidence: number | null;
  confidenceMeaning: 'uncalibrated_model_score' | 'not_provided';
  potentiallyHazardous: boolean;
  reasons: string[];
  matchedWaste: Omit<WasteSummary, 'guidance'> | null;
  candidates: { slug: string; articleId: string; name: string }[];
  guidance: WasteGuidance | null;
  safetyAdvice: string[];
  disclaimer: string;
}
