export class SpatialRenderer {
    constructor() {
        this.canvas = null;
        this.gl = null;

        this.sceneCanvas = null;
        this.sceneTexture = null;
        this.depthCanvas = null;

        this.program = null;
        this.positionBuffer = null;

        this.positionLocation = null;
        this.projectionLocation = null;
        this.viewLocation = null;
        this.modelLocation = null;

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
            antialias: true
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
                uniform float uParallaxScale;

                void main() {
                    vUV = vec2(1.0 - aUV.x, aUV.y);

                    vec3 displacedPosition =
                        aPosition;

                    displacedPosition +=
                        normalize(aPosition) *
                        uParallaxScale *
                        0.02;

                    gl_Position =
                        uProjection *
                        uView *
                        uModel *
                        vec4(displacedPosition, 1.0);
                }
            `;

            const fragmentShaderSource = `
                precision mediump float;

                uniform sampler2D uTexture;

                varying vec2 vUV;

                void main() {
                    gl_FragColor =
                        texture2D(
                            uTexture,
                            vUV
                        );
                }
            `;

        const vertexShader =
            this.createShader(
                gl.VERTEX_SHADER,
                vertexShaderSource
            );

        const fragmentShader =
            this.createShader(
                gl.FRAGMENT_SHADER,
                fragmentShaderSource
            );

        if (!vertexShader || !fragmentShader) {
            return false;
        }

        this.program =
            this.createProgram(
                vertexShader,
                fragmentShader
            );

        if (!this.program) {
            return false;
        }

        this.positionLocation =
            gl.getAttribLocation(
                this.program,
                "aPosition"
            );

        this.uvLocation =
            gl.getAttribLocation(
                this.program,
                "aUV"
            );

        this.projectionLocation =
            gl.getUniformLocation(
                this.program,
                "uProjection"
            );

        this.viewLocation =
            gl.getUniformLocation(
                this.program,
                "uView"
            );

        this.modelLocation =
            gl.getUniformLocation(
                this.program,
                "uModel"
            );

        this.parallaxLocation =
            gl.getUniformLocation(
                this.program,
                "uParallaxScale"
            );

        const sphereData = this.createSphere(40, 80);

        const sphereVertices = sphereData.vertices;
        const sphereUVs = sphereData.uvs;

        this.positionBuffer =
            gl.createBuffer();

            gl.bindBuffer(
                gl.ARRAY_BUFFER,
                this.positionBuffer
            );

            gl.bufferData(
                gl.ARRAY_BUFFER,
                sphereVertices,
                gl.STATIC_DRAW
            );

            this.uvBuffer =
                gl.createBuffer();

            gl.bindBuffer(
                gl.ARRAY_BUFFER,
                this.uvBuffer
            );

            gl.bufferData(
                gl.ARRAY_BUFFER,
                sphereUVs,
                gl.STATIC_DRAW
            );

            this.vertexCount =
                sphereVertices.length / 3;

                gl.enable(gl.DEPTH_TEST);

            console.log(
                "[Spatial] WebGL renderer initialized"
            );

            return true;
        }

        createSphere(rows, columns) {
            const vertices = [];
            const uvs = [];

            for (let row = 0; row < rows; row++) {
                const v0 = row / rows;
                const v1 = (row + 1) / rows;

                const phi0 = Math.PI * v0;
                const phi1 = Math.PI * v1;

                for (let column = 0; column < columns; column++) {
                    const u0 = column / columns;
                    const u1 = (column + 1) / columns;

                    const theta0 = u0 * Math.PI * 2;
                    const theta1 = u1 * Math.PI * 2;

                    const p00 = this.spherePoint(phi0, theta0);
                    const p10 = this.spherePoint(phi1, theta0);
                    const p11 = this.spherePoint(phi1, theta1);
                    const p01 = this.spherePoint(phi0, theta1);

                    vertices.push(
                        ...p00,
                        ...p10,
                        ...p11,

                        ...p00,
                        ...p11,
                        ...p01
                    );

                    uvs.push(
                        u0, v0,
                        u0, v1,
                        u1, v1,

                        u0, v0,
                        u1, v1,
                        u1, v0
                    );
                }
            }

        return {
            vertices: new Float32Array(vertices),
            uvs: new Float32Array(uvs)
        };
    }

    spherePoint(phi, theta) {
        const sinPhi = Math.sin(phi);

        return [
            sinPhi * Math.cos(theta),
            Math.cos(phi),
            sinPhi * Math.sin(theta)
        ];
    }


    createShader(type, source) {
        const gl = this.gl;

        const shader =
            gl.createShader(type);

        gl.shaderSource(
            shader,
            source
        );

        gl.compileShader(shader);

        if (
            !gl.getShaderParameter(
                shader,
                gl.COMPILE_STATUS
            )
        ) {
            console.error(
                "[Spatial] Shader error:",
                gl.getShaderInfoLog(shader)
            );

            gl.deleteShader(shader);

            return null;
        }

        return shader;
    }

    createProgram(vertexShader, fragmentShader) {
        const gl = this.gl;

        const program =
            gl.createProgram();

        gl.attachShader(
            program,
            vertexShader
        );

        gl.attachShader(
            program,
            fragmentShader
        );

        gl.linkProgram(program);

        if (
            !gl.getProgramParameter(
                program,
                gl.LINK_STATUS
            )
        ) {
            console.error(
                "[Spatial] Program error:",
                gl.getProgramInfoLog(program)
            );

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

            this.sceneTexture =
                gl.createTexture();

            gl.bindTexture(
                gl.TEXTURE_2D,
                this.sceneTexture
            );

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

            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                sceneCanvas
            );

            console.log(
                "[Spatial] Synthetic 360 texture loaded"
            );

            return true;
        }

        setDepthCanvas(depthCanvas) {
            this.depthCanvas = depthCanvas;

            if (!depthCanvas) {
                console.warn(
                    "[Spatial] Depth canvas missing"
                );

                return false;
            }

            console.log(
                "[Spatial] Renderer depth canvas attached:",
                `${depthCanvas.width}x${depthCanvas.height}`
            );

            return true;
        }


        getDepthAt(u, v) {
            if (!this.depthCanvas) {
                return 0;
            }

            const ctx =
                this.depthCanvas.getContext("2d");

            if (!ctx) {
                return 0;
            }

            const x =
                Math.max(
                    0,
                    Math.min(
                        this.depthCanvas.width - 1,
                        Math.floor(
                            u * this.depthCanvas.width
                        )
                    )
                );

            const y =
                Math.max(
                    0,
                    Math.min(
                        this.depthCanvas.height - 1,
                        Math.floor(
                            v * this.depthCanvas.height
                        )
                    )
                );

            const pixel =
                ctx.getImageData(
                    x,
                    y,
                    1,
                    1
                ).data;

                return pixel[0] / 255;
        }



        async setupXR(session) {
            if (!this.gl) {
                console.error(
                    "[Spatial] WebGL context missing"
                );

                return false;
            }

            await this.gl.makeXRCompatible();

            const glLayer =
                new XRWebGLLayer(
                    session,
                    this.gl
                );

                session.updateRenderState({
                    baseLayer: glLayer
                });

                console.log(
                    "[Spatial] XRWebGLLayer configured"
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
                referenceSpace
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

        gl.disable(gl.CULL_FACE);

        gl.bindFramebuffer(
            gl.FRAMEBUFFER,
            layer.framebuffer
        );

        gl.clearColor(
            0.03,
            0.03,
            0.03,
            1.0
        );

        gl.clear(
            gl.COLOR_BUFFER_BIT |
            gl.DEPTH_BUFFER_BIT
        );

        for (const view of pose.views) {
            const viewport =
                layer.getViewport(view);

            gl.viewport(
                viewport.x,
                viewport.y,
                viewport.width,
                viewport.height
            );

            this.drawSphere(
                view.projectionMatrix,
                view.transform.inverse.matrix
            );
        }
    }

        drawSphere(projectionMatrix, viewMatrix) {
            const gl = this.gl;

            const centerDepth =
                this.getDepthAt(0.5, 0.5);

            const movementX =
                viewMatrix[12] || 0;

            const movementY =
                viewMatrix[13] || 0;

            const movementZ =
                viewMatrix[14] || 0;

            const movement =
                Math.sqrt(
                    movementX * movementX +
                    movementY * movementY +
                    movementZ * movementZ
                );

            const parallaxScale =
                0.03 +
                centerDepth * 0.07 +
                movement * 0.05;

            if (this.debug) {
                console.log(
                    "[Spatial Parallax]",
                    {
                        depth: centerDepth,
                        scale: parallaxScale
                    }
                );

                this.debug = false;
            }

            if (!this.sceneTexture) {
                return;
            }

            gl.useProgram(this.program);

            gl.bindBuffer(
                gl.ARRAY_BUFFER,
                this.positionBuffer
            );

            gl.enableVertexAttribArray(
                this.positionLocation
            );

            gl.vertexAttribPointer(
                this.positionLocation,
                3,
                gl.FLOAT,
                false,
                0,
                0
            );

            gl.bindBuffer(
                gl.ARRAY_BUFFER,
                this.uvBuffer
            );

            gl.enableVertexAttribArray(
                this.uvLocation
            );

            gl.vertexAttribPointer(
                this.uvLocation,
                2,
                gl.FLOAT,
                false,
                0,
                0
            );          

            const modelMatrix =
                new Float32Array([
                    10, 0, 0, 0,
                    0, 10, 0, 0,
                    0, 0, 10, 0,
                    0, 0, 0, 1
                ]);

                gl.uniformMatrix4fv(
                    this.projectionLocation,
                    false,
                    projectionMatrix
                );

                gl.uniformMatrix4fv(
                    this.viewLocation,
                    false,
                    viewMatrix
                );

                gl.uniformMatrix4fv(
                    this.modelLocation,
                    false,
                    modelMatrix
                );

                gl.uniform1f(
                    this.parallaxLocation,
                    parallaxScale
                );

                gl.bindTexture(
                    gl.TEXTURE_2D,
                    this.sceneTexture
                );

                const textureLocation =
                    gl.getUniformLocation(
                        this.program,
                        "uTexture"
                    );

                    gl.activeTexture(
                        gl.TEXTURE0
                    );

                    gl.uniform1i(
                        textureLocation,
                        0
                    );

                    gl.drawArrays(
                        gl.TRIANGLES,
                        0,
                        this.vertexCount
                    );
            }

        render(pose = {}) {
        if (!this.gl) {
            return;
        }

        const gl = this.gl;

        gl.bindFramebuffer(
            gl.FRAMEBUFFER,
            null
        );

        gl.viewport(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );

        gl.clearColor(
            0.03,
            0.03,
            0.03,
            1.0
        );

        gl.clear(
            gl.COLOR_BUFFER_BIT |
            gl.DEPTH_BUFFER_BIT
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
            this.canvas = null;
            this.gl = null;
            this.program = null;
            this.positionBuffer = null;

            console.log(
                "[Spatial] WebGL renderer destroyed"
            );
        }
    }


export default SpatialRenderer;