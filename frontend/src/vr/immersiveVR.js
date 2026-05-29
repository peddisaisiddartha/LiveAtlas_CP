let vrCanvas = null;
let gl = null;
let animationFrame = null;

let program = null;
let texture = null;
let positionBuffer = null;

let yaw = 0;
let pitch = 0;

let targetYaw = 0;
let targetPitch = 0;

const SMOOTH_FACTOR = 0.05;

let orientationHandler = null;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl, vertexSrc, fragmentSrc) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);

  const prog = gl.createProgram();

  gl.attachShader(prog, vertexShader);
  gl.attachShader(prog, fragmentShader);

  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    return null;
  }

  return prog;
}

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
  vrCanvas.style.touchAction = "none";
  vrCanvas.style.zIndex = "999";

  container.appendChild(vrCanvas);

  if (!document.fullscreenElement) {
  container.requestFullscreen?.().catch(() => {});
  }

  gl = vrCanvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    powerPreference: "default",
    preserveDrawingBuffer: false,
  });

  if (!gl) {
    console.error("[ImmersiveVR] WebGL unsupported");
    return;
  }

  const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;

    void main() {
      v_uv = (a_position + 1.0) * 0.5;

      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentShaderSource = `
  precision mediump float;

  varying vec2 v_uv;

  uniform sampler2D u_texture;
  uniform float u_eyeOffset;

  void main() {

    vec2 uv = v_uv;

    /* aspect correction */
    uv.x = (uv.x - 0.5) * 0.88 + 0.5;

    /* stereo offset */
    uv.x += u_eyeOffset * 0.6;

    vec2 center = vec2(0.5, 0.5);

    vec2 delta = uv - center;

    float dist = dot(delta, delta);

    uv += delta * dist * 0.08;

    if (
      uv.x < 0.0 ||
      uv.x > 1.0 ||
      uv.y < 0.0 ||
      uv.y > 1.0
    ) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    gl_FragColor = texture2D(u_texture, uv);
  }
`;

  program = createProgram(
    gl,
    vertexShaderSource,
    fragmentShaderSource
  );

  gl.useProgram(program);

  positionBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]),
    gl.STATIC_DRAW
  );

  const positionLocation =
    gl.getAttribLocation(program, "a_position");

  gl.enableVertexAttribArray(positionLocation);

  gl.vertexAttribPointer(
    positionLocation,
    2,
    gl.FLOAT,
    false,
    0,
    0
  );

  texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_WRAP_S,
    gl.CLAMP_TO_EDGE
  );

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_WRAP_T,
    gl.CLAMP_TO_EDGE
  );

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR
  );

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MAG_FILTER,
    gl.LINEAR
  );

  const eyeOffsetLocation =
    gl.getUniformLocation(program, "u_eyeOffset");



   orientationHandler = (event) => {

    console.log(
    "[GYRO]",
    "gamma:", event.gamma,
    "beta:", event.beta
  );

  if (event.gamma != null) {
    targetYaw = Math.max(
      -1,
      Math.min(1, event.gamma / 35)
    );
  }

  if (event.beta != null) {
    targetPitch = Math.max(
      -0.5,
      Math.min(0.5, event.beta / 120)
    );
  }
};

if (
  typeof DeviceOrientationEvent !== "undefined" &&
  typeof DeviceOrientationEvent.requestPermission === "function"
) {

  DeviceOrientationEvent
    .requestPermission()
    .then(permission => {

      if (permission === "granted") {
        window.addEventListener(
          "deviceorientation",
          orientationHandler
        );
      }

    })
    .catch(console.error);

} else {

  window.addEventListener(
    "deviceorientation",
    orientationHandler
  );
}

  function render() {
    if (!gl || !vrCanvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    if (
      vrCanvas.width !== width ||
      vrCanvas.height !== height
    ) {
      vrCanvas.width = width;
      vrCanvas.height = height;
    }

    gl.viewport(0, 0, width, height);

    gl.bindTexture(gl.TEXTURE_2D, texture);

    if (video.readyState < 2) {

  animationFrame = setTimeout(() => {
    requestAnimationFrame(render);
  }, 33);

  return;
}

    try {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        video
      );
    } catch (e) {}


    yaw += (targetYaw - yaw) * SMOOTH_FACTOR;
    pitch += (targetPitch - pitch) * SMOOTH_FACTOR;

    gl.clearColor(0, 0, 0, 1);

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.SCISSOR_TEST);

    /* LEFT EYE */
    gl.viewport(0, 0, width / 2, height);

    gl.scissor(0, 0, width / 2, height);

    gl.uniform1f(
      eyeOffsetLocation,
      -0.004 - yaw * 0.010
    );

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    /* RIGHT EYE */
    gl.viewport(width / 2, 0, width / 2, height);

    gl.scissor(width / 2, 0, width / 2, height);

    gl.uniform1f(
      eyeOffsetLocation,
      0.004 - yaw * 0.010
    );

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.disable(gl.SCISSOR_TEST);

    animationFrame = setTimeout(() => {
  requestAnimationFrame(render);
}, 33);
  }

  render();

  console.log("[ImmersiveVR] Started");
}

export function stopImmersiveVR() {
  if (animationFrame) {
    clearTimeout(animationFrame);

    animationFrame = null;
  }

  if (texture && gl) {
    gl.deleteTexture(texture);
  }

  if (positionBuffer && gl) {
    gl.deleteBuffer(positionBuffer);
  }

  if (program && gl) {
    gl.deleteProgram(program);
  }

  if (document.fullscreenElement) {
  document.exitFullscreen?.().catch(() => {});
  }

  if (vrCanvas && vrCanvas.parentNode) {
    vrCanvas.parentNode.removeChild(vrCanvas);
  }

  texture = null;
  positionBuffer = null;
  program = null;
  vrCanvas = null;

  const loseContext =
  gl?.getExtension("WEBGL_lose_context");

loseContext?.loseContext();

  gl = null;


 if (orientationHandler) {
  window.removeEventListener(
    "deviceorientation",
    orientationHandler
  );

  orientationHandler = null;
}

  console.log("[ImmersiveVR] Stopped");
}