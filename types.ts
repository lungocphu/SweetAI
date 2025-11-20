
export type Language = 'VN' | 'EN' | 'KR';

export type ComparisonAttribute = 'product_image' | 'price' | 'flavor' | 'ingredients' | 'audience' | 'reviews' | 'pros_cons' | 'product_profile' | 'social_reviews';

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ChartData {
  type: 'bar' | 'radar';
  title?: string;
  categories: string[]; // The labels (e.g., "Price", "Sweetness", "Texture")
  series: {
    label: string; // The product name
    data: number[]; // The values
    color?: string;
  }[];
}

export interface ComparisonData {
  type: 'comparison_data';
  title?: string;
  headers: string[];
  rows: string[][];
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  sources?: GroundingChunk[];
  isStreaming?: boolean;
  timestamp: number;
  chartData?: ChartData;
  comparisonData?: ComparisonData;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}
