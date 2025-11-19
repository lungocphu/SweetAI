export type Language = 'VN' | 'EN' | 'KR';

export type ComparisonAttribute = 'product_image' | 'price' | 'flavor' | 'ingredients' | 'audience' | 'reviews' | 'pros_cons' | 'product_profile' | 'social_reviews';

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  sources?: GroundingChunk[];
  isStreaming?: boolean;
  timestamp: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}