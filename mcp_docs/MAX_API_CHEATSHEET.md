# Max/MSP JavaScript API — Cheatsheet

## Scope

This is a strict reference for the Max JS API commands used by the LOFI MONSTER daemon. Only methods listed here are verified to work. **Do not invent or assume any methods not documented here** — Max's JS API has many traps that LLMs commonly hallucinate.

## Environment Constraints

**Max's v8 object is strictly ECMAScript.** It is NOT Node.js. It is NOT a browser.

| Available | NOT Available |
|-----------|---------------|
| ECMAScript 2020+ syntax | `require()`, `import` (no module system) |
| `var`, `let`, `const` | `window`, `document` (no DOM) |
| `JSON.parse()`, `JSON.stringify()` | `fs`, `path`, `Buffer` (no Node APIs) |
| `Array`, `Object`, `Map`, `Set` | `fetch`, `XMLHttpRequest` (no networking) |
| `Task` (Max-specific scheduler) | `setTimeout`, `setInterval` (use `Task` instead) |
| `post()` (prints to Max console) | `console.log()` (does not exist) |
| `outlet()` (sends data out of v8 object) | `process`, `__dirname` (no Node globals) |

**All file I/O must happen on the Node.js MCP server side.** Max only receives instructions and file paths.

---

## Patcher Object Methods

### `this.patcher.newdefault(left, top, classname, ...args)`

Creates a new Max object in the patcher.

```javascript
// Signature
var obj = this.patcher.newdefault(left, top, "classname", arg1, arg2, ...);

// Examples
var toggle = this.patcher.newdefault(100, 50, "toggle");
var slider = this.patcher.newdefault(200, 50, "slider");
var cycle  = this.patcher.newdefault(300, 50, "cycle~", 440);
var dial   = this.patcher.newdefault(100, 150, "live.dial");
var msg    = this.patcher.newdefault(100, 250, "message", "hello world");
var sub    = this.patcher.newdefault(10, 10, "p", "MySubpatch");
```

**Returns:** A `Maxobj` reference that can be stored in the registry.

**CRITICAL QUIRK:** `newdefault` ignores width and height. Objects spawn at Max's default tiny size. You MUST follow up with `patching_rect` to set dimensions:

```javascript
var panel = this.patcher.newdefault(0, 0, "live.panel");
// Force the actual size:
panel.message("patching_rect", 0, 0, 600, 400);
```

---

### `this.patcher.connect(fromObj, outletIdx, toObj, inletIdx)`

Creates a patch cord between two objects.

```javascript
// Signature
this.patcher.connect(sourceObj, outletIndex, destObj, inletIndex);

// Example — connect toggle outlet 0 to slider inlet 0
var toggle = this.patcher.newdefault(100, 50, "toggle");
var slider = this.patcher.newdefault(200, 50, "slider");
this.patcher.connect(toggle, 0, slider, 0);
```

**Returns:** Nothing.

**Indices are 0-based.** Outlet 0 is the leftmost outlet. Inlet 0 is the leftmost inlet.

---

### `this.patcher.remove(maxobj)`

Removes an object from the patcher. Also removes all patch cords connected to it.

```javascript
// Signature
this.patcher.remove(obj);

// Example
var obj = this.patcher.newdefault(100, 100, "print");
this.patcher.remove(obj);
```

---

### `this.patcher.apply(fn)`

Iterates through every object in the patcher. Calls `fn(obj)` for each object. Stops early if the function returns `true`.

```javascript
// Signature
this.patcher.apply(function(obj) {
  // Return false to continue, true to stop
  return false;
});

// Example — find an object by its scripting name
var found = null;
this.patcher.apply(function(obj) {
  if (obj.varname === "my_dial") {
    found = obj;
    return true; // Stop iteration
  }
  return false;
});
```

**`this.patcher.applydeep(fn)`** — Same but recurses into subpatchers.

---

## Maxobj Properties

Once you have a `Maxobj` reference (from `newdefault` or `apply`), you can read these properties:

| Property | Type | Description |
|----------|------|-------------|
| `obj.maxclass` | string | Object class name (e.g. "live.dial", "cycle~") |
| `obj.varname` | string | Scripting name (if set) |
| `obj.rect` | array | `[left, top, right, bottom]` position/size |
| `obj.patcher` | Patcher | The patcher this object belongs to |

### Sending Messages to Objects

```javascript
// obj.message(messageName, ...args)
obj.message("patching_rect", x, y, width, height);
obj.message("presentation", 1);
obj.message("presentation_rect", x, y, width, height);
obj.message("compile", "/path/to/script.js");  // For v8/js objects
```

---

## The Subpatcher Method (Creating Target Patchers)

**`new Patcher()` is FORBIDDEN.** Max's JS engine does not support direct patcher instantiation. This is the #1 LLM hallucination for Max JS code.

**Correct method:**

```javascript
// 1. Create a subpatch node [p DeviceName] in the current patcher
var subNode = this.patcher.newdefault(10, 10, "p", "Flutter");

// 2. Extract the Patcher reference from the subpatch node
var targetPatcher = subNode.subpatcher();

// 3. Bring the window to front (so user can watch the build)
targetPatcher.wind.bringtofront();

// 4. Now create objects IN the target patcher (not this.patcher!)
var dial = targetPatcher.newdefault(100, 100, "live.dial");
targetPatcher.connect(dial, 0, someOtherObj, 0);
```

**`patcher.front()` is ALSO hallucinated.** The correct method to bring a patcher window to front is `patcher.wind.bringtofront()`.

---

## The `anything()` Dispatch Pattern

When a v8 object receives a message that doesn't match a named inlet function, it falls through to `anything()`. OSC addresses arrive as the message name.

```javascript
function anything() {
  var address = messagename;                    // e.g. "/lofi/create"
  var argsArray = arrayfromargs(arguments);      // Convert arguments to array
  if (argsArray.length === 0) return;

  var jsonStr = argsArray[0];                    // Entire JSON is in first arg
  var payload = JSON.parse(jsonStr);

  // Route to handler based on address
  if (address === "/lofi/create") handleCreate(payload);
  // ... etc
}
```

**`messagename`** — Built-in Max JS variable containing the message name that triggered `anything()`.

**`arrayfromargs(arguments)`** — Built-in Max JS function that converts the `arguments` object to a proper array.

---

## Task (Max's Scheduler)

Max does NOT have `setTimeout` or `setInterval`. Use `Task` for deferred/repeated execution.

```javascript
// CRITICAL: Task MUST be stored in a GLOBAL variable
// Local Task vars get garbage-collected, silently killing the scheduled work
var myTask = null;

function doWork() {
  var i = 0;
  var items = [/* ... */];

  myTask = new Task(function() {
    if (i < items.length) {
      // Process item
      i++;
      myTask.schedule(20); // Schedule next iteration in 20ms
    }
  });
  myTask.schedule(0); // Start immediately
}
```

**`task.schedule(ms)`** — Schedule the task to fire after `ms` milliseconds.

**`task.cancel()`** — Cancel the scheduled task.

**GC Trap:** If the Task reference is a local variable inside a function, V8's garbage collector will destroy it when the function exits. The scheduled work silently vanishes. ALWAYS use global variables for Task references.

---

## Output and Logging

### `outlet(index, ...values)`

Sends data out of the v8 object's outlets (connected to downstream Max objects).

```javascript
outlet(0, "hello");                          // Send string out outlet 0
outlet(0, JSON.stringify({ status: "ok" })); // Send JSON string out outlet 0
outlet(1, 42);                               // Send number out outlet 1
```

### `post(...values)`

Prints to the Max console (equivalent of `console.log` in browsers).

```javascript
post("Debug:", someValue, "\n");  // \n needed for newline in Max console
```

---

## Loading Scripts into v8/js Objects

To load a JavaScript file into a `v8` or `js` object from the daemon:

```javascript
var engineObj = registry["engine"];  // Get the Maxobj reference
engineObj.message("compile", "/absolute/path/to/script.js");
```

**Use `"compile"`**, not `"read"`. This is the cleanest and most reliable way to inject a script from disk.

---

## Presentation Mode

For Max for Live devices, UI elements need to be in Presentation Mode to be visible to the end user.

```javascript
var obj = targetPatcher.newdefault(x, y, "live.dial");

// Set the patching view size (newdefault ignores dimensions)
obj.message("patching_rect", x, y, width, height);

// Enable presentation mode
obj.message("presentation", 1);

// Set the presentation view size and position
obj.message("presentation_rect", x, y, width, height);
```

---

## Common Max Object Classes

### UI Objects (for batch_create_ui)
| Class | Description |
|-------|-------------|
| `live.panel` | Background panel/rectangle |
| `live.dial` | Rotary knob with value display |
| `live.slider` | Vertical or horizontal slider |
| `live.toggle` | On/off toggle button |
| `live.button` | Momentary button |
| `live.menu` | Dropdown menu |
| `live.numbox` | Number input box |
| `live.text` | Text display |
| `live.tab` | Tab selector |
| `comment` | Text label (non-interactive) |

### DSP Objects
| Class | Description |
|-------|-------------|
| `cycle~` | Sine oscillator |
| `phasor~` | Ramp/sawtooth oscillator |
| `noise~` | White noise generator |
| `*~` | Signal multiply |
| `+~` | Signal add |
| `lores~` | Resonant lowpass filter |
| `svf~` | State-variable filter |
| `dac~` | Audio output |
| `adc~` | Audio input |

### Utility Objects
| Class | Description |
|-------|-------------|
| `js` | Legacy JavaScript object |
| `v8` | Modern V8 JavaScript object |
| `message` | Message box |
| `toggle` | Toggle switch |
| `slider` | Slider |
| `number` | Number box |
| `print` | Print to Max console |
| `trigger` | Trigger/order messages |
| `route` | Route messages by first element |
| `pack` | Pack multiple values into a list |
| `unpack` | Unpack a list into individual values |

---

## Max's UI Thread Quirk

Max processes UI operations on a **low-priority thread**. If you create many UI objects in a tight loop, Max may:
- Freeze the UI temporarily
- Fail to render objects correctly
- Drop operations silently

**Solution:** Space object creation using `Task` with 15-25ms delays between operations. This gives Max's scheduler time to process each UI update.
