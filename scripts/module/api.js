import { log, validateJsonAgainstSchema } from './utils.js';
/**
 * Processes the LLM request by constructing a payload from a template with placeholders.
 * Expects the settings to include a 'payloadJson' template with:
 *  - {{Model}} for the model name,
 *  - {{GenerationContext}} for the user instructions,
 *  - {{ContentSchema}} for the content schema.
**/
export async function processLLMRequest({ model, contentTemplateInstructions, contentTemplateSchema, html }) {
  const protocol = game.settings.get('ollama-lore', 'protocol');
  const endpoint = `${protocol}://${game.settings.get('ollama-lore','apiEndpoint')}/api/generate`;
  const payload = {
    model,
    prompt: contentTemplateInstructions,
    format: 'json',
    options: {
        temperature: 0.7
    },
    stream: true
  };

  

  // Retrieve the API key.
  const apiKey = game.settings.get('ollama-lore', 'apiKey');

  // Update UI to show loading state
  if (params.updateUI) {
    const previewElement = document.querySelector('.ollama-lore.generation-preview');
    if (previewElement) {
      previewElement.innerHTML = '<div class="ollama-lore loading-indicator"></div> Generating content...';
    }
  }

  // Set up timeout and retry logic
  const maxRetries = game.settings.get('ollama-lore', 'generationTryLimit') || 3;
  const timeout = 30000; // 30 seconds timeout
  
  let retries = 0;
  let responseJSON = null;

  while (retries < maxRetries && !responseJSON) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": apiKey ? `Bearer ${apiKey}` : ""
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      if (!response.body) {
        throw new Error("ReadableStream not supported in this browser.");
      }

      // Process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let jsonStarted = false;
      let jsonContent = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        
        // Update UI with streaming content if available
        if (params.updateUI) {
          const previewElement = document.querySelector('.ollama-lore.generation-preview');
          if (previewElement) {
            // Look for JSON in the accumulated text
            if (!jsonStarted) {
              const jsonStart = accumulatedText.indexOf('{');
              if (jsonStart >= 0) {
                jsonStarted = true;
                jsonContent = accumulatedText.substring(jsonStart);
              }
            } else {
              jsonContent += chunk;
            }
            
            // Try to parse any complete JSON objects
            if (jsonStarted) {
              try {
                // Find the last complete JSON object
                const lastBrace = jsonContent.lastIndexOf('}');
                if (lastBrace >= 0) {
                  const possibleJson = jsonContent.substring(0, lastBrace + 1);
                  const parsed = JSON.parse(possibleJson);
                  
                  // Update the preview with the content
                  if (parsed.html) {
                    previewElement.innerHTML = parsed.html;
                  } else if (parsed.content) {
                    previewElement.innerHTML = parsed.content;
                  }
                }
              } catch (e) {
                // Ignore parsing errors during streaming
              }
            }
          }
        }
      }
      
      // Process the complete response
      // Extract JSON from the accumulated text
      try {
        const jsonStart = accumulatedText.indexOf('{');
        const jsonEnd = accumulatedText.lastIndexOf('}');
        
        if (jsonStart >= 0 && jsonEnd >= 0) {
          const jsonStr = accumulatedText.substring(jsonStart, jsonEnd + 1);
          responseJSON = JSON.parse(jsonStr);
        } else {
          throw new Error("No valid JSON found in response");
        }
      } catch (error) {
        log({message: "Error parsing streaming response JSON.", error: error, type: ["error"]});
        throw error;
      }
      
      break; // Success, exit the retry loop
      
    } catch (error) {
      retries++;
      log({message: `LLM request failed (attempt ${retries}/${maxRetries})`, error: error, type: ["error"]});
      
      if (retries >= maxRetries) {
        // Update UI to show error
        if (params.updateUI) {
          const previewElement = document.querySelector('.ollama-lore.generation-preview');
          if (previewElement) {
            previewElement.innerHTML = `<div style="color: #a81818;">Error: Failed to generate content after ${maxRetries} attempts. Please check your connection and settings.</div>`;
          }
        }
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Validate the response JSON against the content schema.
  const schemaJson = JSON.parse(params.contentTemplateSchema);
  const valid = validateJsonAgainstSchema(responseJSON, schemaJson);
  if (!valid) {
    const error = new Error("Response JSON does not match content schema.");
    log({message: "Error linting response JSON.", error: error, type: ["error"]});
    throw error;
  }
  else {
    return responseJSON
  }
}

