import { GoogleGenAI } from "@google/genai";

export interface ProjectFile {
    name: string;
    code: string;
}

export const generateHtmlForProjectStream = async (
    files: ProjectFile[], 
    image: { data: string | null; mimeType: string | null }, 
    onChunk: (chunk: string) => void
): Promise<void> => {
    const API_KEY = process.env.API_KEY;

    if (!API_KEY) {
        throw new Error("API_KEY environment variable not set. Please configure it in your deployment settings.");
    }
    
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    try {
        let prompt = `
You are an expert full-stack developer. Your task is to take a collection of source code files for a web project and combine them into a single, runnable HTML file.

**Instructions:**
1.  Analyze all the provided files to understand the project structure, dependencies, and purpose.
2.  The final output must be a single, complete, and valid HTML document, starting with \`<!DOCTYPE html>\`.
3.  All necessary CSS and JavaScript must be included directly within the HTML file using \`<style>\` and \`<script>\` tags.
4.  If it's a JavaScript project (like React, Vue, etc.), ensure the necessary CDN scripts are included in the HTML to run the application. For example, for a React project, include React and ReactDOM and render the main component to a root div.
5.  Combine all files logically. For instance, all CSS files should be merged into one \`<style>\` block in the \`<head>\`. All JavaScript files should be combined into one \`<script>\` block at the end of the \`<body>\`.
6.  The generated HTML should be a visual and functional representation of the entire project.
7.  The output must be ONLY the raw HTML code. Do not include any explanations, markdown backticks (\`\`\`html), or any other text. Start the response directly with \`<!DOCTYPE html>\`.
`;

        if (image.data && image.mimeType) {
            prompt += `
8. **IMPORTANT**: An image has been provided as a visual reference. Analyze the image for styling cues (colors, layout, fonts, general aesthetic) and apply a similar style to the generated HTML application. The final app's appearance should be heavily inspired by the provided image.
`;
        }
        
        const fileContents = files.map(file => 
            `--- START OF FILE: ${file.name} ---\n\`\`\`\n${file.code}\n\`\`\`\n--- END OF FILE: ${file.name} ---`
        ).join('\n\n');

        prompt += `
**Project Files to Convert:**

${fileContents}
`;
        const textPart = { text: prompt };
        
        const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [textPart];

        if (image.data && image.mimeType) {
             const imagePart = {
                inlineData: {
                    mimeType: image.mimeType,
                    data: image.data,
                },
            };
            parts.push(imagePart);
        }

        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-3-pro-preview', 
            contents: { parts },
        });

        for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
                onChunk(text);
            }
        }

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('400')) {
             throw new Error("Failed to generate HTML. The request was invalid, which could be due to the complexity or format of the code. Please try with a simpler project.");
        }
        throw new Error("Failed to generate HTML from code. Please check your API key and network connection.");
    }
};