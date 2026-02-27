Before generating any Max/MSP code or using LOFI MONSTER tools, you MUST respect these 12 constraints. Violating any of them will produce silent failures or crashes in Max.

## 1. new Patcher() is FORBIDDEN
Max JS does not support direct patcher instantiation. This is the #1 LLM hallucination.
CORRECT: this.patcher.newdefault(10, 10, "p", deviceName) then .subpatcher()

## 2. UDP Packet Dropping
Never send sequential OSC messages for batch operations. The batch_create_ui tool sends the entire sorted array as ONE JSON payload. Max iterates locally with a timed Task.

## 3. No Max route Object
The udpreceive connects directly to the v8 object. OSC addresses arrive via anything() as messagename. No route object is needed or wanted.

## 4. No Raw Code Over UDP
Sending .js file contents over UDP will exceed packet size limits and silently truncate. Only send absolute file paths. The daemon uses message("compile", filePath).

## 5. All 7 Handlers Required
daemon.js must have: handleInit, handleCreate, handleWire, handleRemove, handleUI, handleInject, handleMap.

## 6. Max Comma Trap
Max's message scheduler splits commas as message separators. Raw JSON like {"x": 10, "y": 20} is DESTROYED before reaching v8. The MCP server wraps JSON as a single OSC string argument via node-osc.

## 7. anything() Argument Parsing
JSON arrives as argsArray[0] — the entire string is in the first argument. Never use join(" ") or multi-argument concatenation.

## 8. Task Garbage Collection Trap
Local Task variables get garbage-collected when the function exits. The scheduled work silently vanishes. Task references MUST be stored in global variables (var uiTask = null at script top level).

## 9. V8 Environment Limits
Max's v8 is strictly ECMAScript — no DOM (window, document), no Node APIs (require, fs, fetch, Buffer). All file I/O happens on the Node.js MCP server side.

## 10. targetPatcher.front() is Hallucinated
The correct method to bring a patcher window to front is targetPatcher.wind.bringtofront(). The front() method does not exist.

## 11. newdefault Ignores Dimensions
Objects spawn at Max's default tiny size. You MUST follow up with obj.message("patching_rect", x, y, width, height) to set actual dimensions.

## 12. Presentation Mode Required
For Max for Live devices, UI elements need presentation mode enabled:
obj.message("presentation", 1)
obj.message("presentation_rect", x, y, width, height)
