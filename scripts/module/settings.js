import { log } from './utils.js';

const SYSTEM_PROMPT="You are a narrative generator for role-playing game journals. The content must be diegetic. Avoid anachronistic references. Your output must be a valid JSON object. The following JSON contains your output instructions and the format to which your output needs to be. Consider everything wrapped in square brackets '[]' as instructions for you to strictly abide by. Your response must strictly adhere to the following JSON schema: {{ContentSchemaEscaped}}"

/**
 * Verifies connection to Ollama API and updates UI status
 */
async function verifyOllamaConnection() {
  // Get the current settings
  const useHttps = game.settings.get('ollama-lore', 'https');
  const protocol = useHttps ? 'https://' : 'http://';
  const baseUrl = game.settings.get('ollama-lore', 'textGenerationApiUrl');
  const apiUrl = protocol + baseUrl;
  const apiKey = game.settings.get('ollama-lore', 'apiKey');
  
  try {
    // Update UI to show verification in progress
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
      statusElement.classList.remove('connected', 'disconnected');
    }
    
    const response = await fetch(apiUrl + '/api/tags', {
      method: 'GET',
      headers: {
        "Content-Type": "application/json",
        "Authorization": apiKey ? `Bearer ${apiKey}` : ""
      }
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    // Show success message with UI notification
    ui.notifications.info("Successfully connected to Ollama API");
    return true;
  } catch (error) {
    // Show error message with UI notification
    ui.notifications.error(`Failed to connect to Ollama API: ${error.message}`);
    log({message: "Ollama connection verification failed", error: error, type: ["error"]});
    return false;
  }
}

/**
 * Fetches available models from Ollama API
 */
async function fetchOllamaModels() {
  // Get the current settings
  const useHttps = game.settings.get('ollama-lore', 'https');
  const protocol = useHttps ? 'https://' : 'http://';
  const baseUrl = game.settings.get('ollama-lore', 'textGenerationApiUrl');
  const apiUrl = protocol + baseUrl;
  const apiKey = game.settings.get('ollama-lore', 'apiKey');
  
  try {
    // Update UI to show loading state
    const selectElement = document.getElementById('ollama-models');
    if (selectElement) {
      const loadingOption = document.createElement('option');
      loadingOption.text = "Loading models...";
      loadingOption.disabled = true;
      loadingOption.selected = true;
      
      // Clear existing options
      while (selectElement.options.length > 0) {
        selectElement.remove(0);
      }
      
      selectElement.add(loadingOption);
    }
    
    const response = await fetch(apiUrl + '/api/tags', {
      method: 'GET',
      headers: {
        "Content-Type": "application/json",
        "Authorization": apiKey ? `Bearer ${apiKey}` : ""
      }
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    // Extract model names from the response
    let models = [];
    if (data.models) {
      models = data.models.map(model => model.name);
    } else if (Array.isArray(data)) {
      // Handle different Ollama API response formats
      models = data.map(model => model.name || model.model);
    }
    
    // Save the models to settings
    if (models.length > 0) {
      await game.settings.set('ollama-lore', 'models', models.join(', '));
      ui.notifications.info(`Found ${models.length} models in Ollama`);
    } else {
      ui.notifications.warn("No models found in Ollama. Please pull a model using the Ollama CLI.");
    }
    
    return models;
  } catch (error) {
    ui.notifications.error(`Failed to fetch Ollama models: ${error.message}`);
    log({message: "Failed to fetch Ollama models", error: error, type: ["error"]});
    return [];
  }
}
/**
 * Registers the module's settings in Foundry VTT.  This allows for flexible API endpoint configuration.
 */
export function registerSettings() {
    /**
     * Default payload JSON based on the OpenAI API documentation.
     */

    const defaultPayloadJson = `{
  "model": "{{Model}}",
  "messages": [
    {
      "role": "system",
      "content": "${SYSTEM_PROMPT}"
    },
    {
      "role": "user",
      "content": "{{GenerationContext}}"
    }
  ],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "html_schema",
      "schema": {{ContentSchema}}
    }
  }
}`
    game.settings.register('ollama-lore', 'https', {
        name: 'Enable HTTPS',
        hint: 'Whether to use HTTPS or HTTP for the API URL. Disable this if using localhost',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
    });
    game.settings.register('ollama-lore', 'textGenerationApiUrl', {
        name: 'Text Generation API URL',
        hint: 'Enter the target URL for the text generation API endpoint (e.g. localhost:11434 for Ollama).',
        scope: 'world',
        config: true,
        type: String,
        default: 'localhost:11434',
    });
    game.settings.register('ollama-lore', 'apiKey', {
        name: "API Key",
        hint: "Enter your API key here. (optional)",
        scope: 'world',
        config: true,
        type: String,
        default: ""
    });
    game.settings.register('ollama-lore', 'models', {
        name: 'LLM Models',
        hint: 'Comma-separated list of available LLM models',
        scope: 'world',
        config: true,
        type: String,
        default: 'llama2, mistral'
    });
    game.settings.register('ollama-lore', 'protocol', {
        name: 'API Protocol',
        hint: 'Select HTTP or HTTPS for API connections',
        scope: 'world',
        config: true,
        type: String,
        choices: {
            'http': 'HTTP',
            'https': 'HTTPS'
        },
        default: 'http'
    });
    game.settings.register('ollama-lore', 'apiEndpoint', {
        name: 'API Endpoint',
        hint: 'Base URL for LLM API (include port if needed)',
        scope: 'world',
        config: true,
        type: String,
        default: 'localhost:11434'
    });
    game.settings.register('ollama-lore', 'payloadJson', {
        name: "Payload JSON",
        hint: "Enter the JSON payload for the API request.",
        scope: 'world',
        config: true,
        type: String,
        default: defaultPayloadJson
    });
    game.settings.register('ollama-lore', 'responseJsonPath', {
        name: "Response JSON Path",
        hint: "Enter the path to the response JSON in dot notation.",
        scope: 'world',
        config: true,
        type: String,
        default: 'choices.0.message.content'
    });
    game.settings.register('ollama-lore', 'reasoningEndTag', {
        name: "Reasoning End Tag",
        hint: "Enter the tag that indicates the end of the reasoning section. (optional)",
        scope: 'world',
        config: true,
        type: String,
        default: ''
    });
    game.settings.register('ollama-lore', 'generationTryLimit', {
        name: "Generation Try Limit",
        hint: "Enter the maximum number of tries for text generation.",
        scope: 'world',
        config: true,
        type: Number,
        default: 3
    });
    game.settings.registerMenu("ollama-lore", "templateSettingMenu", {
        name: "Journal Entry Templates",
        label: "Select Templates",
        hint: "Select journal entry templates for your module.",
        icon: "fas fa-bars",
        type: JournalEntrySelectionApplication,
        restricted: true
    });
    game.settings.register('ollama-lore', 'globalContext', {
        name: "Global Context",
        hint: "Context that will be considered when generating content.",
        scope: 'world',
        config: true,
        type: String,
        default: ''
    });
      game.settings.register('ollama-lore', 'journalEntryTemplates', {
        scope: 'world',
        config: false,
        type: Object,
        default: ["ollama-lore.journal-entry-templates"]
    });
    log({message: "Game settings registered successfully."});
}

/**
 * Updates the connection status indicator in the UI
 */
function updateConnectionStatus(isConnected) {
  const statusElement = document.getElementById('connection-status');
  if (isConnected) {
    statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Connected';
    statusElement.classList.add('connected');
    statusElement.classList.remove('disconnected');
  } else {
    statusElement.innerHTML = '<i class="fas fa-times-circle"></i> Disconnected';
    statusElement.classList.add('disconnected');
    statusElement.classList.remove('connected');
  }
}

/**
 * Populates the model dropdown with available models
 */
function populateModelDropdown(models) {
  const selectElement = document.getElementById('ollama-models');
  
  // Clear existing options except the first one
  while (selectElement.options.length > 1) {
    selectElement.remove(1);
  }
  
  // Add new model options
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    selectElement.appendChild(option);
  });
}

/**
 * Sets up event listeners for the settings form
 */
export function setupSettingsListeners() {
  document.getElementById('verify-connection')?.addEventListener('click', async () => {
    const isConnected = await verifyOllamaConnection();
    updateConnectionStatus(isConnected);
  });
  
  document.getElementById('refresh-models')?.addEventListener('click', async () => {
    const models = await fetchOllamaModels();
    populateModelDropdown(models);
  });
}
/**
 * @class
 * @classdesc A form application for selecting journal entry templates in Foundry VTT.
 * Provides functionality to select and manage journal entries from compendiums.
 */
class JournalEntrySelectionApplication extends FormApplication {
    /**
     * Constructs a new JournalEntrySelectionApplication instance.
     * Initializes journalEntries with the available JournalEntry compendiums.
     * @param {...*} args - Arguments passed to the FormApplication constructor.
     */
    constructor(...args) {
      super(...args);
      this.journalEntries = this._getJournalEntryCompendiums();
    }
    /**
     * Defines the default options for the JournalEntrySelectionApplication.
     * @returns {Object} The default options for this application.
     */
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        id: "journal-entry-selection",
        classes: ["ollama-lore"],
        title: "Select Journal Entries",
        template: "modules/ollama-lore/templates/journal-entry-selection.html",
        width: 640,
        height: "auto",
        resizable: true
      });
    }
    /**
     * Prepares data for rendering the template. This includes the current selection of journal entries.
     * @returns {Object} Data to be used in rendering the template.
     */
    getData() {
        const selectedIds = new Set(game.settings.get('ollama-lore', 'journalEntryTemplates'));
        return {
            entries: this.journalEntries.map(entry => ({
                ...entry,
                isSelected: selectedIds.has(entry.id)
            }))
        };
    }
    /**
     * Updates the journal entry selections based on form data.
     * @param {Event} event - The DOM event that triggered the update.
     * @param {Object} formData - The form data from the application's HTML form.
     */
    async _updateObject(event, formData) {
        const selectedEntries = Object.entries(formData)
            .filter(([key, value]) => value)
            .map(([key]) => key);
        await game.settings.set('ollama-lore', 'journalEntryTemplates', selectedEntries);
    }
    /**
     * Activates interactive listeners for the application's HTML, such as input filters.
     * @param {JQuery} html - The jQuery object representing the HTML of the app.
     */
    activateListeners(html) {
        super.activateListeners(html);
        const filterInput = html.find("#filter-input");
        const entryContainer = html.find("#journal-entries-container");
        filterInput.on("keyup", event => {
            const searchTerm = event.target.value.toLowerCase();
            entryContainer.find(".checkbox").each(function() {
                const label = $(this).find("label").text().toLowerCase();
                const isMatch = label.includes(searchTerm);
                $(this).toggle(isMatch);
            });
        });
    }
    /**
     * Retrieves a list of JournalEntry compendiums available in the game.
     * @returns {Array} An array of objects, each representing a journal entry compendium.
     */
    _getJournalEntryCompendiums() {
        const packs = Array.from(game.packs);
        return packs
            .filter(pack => pack.metadata.type === "JournalEntry")
            .map(pack => ({
                id: pack.metadata.id,
                name: pack.metadata.name,
                label: `${pack.metadata.label} `,
                group: `${pack.metadata.id.split('.')[0]}`
            }));
    }
  }
/**
 * Hook to place a call-to-action panel right below the h2 header in the settings section of the module to provide the URL to the github page for further guidance
 * @param {Application} app - The application instance.
 * @param {JQuery} html - The jQuery object representing the HTML of the app.
 * @param {Object} data - Data provided to the template.
 */
Hooks.on('renderPackageConfiguration', (app, html, data) => {
    const ctaPanel = $(`
        <div style="border: solid; border-width: 1px; padding: 0.75rem; padding-bottom: 0.25rem; border-radius:8px; border-color: #5d142b; margin-bottom:1rem; background-color: rgba(255,255,255,0.35);">
            <h4><b> <i class="fa-regular fa-circle-question"></i> Need Help?</b></h4>
            <p>Visit Ollama Lore's <a href="https://www.github.com/ArcadiaFrame/ollama-lore-foundry">Github Repository</a> for information on these settings.</p>
        </div>
        `);
    const apiModal = $(html).find("[data-tab='ollama-lore']").find('h2').first();
    //we need to make sure the ctaPanel is directly after the h2 header
    apiModal.after(ctaPanel);
});

/**
 * Helper function that converts an input field for a setting into a textarea.
 * Retrieves the stored setting value via game.settings.get(), decodes newline escapes,
 * replaces the input with a textarea styled per the provided style string, and binds a change
 * event to re-escape newlines on save.
 *
 * @param {JQuery} html - The rendered settings HTML.
 * @param {string} moduleId - The module namespace (e.g., "ollama-lore").
 * @param {string} settingKey - The key of the setting to modify.
 * @param {string} textareaStyle - CSS styles to apply to the textarea.
 * @param {Function} [repositionCallback] - Optional callback to reposition parts of the setting's container.
 */
function convertSettingToTextarea(html, moduleId, settingKey, textareaStyle, repositionCallback) {
  const fullSettingId = `${moduleId}.${settingKey}`;
  const settingDiv = html.find(`[data-setting-id="${fullSettingId}"]`);
  if (!settingDiv.length) return;

  // Retrieve the stored value from Foundry's settings and decode escaped newlines.
  let storedValue = game.settings.get(moduleId, settingKey) || "";
  storedValue = storedValue.replace(/\\n/g, "\n");

  // Locate the original input element by its name attribute.
  const inputEl = settingDiv.find(`input[name="${fullSettingId}"]`);
  if (inputEl.length) {
    // Build the textarea element with the provided styles and desired attributes.
    const textarea = $(`
      <textarea name="${fullSettingId}"
                style="white-space: pre; overflow-x: auto; ${textareaStyle}"
                wrap="off">${storedValue}</textarea>
    `);
    // Replace the input with our new textarea.
    inputEl.replaceWith(textarea);

    // When the user changes the textarea, re-escape newline characters and update the setting.
    textarea.on("change", async (ev) => {
      const newRaw = ev.target.value;
      const escaped = newRaw.replace(/\n/g, "\\n");
      await game.settings.set(moduleId, settingKey, escaped);
    });
  }

  // If a reposition callback is provided, execute it.
  if (typeof repositionCallback === "function") {
    repositionCallback(settingDiv);
  }
}

Hooks.on("renderSettingsConfig", (app, html, data) => {
  // Convert the payloadJson setting field.
  convertSettingToTextarea(
    html,
    "ollama-lore",
    "payloadJson",
    "width: 518px; min-height: 120px; height: 336px;",
    (settingDiv) => {
      // Reposition the form-fields div so that it appears after the <p class="notes"> element.
      const notesEl = settingDiv.find("p.notes");
      const formFieldsEl = settingDiv.find("div.form-fields");
      if (notesEl.length && formFieldsEl.length) {
        notesEl.after(formFieldsEl);
      }
    }
  );

  // Convert the globalContext setting field.
  convertSettingToTextarea(
    html,
    "ollama-lore",
    "globalContext",
    "width: 518px; min-height: 80px; height: 120px;",
    (settingDiv) => {
      // Reposition the form-fields div so that it appears after the <p class="notes"> element.
      const notesEl = settingDiv.find("p.notes");
      const formFieldsEl = settingDiv.find("div.form-fields");
      if (notesEl.length && formFieldsEl.length) {
        notesEl.after(formFieldsEl);
      }
    }
  );
});

Hooks.once('ready', () => {
  registerSettings();
});

