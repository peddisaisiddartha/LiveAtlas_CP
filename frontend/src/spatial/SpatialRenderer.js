export class SpatialRenderer {
    constructor() {
        this.canvas = null;
        this.gl = null;

        this.sceneCanvas = null;
        this.sceneTexture = null;

        this.depthEngine = null;
        this.depthEstimationRunning = false;

        this.depthCanvas = null;
        this.depthTexture = null

        this.program = null;
        this.positionBuffer = null;
        this.uvBuffer = null;
        this.baseVertices = null;
        this.baseUVs = null;

        this.positionLocation = null;
        this.uvLocation = null;

        this.projectionLocation = null;
        this.viewLocation = null;
        this.modelLocation = null;

        this.parallaxLocation = null;
        this.headPositionLocation = null;

        this.textureLocation = null;
        this.depthTextureLocation = null;

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


        /*
         * Vertex shader
         *
         * The sphere remains the 360° viewing surface.
         * XR projection and view matrices continue to control
         * the actual headset view.
         */

        const vertexShaderSource = `
            attribute vec3 aPosition;
            attribute vec2 aUV;

            uniform mat4 uProjection;
            uniform mat4 uView;
            uniform mat4 uModel;

            varying vec2 vUV;

            void main() {
                vUV = vec2(1.0 - aUV.x, aUV.y);

                gl_Position =
                    uProjection *
                    uView *
                    uModel *
                    vec4(aPosition, 1.0);
            }
        `;


        /*
         * Fragment shader
         *
         * IMPORTANT:
         *
         * The previous implementation used one depth value
         * for the entire scene.
         *
         * This version samples the depth map for EVERY fragment.
         *
         * White  = near
         * Black  = far
         *
         * Near pixels receive stronger parallax.
         * Far pixels receive weaker parallax.
         */

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


        /*
         * Attribute locations
         */

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


        /*
         * Matrix uniforms
         */

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


        /*
         * Spatial uniforms
         */

        this.headPositionLocation =
            gl.getUniformLocation(
                this.program,
                "uHeadPosition"
            );


        /*
         * Texture uniforms
         */

        this.textureLocation =
            gl.getUniformLocation(
                this.program,
                "uTexture"
            );

        this.depthTextureLocation =
            gl.getUniformLocation(
                this.program,
                "uDepthTexture"
            );


        /*
         * Create 360 sphere.
         */

        const sphereData =
            this.createSphere(40, 80);

        const sphereVertices =
            sphereData.vertices;

        const sphereUVs =
            sphereData.uvs;

        this.baseVertices = sphereVertices;
        this.baseUVs = sphereUVs;


        /*
         * Position buffer
         */

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


        /*
         * UV buffer
         */

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

            const phi0 =
                Math.PI * v0;

            const phi1 =
                Math.PI * v1;

            for (
                let column = 0;
                column < columns;
                column++
            ) {

                const u0 =
                    column / columns;

                const u1 =
                    (column + 1) / columns;

                const theta0 =
                    u0 * Math.PI * 2;

                const theta1 =
                    u1 * Math.PI * 2;

                const p00 =
                    this.spherePoint(
                        phi0,
                        theta0
                    );

                const p10 =
                    this.spherePoint(
                        phi1,
                        theta0
                    );

                const p11 =
                    this.spherePoint(
                        phi1,
                        theta1
                    );

                const p01 =
                    this.spherePoint(
                        phi0,
                        theta1
                    );


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
            vertices:
                new Float32Array(vertices),

            uvs:
                new Float32Array(uvs)
        };
    }


    spherePoint(phi, theta) {
        const sinPhi =
            Math.sin(phi);

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


    createProgram(
        vertexShader,
        fragmentShader
    ) {
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
        this.sceneCanvas =
            sceneCanvas;

        if (
            !this.gl ||
            !sceneCanvas
        ) {
            return false;
        }

        const gl = this.gl;

        if (this.sceneTexture) {
            gl.deleteTexture(
                this.sceneTexture
            );
        }

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

        gl.bindTexture(
            gl.TEXTURE_2D,
            null
        );

        console.log(
            "[Spatial] Synthetic 360 texture loaded"
        );

        return true;
    }

            setDepthEngine(depthEngine) {
                if (!depthEngine) {
                    console.warn(
                        "[Spatial] Invalid depth engine"
                    );

                    return false;
                }

                this.depthEngine =
                    depthEngine;

                console.log(
                    "[Spatial] Depth engine attached to renderer"
                );

                return true;
            }


            setVideoSource(video) {
                if (!video) {
                    console.warn(
                        "[Spatial] Invalid video source"
                    );

                    return false;
                }

            if (!this.gl) {
                console.warn(
                    "[Spatial] WebGL context missing for video source"
                );

                return false;
            }

        this.videoSource = video;

        const gl = this.gl;

        if (this.sceneTexture) {
            gl.deleteTexture(
                this.sceneTexture
            );
        }

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

        gl.bindTexture(
            gl.TEXTURE_2D,
            null
        );

        console.log(
            "[Spatial] Real LiveAtlas video texture created"
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

        const gl = this.gl;

        gl.bindTexture(
            gl.TEXTURE_2D,
            this.sceneTexture
        );

        gl.pixelStorei(
            gl.UNPACK_FLIP_Y_WEBGL,
            true
        );

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            video
        );

                if (
            this.depthEngine &&
            !this.depthEstimationRunning
        ) {
            this.depthEstimationRunning = true;

            this.depthEngine
                .estimate(video)
                .then((depthMap) => {
                    if (depthMap?.source) {
                        this.setDepthCanvas(
                            depthMap.source
                        );
                    }
                })
                .catch((error) => {
                    console.warn(
                        "[Spatial] Live depth estimation failed:",
                        error
                    );
                })
                .finally(() => {
                    this.depthEstimationRunning =
                        false;
                });
        }

        gl.bindTexture(
            gl.TEXTURE_2D,
            null
        );
    }



    setDepthCanvas(depthCanvas) {
        this.depthCanvas =
            depthCanvas;

        if (!depthCanvas) {
            console.warn(
                "[Spatial] Depth canvas missing"
            );

            return false;
        }

        if (!this.gl) {
            console.warn(
                "[Spatial] WebGL context missing for depth texture"
            );

            return false;
        }

        const gl = this.gl;

        if (this.depthTexture) {
            gl.deleteTexture(
                this.depthTexture
            );
        }

        this.depthTexture =
            gl.createTexture();

        gl.bindTexture(
            gl.TEXTURE_2D,
            this.depthTexture
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
            depthCanvas
        );

        gl.bindTexture(
            gl.TEXTURE_2D,
            null
        );

        console.log(
            "[Spatial] Renderer depth canvas attached:",
            `${depthCanvas.width}x${depthCanvas.height}`
        );

        console.log(
            "[Spatial] Depth texture uploaded to GPU"
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

        const ctx =
            this.depthCanvas.getContext("2d");

            if (!ctx) {
                return;
            }

        /*
        * Read the complete synthetic depth map once.
        *
        * We deliberately do this on the CPU instead of
        * relying on vertex texture sampling, because this
        * keeps the renderer compatible with WebGL contexts
        * that do not expose reliable vertex texture units.
        */

        const imageData =
            ctx.getImageData(
                0,
                0,
                this.depthCanvas.width,
                this.depthCanvas.height
            );

        const pixels =
            imageData.data;

        const displacedVertices =
            new Float32Array(
                this.baseVertices.length
            );

        const baseRadius = 10.0;

        /*
        * Maximum depth displacement.
        *
        * Far areas remain near the original radius.
        * Near areas move inward.
        */

        const depthScale = 3.0;

        for (
            let i = 0;
            i < this.baseVertices.length;
            i += 3
        ) {
            const u =
                this.baseUVs[
                    (i / 3) * 2
                ];

            const v =
                this.baseUVs[
                    (i / 3) * 2 + 1
                ];

            /*
            * Match the same horizontal UV orientation
            * used by the vertex shader.
            */

            const sampleU =
                1.0 - u;

            const px =
                Math.max(
                    0,
                    Math.min(
                        this.depthCanvas.width - 1,
                        Math.floor(
                            sampleU *
                            this.depthCanvas.width
                        )
                    )
                );

            const py =
                Math.max(
                    0,
                    Math.min(
                        this.depthCanvas.height - 1,
                        Math.floor(
                            v *
                            this.depthCanvas.height
                        )
                    )
                );

            const pixelIndex =
                (
                    py *
                    this.depthCanvas.width +
                    px
                ) * 4;

            const depth =
                pixels[pixelIndex] / 255;

            /*
            * White = near
            * Black = far
            */

            const radius =
                baseRadius -
                depth * depthScale;

            const x =
                this.baseVertices[i];

            const y =
                this.baseVertices[i + 1];

            const z =
                this.baseVertices[i + 2];

            const length =
                Math.sqrt(
                    x * x +
                    y * y +
                    z * z
                );

            if (length > 0) {
                const scale =
                    radius / length;

                displacedVertices[i] =
                    x * scale;

                displacedVertices[i + 1] =
                    y * scale;

                displacedVertices[i + 2] =
                    z * scale;
                } else {
                    displacedVertices[i] = x;
                    displacedVertices[i + 1] = y;
                    displacedVertices[i + 2] = z;
                }
        }

            const gl =
                this.gl;

            gl.bindBuffer(
                gl.ARRAY_BUFFER,
                this.positionBuffer
            );

            gl.bufferData(
                gl.ARRAY_BUFFER,
                displacedVertices,
                gl.STATIC_DRAW
            );

            gl.bindBuffer(
                gl.ARRAY_BUFFER,
                null
            );

            console.log(
                "[Spatial] Depth geometry generated"
            );
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

    const ctx =
        this.depthCanvas.getContext("2d");

    if (!ctx) {
        return;
    }

    const imageData =
        ctx.getImageData(
            0,
            0,
            this.depthCanvas.width,
            this.depthCanvas.height
        );

    const pixels =
        imageData.data;

    const displacedVertices =
        new Float32Array(
            this.baseVertices.length
        );

    const baseRadius = 10.0;
    const depthScale = 4.5;

    for (
        let i = 0;
        i < this.baseVertices.length;
        i += 3
    ) {
        const vertexIndex = i / 3;

        const u =
            this.baseUVs[
                vertexIndex * 2
            ];

        const v =
            this.baseUVs[
                vertexIndex * 2 + 1
            ];

        const sampleU =
            1.0 - u;

        const px =
            Math.max(
                0,
                Math.min(
                    this.depthCanvas.width - 1,
                    Math.floor(
                        sampleU *
                        this.depthCanvas.width
                    )
                )
            );

        const py =
            Math.max(
                0,
                Math.min(
                    this.depthCanvas.height - 1,
                    Math.floor(
                        v *
                        this.depthCanvas.height
                    )
                )
            );

        const pixelIndex =
            (
                py *
                this.depthCanvas.width +
                px
            ) * 4;

        const depth =
            pixels[pixelIndex] / 255;

        const radius =
            baseRadius -
            depth * depthScale;

        const x =
            this.baseVertices[i];

        const y =
            this.baseVertices[i + 1];

        const z =
            this.baseVertices[i + 2];

        const length =
            Math.sqrt(
                x * x +
                y * y +
                z * z
            );

        if (length > 0) {
            const scale =
                radius / length;

            displacedVertices[i] =
                x * scale;

            displacedVertices[i + 1] =
                y * scale;

            displacedVertices[i + 2] =
                z * scale;
        } else {
            displacedVertices[i] = x;
            displacedVertices[i + 1] = y;
            displacedVertices[i + 2] = z;
        }
    }

    const gl =
        this.gl;

    gl.bindBuffer(
        gl.ARRAY_BUFFER,
        this.positionBuffer
    );

    gl.bufferData(
        gl.ARRAY_BUFFER,
        displacedVertices,
        gl.STATIC_DRAW
    );

    gl.bindBuffer(
        gl.ARRAY_BUFFER,
        null
    );

    console.log(
        "[Spatial] Depth geometry generated"
    );
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
                        u *
                        this.depthCanvas.width
                    )
                )
            );

        const y =
            Math.max(
                0,
                Math.min(
                    this.depthCanvas.height - 1,
                    Math.floor(
                        v *
                        this.depthCanvas.height
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


    renderXR(
        frame,
        referenceSpace
    ) {
        if (!this.gl) {
            return;
        }

        const session =
            frame.session;

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

        const gl =
            this.gl;

        gl.disable(
            gl.CULL_FACE
        );

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


        this.updateVideoTexture();

        for (
            const view of pose.views
        ) {

            const viewport =
                layer.getViewport(view);

            gl.viewport(
                viewport.x,
                viewport.y,
                viewport.width,
                viewport.height
            );


            /*
             * IMPORTANT:
             *
             * We pass the actual XR viewer position
             * into drawSphere().
             *
             * This is the 6DoF position that will drive
             * depth-dependent parallax.
             */

            const viewerPosition =
                view.transform.position;

            this.drawSphere(
                view.projectionMatrix,
                view.transform.inverse.matrix,
                viewerPosition
            );
        }
    }


    drawSphere(
        projectionMatrix,
        viewMatrix,
        viewerPosition = {
            x: 0,
            y: 0,
            z: 0
        }
    ) {

        const gl =
            this.gl;

        if (!this.sceneTexture) {
            return;
        }

        if (!this.depthTexture) {
            return;
        }


        /*
         * Keep a small diagnostic value.
         *
         * This is no longer used to drive the entire
         * scene. The shader now samples depth per pixel.
         */

        const centerDepth =
            this.getDepthAt(
                0.5,
                0.5
            );


        if (this.debug) {

            console.log(
                "[Spatial Parallax MVP]",
                {
                    centerDepth,
                    headX: viewerPosition.x,
                    headY: viewerPosition.y,
                    headZ: viewerPosition.z
                }
            );

            this.debug = false;
        }


        gl.useProgram(
            this.program
        );


        /*
         * Position buffer
         */

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


        /*
         * UV buffer
         */

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


        /*
         * Existing large sphere model.
         *
         * Preserved from the current renderer.
         */

        const modelMatrix =
            new Float32Array([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);


        /*
         * XR matrices
         */

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


        /*
         * 6DoF viewer position.
         */

        gl.uniform3f(
            this.headPositionLocation,
            viewerPosition.x || 0,
            viewerPosition.y || 0,
            viewerPosition.z || 0
        );


        /*
         * Scene texture → texture unit 0
         */

        gl.activeTexture(
            gl.TEXTURE0
        );

        gl.bindTexture(
            gl.TEXTURE_2D,
            this.sceneTexture
        );

        gl.uniform1i(
            this.textureLocation,
            0
        );


        /*
         * Depth texture → texture unit 1
         */

        gl.activeTexture(
            gl.TEXTURE1
        );

        gl.bindTexture(
            gl.TEXTURE_2D,
            this.depthTexture
        );

        gl.uniform1i(
            this.depthTextureLocation,
            1
        );


        /*
         * Draw the 360 sphere.
         */

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

        const gl =
            this.gl;

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

        if (
            this.gl &&
            this.sceneTexture
        ) {
            this.gl.deleteTexture(
                this.sceneTexture
            );
        }

        if (
            this.gl &&
            this.depthTexture
        ) {
            this.gl.deleteTexture(
                this.depthTexture
            );
        }

        this.canvas = null;
        this.gl = null;
        this.program = null;

        this.positionBuffer = null;
        this.uvBuffer = null;

        this.sceneTexture = null;
        this.depthTexture = null;

        console.log(
            "[Spatial] WebGL renderer destroyed"
        );
    }
}


export default SpatialRenderer;