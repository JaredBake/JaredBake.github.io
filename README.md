# BakeHeating-CoolingWebsite
Website designed by me for the use of the HVAC company Bake Heating &amp; Cooling.

## Figma MCP setup (local)

Recommended server: `figma-developer-mcp` (Framelink MCP).

1. Open `.env` and paste your generated Figma token as `FIGMA_API_KEY`.
2. Keep `.env` local only (it is ignored by git in `.gitignore`).
3. In your MCP server config, use `npx -y figma-developer-mcp --stdio` and pass `FIGMA_API_KEY` as env.
4. Reload VS Code/Copilot MCP after saving your MCP config.

If you are not sure where your MCP config is, open your MCP settings in VS Code and add a Figma server entry that reads `FIGMA_API_KEY` from your environment.

## Optional: write-capable MCP candidate

An additional server entry is included in `.vscode/mcp.json`:

- `Supercharged Figma MCP (Write Candidate)`

It launches with:

- `npx -y supercharged-figma-mcp --local`

Note: this server commonly requires its companion Figma plugin workflow to perform live write operations. If write tools do not appear in your MCP client, keep Framelink for read context and use the website code workflow in this repo.
