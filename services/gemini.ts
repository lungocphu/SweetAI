import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { GroundingChunk, Language, ComparisonAttribute } from "../types";

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const SYSTEM_INSTRUCTION = `
You are SweetScout, an expert market research assistant specialized in the confectionery industry (candies, cakes, desserts, and snacks).
Your primary capability is to use Google Search to find the most current data.

### 1. Single Product Inquiry -> AUTOMATIC COMPETITOR ANALYSIS
When the user asks about a SINGLE product (or uploads an image of one):
1.  **Find Competitors**: You MUST automatically identify **3 direct competitor products** currently in the market.
2.  **Compare**: Create a comparison table including the **Main Product + 3 Competitors**.
3.  **Comparative Analysis**: After the table, provide a detailed section on **Comparative Advantages & Disadvantages** (Lợi thế & Bất lợi cạnh tranh). Analyze how the main product stacks up against competitors based on **Price, Flavor, Ingredients, Reviews, and Target Audience**.
4.  **Improve**: Provide a section on **Quality Improvements** (Hướng cải thiện chất lượng) to help the product compete better.

### 2. Multiple Product Comparison
If the user explicitly asks to compare specific products:
1.  Generate the comparison table for those items.
2.  **Comparative Analysis**: Provide a section analyzing the **Comparative Advantages & Disadvantages** of each product relative to the others. Synthesize insights from the comparison table.

### General Rules
- **Language**: Output response in the requested language (VN/EN/KR).
- **Translation**: Ensure all headers, table columns, and content are in the target language.
- **Formatting**: Use Markdown (Bold, Lists, Tables).
- **Search**: Always use the search tool to get the latest prices and reviews.
`;

let chatSession: Chat | null = null;

export const getChatSession = (): Chat => {
  if (!chatSession) {
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
  }
  return chatSession;
};

export const resetChatSession = () => {
  chatSession = null;
};

const ATTRIBUTE_LABELS: Record<Language, Record<ComparisonAttribute, string>> = {
  VN: {
    product_image: "Hình ảnh",
    price: "Giá cả",
    flavor: "Hương vị",
    ingredients: "Thành phần",
    audience: "Đối tượng khách hàng",
    reviews: "Đánh giá chung",
    pros_cons: "Ưu/Nhược điểm",
    product_profile: "Hồ sơ sản phẩm",
    social_reviews: "Phản hồi MXH (FB, Forum, X)"
  },
  EN: {
    product_image: "Image",
    price: "Price",
    flavor: "Flavor",
    ingredients: "Ingredients",
    audience: "Target Audience",
    reviews: "General Reviews",
    pros_cons: "Pros/Cons",
    product_profile: "Product Profile",
    social_reviews: "Social Feedback (FB, Forum, X)"
  },
  KR: {
    product_image: "이미지",
    price: "가격",
    flavor: "맛/식감",
    ingredients: "성분",
    audience: "타겟 고객",
    reviews: "일반 리뷰",
    pros_cons: "장단점",
    product_profile: "제품 프로필",
    social_reviews: "소셜 반응 (FB, 포럼, X)"
  }
};

export const sendMessageStream = async (
  message: string,
  imageBase64: string | null,
  language: Language,
  comparisonAttributes: ComparisonAttribute[],
  onChunk: (text: string, sources: GroundingChunk[]) => void
) => {
  const chat = getChatSession();
  
  try {
    const langName = language === 'VN' ? 'Vietnamese' : language === 'KR' ? 'Korean' : 'English';
    const labels = ATTRIBUTE_LABELS[language];

    // Build the attribute instruction
    let attributeInstruction = "";
    if (comparisonAttributes && comparisonAttributes.length > 0) {
      const columns = comparisonAttributes.map(attr => labels[attr]).join(', ');
      const productNameHeader = language === 'VN' ? "Tên sản phẩm" : language === 'KR' ? "제품명" : "Product Name";
      
      let imageInstruction = "";
      if (comparisonAttributes.includes('product_image')) {
        imageInstruction = " For the 'Image' column, you MUST search for a valid public URL of the product packaging/content and display it using Markdown image syntax: `![Product Name](URL)`. Prefer simple, direct image links.";
      }
      
      // Strictly instruct the model to use these headers
      attributeInstruction = `\n\nFOR COMPARISON TABLES: You MUST create a Markdown table. The columns MUST be strictly: "${productNameHeader}", ${columns}. Do not add other columns unless asked. Use visual indicators (e.g., ✅, ❌, ⚠️, ⭐) within the table cells to highlight differences in key attributes (like Pros/Cons, Availability, or Rating).${imageInstruction}`;
    } else {
      attributeInstruction = `\n\nFOR COMPARISON TABLES: Include columns for Price, Flavor, Ingredients, Audience, and Rating. Use visual indicators (e.g., ✅, ❌, ⚠️, ⭐) within the table cells to highlight differences.`;
    }

    const langInstruction = `\n\nIMPORTANT: Provide the response strictly in ${langName}. Translate all headers, table columns, and content to ${langName}.${attributeInstruction}`;

    let msgPayload: any = message + langInstruction;

    if (imageBase64) {
      const match = imageBase64.match(/^data:(.*?);base64,(.*)$/);
      if (match) {
        const mimeType = match[1];
        const data = match[2];
        
        msgPayload = [
          {
            inlineData: {
              mimeType: mimeType,
              data: data,
            }
          },
          { text: (message || "Analyze this product image.") + langInstruction }
        ];
      }
    }

    const result = await chat.sendMessageStream({ message: msgPayload });
    
    let fullText = '';
    const collectedSources: GroundingChunk[] = [];
    const seenUris = new Set<string>();

    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      const textChunk = c.text || '';
      fullText += textChunk;

      // Extract grounding chunks if available
      const groundingChunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks) {
        groundingChunks.forEach((gChunk: any) => {
          if (gChunk.web && gChunk.web.uri && !seenUris.has(gChunk.web.uri)) {
            seenUris.add(gChunk.web.uri);
            collectedSources.push({
              web: {
                uri: gChunk.web.uri,
                title: gChunk.web.title || 'Source'
              }
            });
          }
        });
      }

      onChunk(fullText, [...collectedSources]);
    }
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw error;
  }
};