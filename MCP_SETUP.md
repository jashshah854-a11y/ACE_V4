# Magic Patterns MCP Integration

## Setup Instructions

1. **Get your MCP API Key**
   - Go to <https://www.magicpatterns.com/account/settings>
   - Copy your MCP API Key

2. **Configure MCP**
   - Open `.mcp-config.json` in the project root
   - Replace `"your-mcp-api-key-here"` with your actual API key
   - Save the file

3. **Add to .gitignore**
   - Ensure `.mcp-config.json` is in `.gitignore` to keep your key secure

## Usage

### Example Prompt

```
Integrate this design: https://www.magicpatterns.com/c/hybraj7eaksulgyx3neSil into my project
```

This will use the Magic Patterns MCP server to automatically reference and integrate the design.

## Security Notes

- **Never commit** `.mcp-config.json` with your actual API key
- Keep your API key secure
- Regenerate your key if it's ever exposed

## Integration with ACE

Magic Patterns can be used to:

- Generate UI components based on designs
- Create responsive layouts
- Integrate design systems
- Automate frontend development

The MCP server will be available in your AI-powered IDE for design integration tasks.
