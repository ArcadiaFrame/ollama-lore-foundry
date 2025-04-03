# Ollama Lore Foundry Module

A Foundry Virtual Tabletop module that enhances journaling capabilities with AI-generated content and D&D 5e template integration.

## Features
- **AI-Powered Journal Entries**: Integrated with Ollama API for contextual narrative generation
- **D&D 5e Template System**: Automatic item card generation with Handlebars templates
- **Real-time Content Streaming**: WebSocket support for progressive content display
- **Foundry VTT Integration**: Native journal entry creation and UUID linking
- **Configurable API Settings**: Supports multiple LLM models and custom endpoints
- **ProseMirror Editor Integration**: Direct in-editor content updates

## Compatibility
✅ Tested with Foundry VTT v12.331
🦜 Ollama API v0.1.27+

## Installation
### Method 1: FoundryVTT Module Browser
1. Search for "Ollama Lore" in module browser
2. Click Install

### Method 2: Manual Installation
1. Download latest release
2. Extract to modules directory
3. Enable in World Settings

### Method 3: Development Setup
```bash
git clone https://github.com/your-repo/ollama-lore-foundry.git
npm install
```

## Usage
1. Highlight text in journal entries to:
   - Generate AI-enhanced descriptions
   - Create linked item cards
   - Stream dynamic narrative content
2. Access templates through Actor/NPC sheets

## Troubleshooting
**API Connection**:
- Verify Ollama endpoint in module settings
- Check `docker logs ollama` for service status

**Template Errors**:
- Validate Handlebars syntax in devtools console
- Ensure item schema matches template requirements

## Development
```bash
npm run dev  # Starts development server
npm run build  # Creates production bundle
```

## License
MIT License - See [LICENSE](LICENSE)
