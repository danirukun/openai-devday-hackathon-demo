# Interior reconstruction with Blender and Codex

This workspace is for reference images, an editable Blender scene, and renders.
The Blender connection must be installed and verified before it can be used.
From the repository root, enter it with `cd 3d-environment` before using the
relative paths below.

## One-time setup on this Mac

1. Install Blender 5.1 or newer and `uv`. Homebrew is already available on this
   computer. In Terminal, run:

   ```sh
   brew install --cask blender
   brew install uv
   ```

   If you already have Blender 5.1 or newer elsewhere, you can use that copy.

2. Open Blender. Follow the [Blender Lab MCP page](https://www.blender.org/lab/mcp-server/)
   to install its official add-on. With the drag-and-drop option, drag the
   install control into Blender twice: first to add the Blender Lab repository,
   then to install the add-on. Enable it and use its preferences to start the
   server. Keep Blender open. Use its default local host and port.

3. In Terminal, clone Blender's official MCP server into this workspace and
   install its dependencies:

   ```sh
   cd /Users/yewenjin/projects/openai-devday/hackathon-demo/3d-environment
   git clone https://projects.blender.org/lab/blender_mcp.git blender_mcp
   uv --directory "$PWD/blender_mcp/mcp" sync
   ```

   If the directory already exists, inspect it before reusing it; do not replace
   it blindly. The first sync needs an internet connection.

4. Register the server with Codex (this updates your user-level Codex config):

   ```sh
   codex mcp add blender -- "$PWD/blender-mcp-launch.sh"
   codex mcp list
   ```

   If `blender` is already registered, inspect it with `codex mcp get blender`
   before changing it. Run this command from `3d-environment/`; the launcher
   locates the MCP environment relative to itself. The list confirms registration,
   not a live connection.
   Open a new Codex session in this workspace with Blender and the add-on server
   running, then ask: “Use the Blender MCP tools to inspect the current scene
   and report the Blender version and object names.” If that succeeds, the
   connection is working.

The official server and add-on are separate components; see the [source and
architecture](https://projects.blender.org/lab/blender_mcp) and [setup
instructions](https://projects.blender.org/lab/blender_mcp/wiki/Setup).

## Start the reconstruction

Place the original photos in `reference-images/`, then tell Codex where they
are. A few overlapping views from different corners, including the floor,
ceiling, doors and windows, work better than a single image. Include a floor
plan or at least one known measurement when available; otherwise dimensions and
hidden areas will be estimates. State your desired output and level of detail.

Suggested first prompt:

> Inspect the photos in `reference-images/` and reconstruct the room as an
> editable Blender scene. First describe the inferred layout and uncertain
> dimensions. Use the supplied measurement for scale, block out the room and
> main furniture, and save the scene in `scenes/`. Produce preview renders in
> `renders/` from viewpoints close to the photos so we can compare and refine.

Add more measurements and images as they become available. A scene reconstructed
from photos is an approximation, not a survey or automatic photogrammetry.

## Security

Blender warns that its MCP server executes model-generated code without guards
against deleting or transmitting data. Use an isolated machine or virtual
machine without sensitive data as Blender recommends, and keep the add-on
listening locally. Back up any existing scenes before opening them for editing.
