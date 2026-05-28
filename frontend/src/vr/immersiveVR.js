let vrCanvas = null;
let gl = null;
let animationFrame = null;

export function startImmersiveVR(container, video) {
  if (!container || !video) {
    console.warn("[ImmersiveVR] Missing container or video");
    return;
  }

  stopImmersiveVR();

  vrCanvas = document.createElement("canvas");

  vrCanvas.style.position = "absolute";
  vrCanvas.style.inset = "0";
  vrCanvas.style.width = "100%";
  vrCanvas.style.height = "100%";
  vrCanvas.style.background = "black";
  vrCanvas.style.zIndex = "5";

  container.appendChild(vrCanvas);

  gl = vrCanvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    powerPreference: "high-performance",
  });

  if (!gl) {
    console.error("[ImmersiveVR] WebGL not supported");
    return;
  }

  function render() {
    if (!gl || !vrCanvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    if (vrCanvas.width !== width || vrCanvas.height !== height) {
      vrCanvas.width = width;
      vrCanvas.height = height;
    }

    gl.viewport(0, 0, width, height);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    animationFrame = requestAnimationFrame(render);
  }

  render();

  console.log("[ImmersiveVR] Started");
}

export function stopImmersiveVR() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  if (vrCanvas && vrCanvas.parentNode) {
    vrCanvas.parentNode.removeChild(vrCanvas);
  }

  vrCanvas = null;
  gl = null;

  console.log("[ImmersiveVR] Stopped");
}