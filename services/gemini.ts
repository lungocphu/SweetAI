
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { GroundingChunk, Language, ComparisonAttribute, ChartData, ComparisonData } from "../types";

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const SYSTEM_INSTRUCTION = `
You are SweetScout, an expert market research assistant specialized in the confectionery industry (candies, cakes, desserts, and snacks).
You have access to **Google Search** for real-time data.

### 1. Single Product Inquiry -> AUTOMATIC COMPETITOR ANALYSIS
When the user asks about a SINGLE product (or uploads an image of one):
1.  **Find Competitors**: You MUST automatically identify **3 direct competitor products** currently in the market.
2.  **Compare**: Create a comparison table including the **Main Product + 3 Competitors**.
3.  **Comparative Analysis**: After the table, provide a detailed section on **Comparative Advantages & Disadvantages**.
4.  **Improve**: Provide a section on **Quality Improvements**.

### 2. Multiple Product Comparison
If the user explicitly asks to compare specific products:
1.  Generate the comparison table for those items.
2.  **Comparative Analysis**: Provide a section analyzing the **Comparative Advantages & Disadvantages**.

### 3. Visualization (CRITICAL)
When comparing products, you MUST provide data to generate a chart at the end of your response.
- Use **'bar'** type for quantitative comparisons like Price, Calories, Weight.
- Use **'radar'** type for qualitative scores (1-10 scale) like Flavor, Texture, Sweetness, Packaging, Value.
- **IMPORTANT**: Output the chart data as a **JSON code block** at the VERY END of your response.
- **JSON Format**:
\`\`\`json
{
  "type": "bar", // or "radar"
  "title": "Price & Rating Comparison",
  "categories": ["Price (k VND)", "Rating (1-5)", "Sweetness (1-10)"], 
  "series": [
    { "label": "Product A", "data": [15, 4.5, 8] },
    { "label": "Product B", "data": [12, 4.0, 6] }
  ]
}
\`\`\`

### 4. Data Export (CRITICAL)
If you generate a comparison table, you MUST ALSO generate a separate JSON block for data export containing the raw table data.
- **JSON Format**:
\`\`\`json
{
  "type": "comparison_data",
  "headers": ["Product", "Price", "Flavor"],
  "rows": [
    ["Product A", "10000", "Sweet"],
    ["Product B", "12000", "Salty"]
  ]
}
\`\`\`

### General Rules
- **Language**: Output text in the requested language (VN/EN/KR).
- **Formatting**: Use Markdown.
- **Search**: Always use the search tool to get the latest prices and reviews.
`;

let chatSession: Chat | null = null;

export const getChatSession = (): Chat => {
  if (!chatSession) {
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        // Enable Search only
        tools: [
          { googleSearch: {} }
        ],
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
  onChunk: (text: string, sources: GroundingChunk[], chartData?: ChartData, comparisonData?: ComparisonData) => void
) => {
  if (!process.env.API_KEY) {
      throw new Error("API_KEY_MISSING");
  }

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
      
      attributeInstruction = `\n\nFOR COMPARISON TABLES: You MUST create a Markdown table. The columns MUST be strictly: "${productNameHeader}", ${columns}. Do not add other columns unless asked. ${imageInstruction}`;
    } else {
      attributeInstruction = `\n\nFOR COMPARISON TABLES: Include columns for Price, Flavor, Ingredients, Audience, and Rating.`;
    }

    const chartInstruction = `\n\nREMINDER: If this is a comparison, generate a JSON block with "type": "radar" or "bar". ALSO generate a separate JSON block with "type": "comparison_data" for exporting the table rows/headers.`;

    const langInstruction = `\n\nIMPORTANT: Provide the response strictly in ${langName}. Translate all headers, table columns, and content to ${langName}.${attributeInstruction}${chartInstruction}`;

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
    let parsedChartData: ChartData | undefined;
    let parsedComparisonData: ComparisonData | undefined;

    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      
      // 1. Extract Text
      if (c.text) {
        fullText += c.text;
      }

      // Extract all JSON blocks found in the text so far (Chart/Export Data)
      const jsonRegex = /```json\s*(\{[\s\S]*?\})\s*```/g;
      let match;
      while ((match = jsonRegex.exec(fullText)) !== null) {
        try {
          const json = JSON.parse(match[1]);
          if (json.type === 'bar' || json.type === 'radar') {
            parsedChartData = json;
          } else if (json.type === 'comparison_data') {
            parsedComparisonData = json;
          }
        } catch (e) {
          // Incomplete JSON, ignore for now
        }
      }

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

      onChunk(fullText, [...collectedSources], parsedChartData, parsedComparisonData);
    }
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw error;
  }
};
