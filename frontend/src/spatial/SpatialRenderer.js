// frontend/src/spatial/SpatialRenderer.js

export class SpatialRenderer {
  constructor() {
    this.canvas = null;
    this.gl = null;

    this.sceneCanvas = null;
    this.sceneTexture = null;
    this.videoSource = null;
    this.lastVideoTime = -1;

    this.depthEngine = null;
    this.depthCanvas = null;

    this.program = null;
    this.positionBuffer = null;
    this.uvBuffer = null;
    this.baseVertices = null;
    this.baseUVs = null;
    this.vertexCount = 0;

    this.positionLocation = null;
    this.uvLocation = null;

    this.projectionLocation = null;
    this.viewLocation = null;
    this.modelLocation = null;
    this.textureLocation = null;

    this.width = 0;
    this.height = 0;

    this.debug = true;
  }

  initialize(canvas) {
    if (!canvas) {
      console.warn("[Spatial] Canvas not provided");
      return false;
    }

    this.canvas = canvas;

    this.gl = canvas.getContext("webgl", {
      xrCompatible: true,
      alpha: false,
      antialias: false,
      depth: true,
      stencil: false,
    });

    if (!this.gl) {
      console.error("[Spatial] WebGL unavailable");
      return false;
    }

    const gl = this.gl;

    const vertexShaderSource = `
      attribute vec3 aPosition;
      attribute vec2 aUV;

      uniform mat4 uProjection;
      uniform mat4 uView;
      uniform mat4 uModel;

      varying vec2 vUV;

      void main() {
        vUV = aUV;

        gl_Position =
          uProjection *
          uView *
          uModel *
          vec4(aPosition, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;

      uniform sampler2D uTexture;

      varying vec2 vUV;

      void main() {
        gl_FragColor = texture2D(uTexture, vUV);
      }
    `;

    const vertexShader = this.createShader(
      gl.VERTEX_SHADER,
      vertexShaderSource,
    );

    const fragmentShader = this.createShader(
      gl.FRAGMENT_SHADER,
      fragmentShaderSource,
    );

    if (!vertexShader || !fragmentShader) {
      return false;
    }

    this.program = this.createProgram(vertexShader, fragmentShader);

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!this.program) {
      return false;
    }

    this.positionLocation = gl.getAttribLocation(
      this.program,
      "aPosition",
    );

    this.uvLocation = gl.getAttribLocation(
      this.program,
      "aUV",
    );

    this.projectionLocation = gl.getUniformLocation(
      this.program,
      "uProjection",
    );

    this.viewLocation = gl.getUniformLocation(
      this.program,
      "uView",
    );

    this.modelLocation = gl.getUniformLocation(
      this.program,
      "uModel",
    );

    this.textureLocation = gl.getUniformLocation(
      this.program,
      "uTexture",
    );

    const surfaceData = this.createSpatialSurface();

    this.baseVertices = surfaceData.vertices;
    this.baseUVs = surfaceData.uvs;

    this.positionBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this.baseVertices,
      gl.DYNAMIC_DRAW,
    );

    this.uvBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this.baseUVs,
      gl.STATIC_DRAW,
    );

    this.vertexCount = this.baseVertices.length / 3;

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    if (this.videoSource) {
      this.createVideoTexture();
    }

    console.log("[Spatial] WebGL spatial renderer initialized");

    return true;
  }

  createSpatialSurface(rows = 40, columns = 80) {
    const vertices = [];
    const uvs = [];

    const width = 8.533;
    const height = 4.8;
    const centerY = 1.6;
    const centerZ = -2.5;

    for (let row = 0; row <= rows; row += 1) {
      const v = row / rows;
      const y = centerY + (0.5 - v) * height;

      for (let column = 0; column <= columns; column += 1) {
        const u = column / columns;
        const x = (u - 0.5) * width;

        vertices.push(
          x,
          y,
          centerZ,
        );

        uvs.push(
          u,
          v,
        );
      }
    }

    const indexedVertices = [];
    const indexedUVs = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const topLeft =
          row * (columns + 1) + column;

        const topRight = topLeft + 1;

        const bottomLeft =
          (row + 1) * (columns + 1) + column;

        const bottomRight = bottomLeft + 1;

        indexedVertices.push(
          vertices[topLeft * 3],
          vertices[topLeft * 3 + 1],
          vertices[topLeft * 3 + 2],

          vertices[bottomLeft * 3],
          vertices[bottomLeft * 3 + 1],
          vertices[bottomLeft * 3 + 2],

          vertices[topRight * 3],
          vertices[topRight * 3 + 1],
          vertices[topRight * 3 + 2],

          vertices[topRight * 3],
          vertices[topRight * 3 + 1],
          vertices[topRight * 3 + 2],

          vertices[bottomLeft * 3],
          vertices[bottomLeft * 3 + 1],
          vertices[bottomLeft * 3 + 2],

          vertices[bottomRight * 3],
          vertices[bottomRight * 3 + 1],
          vertices[bottomRight * 3 + 2],
        );

        indexedUVs.push(
          uvs[topLeft * 2],
          uvs[topLeft * 2 + 1],

          uvs[bottomLeft * 2],
          uvs[bottomLeft * 2 + 1],

          uvs[topRight * 2],
          uvs[topRight * 2 + 1],

          uvs[topRight * 2],
          uvs[topRight * 2 + 1],

          uvs[bottomLeft * 2],
          uvs[bottomLeft * 2 + 1],

          uvs[bottomRight * 2],
          uvs[bottomRight * 2 + 1],
        );
      }
    }

    return {
      vertices: new Float32Array(indexedVertices),
      uvs: new Float32Array(indexedUVs),
    };
  }

  createShader(type, source) {
    const gl = this.gl;

    const shader = gl.createShader(type);

    if (!shader) {
      return null;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(
        "[Spatial] Shader error:",
        gl.getShaderInfoLog(shader),
      );

      gl.deleteShader(shader);

      return null;
    }

    return shader;
  }

  createProgram(vertexShader, fragmentShader) {
    const gl = this.gl;

    const program = gl.createProgram();

    if (!program) {
      return null;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(
        "[Spatial] Program error:",
        gl.getProgramInfoLog(program),
      );

      gl.deleteProgram(program);

      return null;
    }

    return program;
  }

  setSceneCanvas(sceneCanvas) {
    this.sceneCanvas = sceneCanvas;

    if (!this.gl || !sceneCanvas) {
      return false;
    }

    const gl = this.gl;

    if (this.sceneTexture) {
      gl.deleteTexture(this.sceneTexture);
    }

    this.sceneTexture = gl.createTexture();

    gl.bindTexture(
      gl.TEXTURE_2D,
      this.sceneTexture,
    );

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_S,
      gl.CLAMP_TO_EDGE,
    );

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_T,
      gl.CLAMP_TO_EDGE,
    );

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR,
    );

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      gl.LINEAR,
    );

    gl.pixelStorei(
      gl.UNPACK_FLIP_Y_WEBGL,
      true,
    );

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      sceneCanvas,
    );

    gl.bindTexture(
      gl.TEXTURE_2D,
      null,
    );

    return true;
  }

  setDepthEngine(depthEngine) {
    if (!depthEngine) {
      console.warn("[Spatial] Invalid depth engine");
      return false;
    }

    this.depthEngine = depthEngine;

    console.log(
      "[Spatial] Depth engine attached to renderer",
    );

    return true;
  }

  setVideoSource(video) {
    if (!video) {
      console.warn("[Spatial] Invalid video source");
      return false;
    }

    this.videoSource = video;
    this.lastVideoTime = -1;

    if (!this.gl) {
      console.log(
        "[Spatial] WebGL not ready; video source stored",
      );

      return true;
    }

    this.createVideoTexture();

    return true;
  }

  createVideoTexture() {
    if (!this.gl || !this.videoSource) {
      return false;
    }

    const gl = this.gl;

    if (this.sceneTexture) {
      gl.deleteTexture(this.sceneTexture);
    }

    this.sceneTexture = gl.createTexture();

    gl.bindTexture(
      gl.TEXTURE_2D,
      this.sceneTexture,
    );

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_S,
      gl.CLAMP_TO_EDGE,
    );

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_T,
      gl.CLAMP_TO_EDGE,
    );

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR,
    );

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      gl.LINEAR,
    );

    gl.pixelStorei(
      gl.UNPACK_FLIP_Y_WEBGL,
      true,
    );

    gl.bindTexture(
      gl.TEXTURE_2D,
      null,
    );

    console.log(
      "[Spatial] Real LiveAtlas video texture created",
    );

    return true;
  }

  updateVideoTexture() {
    if (
      !this.gl ||
      !this.videoSource ||
      !this.sceneTexture
    ) {
      return;
    }

    const video = this.videoSource;

    if (
      video.readyState <
      HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      return;
    }

    if (
      Number.isFinite(video.currentTime) &&
      video.currentTime === this.lastVideoTime
    ) {
      return;
    }

    const gl = this.gl;

    gl.bindTexture(
      gl.TEXTURE_2D,
      this.sceneTexture,
    );

    gl.pixelStorei(
      gl.UNPACK_FLIP_Y_WEBGL,
      true,
    );

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      video,
    );

    gl.bindTexture(
      gl.TEXTURE_2D,
      null,
    );

    this.lastVideoTime = video.currentTime;
  }

  setDepthCanvas(depthCanvas) {
    if (!depthCanvas) {
      console.warn("[Spatial] Depth canvas missing");
      return false;
    }

    this.depthCanvas = depthCanvas;

    console.log(
      "[Spatial] Renderer depth canvas attached:",
      `${depthCanvas.width}x${depthCanvas.height}`,
    );

    this.applyDepthToGeometry();

    return true;
  }

  applyDepthToGeometry() {
    if (
      !this.gl ||
      !this.depthCanvas ||
      !this.positionBuffer ||
      !this.baseVertices ||
      !this.baseUVs
    ) {
      return;
    }

    const ctx = this.depthCanvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      },
    );

    if (!ctx) {
      return;
    }

    const imageData = ctx.getImageData(
      0,
      0,
      this.depthCanvas.width,
      this.depthCanvas.height,
    );

    const pixels = imageData.data;

    const displacedVertices =
      new Float32Array(
        this.baseVertices.length,
      );

    const baseZ = -3.0;
    const depthScale = 0.8;

    const width = this.depthCanvas.width;
    const height = this.depthCanvas.height;

    for (
      let i = 0;
      i < this.baseVertices.length;
      i += 3
    ) {
      const vertexIndex = i / 3;

      const u =
        this.baseUVs[vertexIndex * 2];

      const v =
        this.baseUVs[vertexIndex * 2 + 1];

      const px = Math.max(
        0,
        Math.min(
          width - 1,
          Math.floor(u * width),
        ),
      );

      const py = Math.max(
        0,
        Math.min(
          height - 1,
          Math.floor(v * height),
        ),
      );

      const pixelIndex =
        (py * width + px) * 4;

      const depth =
        pixels[pixelIndex] / 255;

      displacedVertices[i] =
        this.baseVertices[i];

      displacedVertices[i + 1] =
        this.baseVertices[i + 1];

      displacedVertices[i + 2] =
        baseZ + depth * depthScale;
    }

    const gl = this.gl;

    gl.bindBuffer(
      gl.ARRAY_BUFFER,
      this.positionBuffer,
    );

    gl.bufferData(
      gl.ARRAY_BUFFER,
      displacedVertices,
      gl.STATIC_DRAW,
    );

    gl.bindBuffer(
      gl.ARRAY_BUFFER,
      null,
    );

    console.log(
      "[Spatial] AI depth geometry generated",
    );
  }

  async setupXR(session) {
    if (!this.gl) {
      console.error(
        "[Spatial] WebGL context missing",
      );

      return false;
    }

    await this.gl.makeXRCompatible();

    const glLayer = new XRWebGLLayer(
      session,
      this.gl,
      {
        alpha: false,
        antialias: false,
        depth: true,
        stencil: false,
      },
    );

    session.updateRenderState({
      baseLayer: glLayer,
    });

    console.log(
      "[Spatial] XRWebGLLayer configured",
    );

    return true;
  }

  renderXR(frame, referenceSpace) {
    if (!this.gl) {
      return;
    }

    const session = frame.session;

    const pose =
      frame.getViewerPose(
        referenceSpace,
      );

    if (!pose) {
      return;
    }

    const layer =
      session.renderState.baseLayer;

    if (!layer) {
      return;
    }

    const gl = this.gl;

    gl.bindFramebuffer(
      gl.FRAMEBUFFER,
      layer.framebuffer,
    );

    gl.enable(gl.DEPTH_TEST);

    gl.clearColor(
      0,
      0,
      0,
      1,
    );

    gl.clear(
      gl.COLOR_BUFFER_BIT |
      gl.DEPTH_BUFFER_BIT,
    );

    this.updateVideoTexture();

    for (const view of pose.views) {
      const viewport =
        layer.getViewport(view);

      if (!viewport) {
        continue;
      }

      gl.viewport(
        viewport.x,
        viewport.y,
        viewport.width,
        viewport.height,
      );

      this.drawSpatialSurface(
        view.projectionMatrix,
        view.transform.inverse.matrix,
      );
    }
  }

  drawSpatialSurface(
    projectionMatrix,
    viewMatrix,
  ) {
    const gl = this.gl;

    if (
      !gl ||
      !this.program ||
      !this.sceneTexture ||
      !this.positionBuffer ||
      !this.uvBuffer
    ) {
      return;
    }

    gl.useProgram(this.program);

    gl.bindBuffer(
      gl.ARRAY_BUFFER,
      this.positionBuffer,
    );

    gl.enableVertexAttribArray(
      this.positionLocation,
    );

    gl.vertexAttribPointer(
      this.positionLocation,
      3,
      gl.FLOAT,
      false,
      0,
      0,
    );

    gl.bindBuffer(
      gl.ARRAY_BUFFER,
      this.uvBuffer,
    );

    gl.enableVertexAttribArray(
      this.uvLocation,
    );

    gl.vertexAttribPointer(
      this.uvLocation,
      2,
      gl.FLOAT,
      false,
      0,
      0,
    );

    const modelMatrix =
      new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
      ]);

    gl.uniformMatrix4fv(
      this.projectionLocation,
      false,
      projectionMatrix,
    );

    gl.uniformMatrix4fv(
      this.viewLocation,
      false,
      viewMatrix,
    );

    gl.uniformMatrix4fv(
      this.modelLocation,
      false,
      modelMatrix,
    );

    gl.activeTexture(
      gl.TEXTURE0,
    );

    gl.bindTexture(
      gl.TEXTURE_2D,
      this.sceneTexture,
    );

    gl.uniform1i(
      this.textureLocation,
      0,
    );

    gl.drawArrays(
      gl.TRIANGLES,
      0,
      this.vertexCount,
    );

    gl.bindTexture(
      gl.TEXTURE_2D,
      null,
    );
  }

  render() {
    if (!this.gl) {
      return;
    }

    const gl = this.gl;

    gl.bindFramebuffer(
      gl.FRAMEBUFFER,
      null,
    );

    gl.viewport(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );

    gl.clearColor(
      0.03,
      0.03,
      0.03,
      1,
    );

    gl.clear(
      gl.COLOR_BUFFER_BIT |
      gl.DEPTH_BUFFER_BIT,
    );
  }

  resize() {
    if (!this.canvas) {
      return;
    }

    this.width =
      window.innerWidth;

    this.height =
      window.innerHeight;

    this.canvas.width =
      this.width;

    this.canvas.height =
      this.height;
  }

  destroy() {
    if (!this.gl) {
      return;
    }

    const gl = this.gl;

    if (this.sceneTexture) {
      gl.deleteTexture(
        this.sceneTexture,
      );
    }

    if (this.positionBuffer) {
      gl.deleteBuffer(
        this.positionBuffer,
      );
    }

    if (this.uvBuffer) {
      gl.deleteBuffer(
        this.uvBuffer,
      );
    }

    if (this.program) {
      gl.deleteProgram(
        this.program,
      );
    }

    this.canvas = null;
    this.gl = null;
    this.program = null;

    this.positionBuffer = null;
    this.uvBuffer = null;

    this.sceneTexture = null;
    this.depthCanvas = null;
    this.videoSource = null;

    this.baseVertices = null;
    this.baseUVs = null;

    this.vertexCount = 0;
    this.lastVideoTime = -1;

    console.log(
      "[Spatial] WebGL renderer destroyed",
    );
  }
}

export default SpatialRenderer;