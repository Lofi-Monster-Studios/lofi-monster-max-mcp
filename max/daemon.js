autowatch = 1;

// --- Global State ---
var targetPatcher = null;
var registry = {};
var uiTask = null; // Global task to prevent V8 garbage collection

// --- OSC Dispatch ---
function anything() {
    var address = messagename;
    var argsArray = arrayfromargs(arguments);
    if (argsArray.length === 0) return;

    try {
        var jsonStr = argsArray[0]; // Single string to bypass the comma trap
        var payload = JSON.parse(jsonStr);

        if (address === "/lofi/init") handleInit(payload);
        else if (address === "/lofi/create") handleCreate(payload);
        else if (address === "/lofi/wire") handleWire(payload);
        else if (address === "/lofi/remove") handleRemove(payload);
        else if (address === "/lofi/ui") handleUI(payload);
        else if (address === "/lofi/inject") handleInject(payload);
        else if (address === "/lofi/map") handleMap(payload);
        else respond({ status: "error", message: "Unknown address: " + address });
    } catch (e) {
        respond({ status: "error", message: e.name + ": " + e.message });
    }
}

// --- Tool Handlers ---
function handleInit(payload) {
    var subNode = this.patcher.newdefault(10, 10, "p", payload.deviceName);
    targetPatcher = subNode.subpatcher();
    targetPatcher.wind.bringtofront();
    respond({ status: "ok", device: payload.deviceName });
}

function handleCreate(payload) {
    if (!targetPatcher) {
        respond({ status: "error", message: "No device initialized" });
        return;
    }
    var args = payload.args || [];
    var obj = targetPatcher.newdefault(payload.x, payload.y, payload.class, ...args);
    registry[payload.id] = obj;
    respond({ status: "ok", id: payload.id });
}

function handleWire(payload) {
    var src = registry[payload.sourceId];
    var dst = registry[payload.destId];
    if (!src || !dst) {
        respond({ status: "error", message: "Wiring failed: Object not found" });
        return;
    }
    targetPatcher.connect(src, payload.outlet, dst, payload.inlet);
    respond({ status: "ok" });
}

function handleRemove(payload) {
    var obj = registry[payload.id];
    if (obj) {
        targetPatcher.remove(obj);
        delete registry[payload.id];
    }
    respond({ status: "ok", id: payload.id });
}

function handleUI(payload) {
    if (!targetPatcher) {
        respond({ status: "error", message: "No device initialized" });
        return;
    }
    var layers = payload.layers || [];
    var i = 0;

    uiTask = new Task(function() {
        if (i < layers.length) {
            var layer = layers[i];
            var args = layer.args || [];

            var obj = targetPatcher.newdefault(layer.x, layer.y, layer.class, ...args);
            obj.message("patching_rect", layer.x, layer.y, layer.width, layer.height);
            obj.message("presentation", 1);
            obj.message("presentation_rect", layer.x, layer.y, layer.width, layer.height);

            registry[layer.name] = obj;
            i++;
            uiTask.schedule(20); // 20ms spacing for the UI thread
        } else {
            respond({ status: "ok", created: layers.length });
        }
    });
    uiTask.schedule(0);
}

function handleInject(payload) {
    var engineObj = registry[payload.targetId];
    if (!engineObj) {
        respond({ status: "error", message: "Target v8 object not found" });
        return;
    }
    engineObj.message("compile", payload.filePath);
    respond({ status: "ok", targetId: payload.targetId, file: payload.filePath });
}

function handleMap(payload) {
    respond({ status: "ok", parameter: payload.parameter });
}

function respond(obj) {
    outlet(0, JSON.stringify(obj));
}
