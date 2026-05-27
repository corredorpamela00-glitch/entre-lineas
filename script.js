// =====================
    // TouchTexture class
    // =====================
    class TouchTexture {
      constructor() {
        this.size = 64;
        this.width = this.height = this.size;
        this.maxAge = 64;
        this.radius = 0.25 * this.size;
        this.speed = 1 / this.maxAge;
        this.trail = [];
        this.last = null;
        this.initTexture();
      }
      initTexture() {
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext("2d");
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.texture = new THREE.Texture(this.canvas);
      }
      update() {
        this.clear();
        let speed = this.speed;
        for (let i = this.trail.length - 1; i >= 0; i--) {
          const point = this.trail[i];
          let f = point.force * speed * (1 - point.age / this.maxAge);
          point.x += point.vx * f;
          point.y += point.vy * f;
          point.age++;
          if (point.age > this.maxAge) {
            this.trail.splice(i, 1);
          } else {
            this.drawPoint(point);
          }
        }
        this.texture.needsUpdate = true;
      }
      clear() {
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
      addTouch(point) {
        let force = 0;
        let vx = 0;
        let vy = 0;
        const last = this.last;
        if (last) {
          const dx = point.x - last.x;
          const dy = point.y - last.y;
          if (dx === 0 && dy === 0) return;
          const dd = dx * dx + dy * dy;
          let d = Math.sqrt(dd);
          vx = dx / d;
          vy = dy / d;
          force = Math.min(dd * 20000, 2.0);
        }
        this.last = {
          x: point.x,
          y: point.y
        };
        this.trail.push({
          x: point.x,
          y: point.y,
          age: 0,
          force,
          vx,
          vy
        });
      }
      drawPoint(point) {
        const pos = {
          x: point.x * this.width,
          y: (1 - point.y) * this.height
        };
        let intensity = 1;
        if (point.age < this.maxAge * 0.3) {
          intensity = Math.sin((point.age / (this.maxAge * 0.3)) * (Math.PI / 2));
        } else {
          const t = 1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7);
          intensity = -t * (t - 2);
        }
        intensity *= point.force;
        const radius = this.radius;
        let color = `${((point.vx + 1) / 2) * 255}, ${((point.vy + 1) / 2) * 255}, ${intensity * 255}`;
        let offset = this.size * 5;
        this.ctx.shadowOffsetX = offset;
        this.ctx.shadowOffsetY = offset;
        this.ctx.shadowBlur = radius * 1;
        this.ctx.shadowColor = `rgba(${color},${0.2 * intensity})`;
        this.ctx.beginPath();
        this.ctx.fillStyle = "rgba(255,0,0,1)";
        this.ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    // =====================
    // GradientBackground class
    // =====================
    class GradientBackground {
      constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.mesh = null;
        this.uniforms = {
          uTime: {
            value: 0
          },
          uResolution: {
            value: new THREE.Vector2(window.innerWidth, window.innerHeight)
          },
          uColor1: {
            value: new THREE.Vector3(0.945, 0.353, 0.133)
          },
          uColor2: {
            value: new THREE.Vector3(0.039, 0.055, 0.153)
          },
          uColor3: {
            value: new THREE.Vector3(0.945, 0.353, 0.133)
          },
          uColor4: {
            value: new THREE.Vector3(0.039, 0.055, 0.153)
          },
          uColor5: {
            value: new THREE.Vector3(0.945, 0.353, 0.133)
          },
          uColor6: {
            value: new THREE.Vector3(0.039, 0.055, 0.153)
          },
          uSpeed: {
            value: 1.2
          },
          uIntensity: {
            value: 1.8
          },
          uTouchTexture: {
            value: null
          },
          uGrainIntensity: {
            value: 0.08
          },
          uZoom: {
            value: 1.0
          },
          uDarkNavy: {
            value: new THREE.Vector3(0.039, 0.055, 0.153)
          },
          uGradientSize: {
            value: 1.0
          },
          uGradientCount: {
            value: 6.0
          },
          uColor1Weight: {
            value: 1.0
          },
          uColor2Weight: {
            value: 1.0
          }
        };
      }
      init() {
        const viewSize = this.sceneManager.getViewSize();
        const geometry = new THREE.PlaneGeometry(viewSize.width, viewSize.height, 1, 1);
        const material = new THREE.ShaderMaterial({
          uniforms: this.uniforms,
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vec3 pos = position.xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
              vUv = uv;
            }
          `,
          fragmentShader: `
            uniform float uTime;
            uniform vec2 uResolution;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            uniform vec3 uColor3;
            uniform vec3 uColor4;
            uniform vec3 uColor5;
            uniform vec3 uColor6;
            uniform float uSpeed;
            uniform float uIntensity;
            uniform sampler2D uTouchTexture;
            uniform float uGrainIntensity;
            uniform float uZoom;
            uniform vec3 uDarkNavy;
            uniform float uGradientSize;
            uniform float uGradientCount;
            uniform float uColor1Weight;
            uniform float uColor2Weight;

            varying vec2 vUv;

            #define PI 3.14159265359

            float grain(vec2 uv, float time) {
              vec2 grainUv = uv * uResolution * 0.5;
              float grainValue = fract(sin(dot(grainUv + time, vec2(12.9898, 78.233))) * 43758.5453);
              return grainValue * 2.0 - 1.0;
            }

            vec3 getGradientColor(vec2 uv, float time) {
              float gradientRadius = uGradientSize;

              vec2 center1  = vec2(0.5 + sin(time * uSpeed * 0.4) * 0.4,  0.5 + cos(time * uSpeed * 0.5) * 0.4);
              vec2 center2  = vec2(0.5 + cos(time * uSpeed * 0.6) * 0.5,  0.5 + sin(time * uSpeed * 0.45) * 0.5);
              vec2 center3  = vec2(0.5 + sin(time * uSpeed * 0.35) * 0.45, 0.5 + cos(time * uSpeed * 0.55) * 0.45);
              vec2 center4  = vec2(0.5 + cos(time * uSpeed * 0.5) * 0.4,  0.5 + sin(time * uSpeed * 0.4) * 0.4);
              vec2 center5  = vec2(0.5 + sin(time * uSpeed * 0.7) * 0.35, 0.5 + cos(time * uSpeed * 0.6) * 0.35);
              vec2 center6  = vec2(0.5 + cos(time * uSpeed * 0.45) * 0.5, 0.5 + sin(time * uSpeed * 0.65) * 0.5);
              vec2 center7  = vec2(0.5 + sin(time * uSpeed * 0.55) * 0.38, 0.5 + cos(time * uSpeed * 0.48) * 0.42);
              vec2 center8  = vec2(0.5 + cos(time * uSpeed * 0.65) * 0.36, 0.5 + sin(time * uSpeed * 0.52) * 0.44);
              vec2 center9  = vec2(0.5 + sin(time * uSpeed * 0.42) * 0.41, 0.5 + cos(time * uSpeed * 0.58) * 0.39);
              vec2 center10 = vec2(0.5 + cos(time * uSpeed * 0.48) * 0.37, 0.5 + sin(time * uSpeed * 0.62) * 0.43);
              vec2 center11 = vec2(0.5 + sin(time * uSpeed * 0.68) * 0.33, 0.5 + cos(time * uSpeed * 0.44) * 0.46);
              vec2 center12 = vec2(0.5 + cos(time * uSpeed * 0.38) * 0.39, 0.5 + sin(time * uSpeed * 0.56) * 0.41);

              float dist1  = length(uv - center1);
              float dist2  = length(uv - center2);
              float dist3  = length(uv - center3);
              float dist4  = length(uv - center4);
              float dist5  = length(uv - center5);
              float dist6  = length(uv - center6);
              float dist7  = length(uv - center7);
              float dist8  = length(uv - center8);
              float dist9  = length(uv - center9);
              float dist10 = length(uv - center10);
              float dist11 = length(uv - center11);
              float dist12 = length(uv - center12);

              float influence1  = 1.0 - smoothstep(0.0, gradientRadius, dist1);
              float influence2  = 1.0 - smoothstep(0.0, gradientRadius, dist2);
              float influence3  = 1.0 - smoothstep(0.0, gradientRadius, dist3);
              float influence4  = 1.0 - smoothstep(0.0, gradientRadius, dist4);
              float influence5  = 1.0 - smoothstep(0.0, gradientRadius, dist5);
              float influence6  = 1.0 - smoothstep(0.0, gradientRadius, dist6);
              float influence7  = 1.0 - smoothstep(0.0, gradientRadius, dist7);
              float influence8  = 1.0 - smoothstep(0.0, gradientRadius, dist8);
              float influence9  = 1.0 - smoothstep(0.0, gradientRadius, dist9);
              float influence10 = 1.0 - smoothstep(0.0, gradientRadius, dist10);
              float influence11 = 1.0 - smoothstep(0.0, gradientRadius, dist11);
              float influence12 = 1.0 - smoothstep(0.0, gradientRadius, dist12);

              vec2 rotatedUv1 = uv - 0.5;
              float angle1 = time * uSpeed * 0.15;
              rotatedUv1 = vec2(
                rotatedUv1.x * cos(angle1) - rotatedUv1.y * sin(angle1),
                rotatedUv1.x * sin(angle1) + rotatedUv1.y * cos(angle1)
              );
              rotatedUv1 += 0.5;

              vec2 rotatedUv2 = uv - 0.5;
              float angle2 = -time * uSpeed * 0.12;
              rotatedUv2 = vec2(
                rotatedUv2.x * cos(angle2) - rotatedUv2.y * sin(angle2),
                rotatedUv2.x * sin(angle2) + rotatedUv2.y * cos(angle2)
              );
              rotatedUv2 += 0.5;

              float radialGradient1 = length(rotatedUv1 - 0.5);
              float radialGradient2 = length(rotatedUv2 - 0.5);
              float radialInfluence1 = 1.0 - smoothstep(0.0, 0.8, radialGradient1);
              float radialInfluence2 = 1.0 - smoothstep(0.0, 0.8, radialGradient2);

              vec3 color = vec3(0.0);
              color += uColor1 * influence1  * (0.55 + 0.45 * sin(time * uSpeed)) * uColor1Weight;
              color += uColor2 * influence2  * (0.55 + 0.45 * cos(time * uSpeed * 1.2)) * uColor2Weight;
              color += uColor3 * influence3  * (0.55 + 0.45 * sin(time * uSpeed * 0.8)) * uColor1Weight;
              color += uColor4 * influence4  * (0.55 + 0.45 * cos(time * uSpeed * 1.3)) * uColor2Weight;
              color += uColor5 * influence5  * (0.55 + 0.45 * sin(time * uSpeed * 1.1)) * uColor1Weight;
              color += uColor6 * influence6  * (0.55 + 0.45 * cos(time * uSpeed * 0.9)) * uColor2Weight;

              if (uGradientCount > 6.0) {
                color += uColor1 * influence7  * (0.55 + 0.45 * sin(time * uSpeed * 1.4)) * uColor1Weight;
                color += uColor2 * influence8  * (0.55 + 0.45 * cos(time * uSpeed * 1.5)) * uColor2Weight;
                color += uColor3 * influence9  * (0.55 + 0.45 * sin(time * uSpeed * 1.6)) * uColor1Weight;
                color += uColor4 * influence10 * (0.55 + 0.45 * cos(time * uSpeed * 1.7)) * uColor2Weight;
              }
              if (uGradientCount > 10.0) {
                color += uColor5 * influence11 * (0.55 + 0.45 * sin(time * uSpeed * 1.8)) * uColor1Weight;
                color += uColor6 * influence12 * (0.55 + 0.45 * cos(time * uSpeed * 1.9)) * uColor2Weight;
              }

              color += mix(uColor1, uColor3, radialInfluence1) * 0.45 * uColor1Weight;
              color += mix(uColor2, uColor4, radialInfluence2) * 0.4  * uColor2Weight;

              color = clamp(color, vec3(0.0), vec3(1.0)) * uIntensity;

              float luminance = dot(color, vec3(0.299, 0.587, 0.114));
              color = mix(vec3(luminance), color, 1.35);
              color = pow(color, vec3(0.92));

              float brightness1 = length(color);
              float mixFactor1 = max(brightness1 * 1.2, 0.15);
              color = mix(uDarkNavy, color, mixFactor1);

              float maxBrightness = 1.0;
              float brightness = length(color);
              if (brightness > maxBrightness) {
                color = color * (maxBrightness / brightness);
              }

              return color;
            }

            void main() {
              vec2 uv = vUv;

              vec4 touchTex = texture2D(uTouchTexture, uv);
              float vx = -(touchTex.r * 2.0 - 1.0);
              float vy = -(touchTex.g * 2.0 - 1.0);
              float intensity = touchTex.b;
              uv.x += vx * 0.8 * intensity;
              uv.y += vy * 0.8 * intensity;

              vec2 center = vec2(0.5);
              float dist = length(uv - center);
              float ripple = sin(dist * 20.0 - uTime * 3.0) * 0.04 * intensity;
              float wave   = sin(dist * 15.0 - uTime * 2.0) * 0.03 * intensity;
              uv += vec2(ripple + wave);

              vec3 color = getGradientColor(uv, uTime);

              float grainValue = grain(uv, uTime);
              color += grainValue * uGrainIntensity;

              float timeShift = uTime * 0.5;
              color.r += sin(timeShift) * 0.02;
              color.g += cos(timeShift * 1.4) * 0.02;
              color.b += sin(timeShift * 1.2) * 0.02;

              float brightness2 = length(color);
              float mixFactor2 = max(brightness2 * 1.2, 0.15);
              color = mix(uDarkNavy, color, mixFactor2);

              color = clamp(color, vec3(0.0), vec3(1.0));

              float maxBrightness = 1.0;
              float brightness = length(color);
              if (brightness > maxBrightness) {
                color = color * (maxBrightness / brightness);
              }

              gl_FragColor = vec4(color, 1.0);
            }
          `
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.z = 0;
        this.sceneManager.scene.add(this.mesh);
      }
      update(delta) {
        if (this.uniforms.uTime) {
          this.uniforms.uTime.value += delta;
        }
      }
      onResize(width, height) {
        const viewSize = this.sceneManager.getViewSize();
        if (this.mesh) {
          this.mesh.geometry.dispose();
          this.mesh.geometry = new THREE.PlaneGeometry(viewSize.width, viewSize.height, 1, 1);
        }
        if (this.uniforms.uResolution) {
          this.uniforms.uResolution.value.set(width, height);
        }
      }
    }
    // =====================
    // App class
    // =====================
    class App {
      constructor() {
        this.renderer = new THREE.WebGLRenderer({
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
          stencil: false,
          depth: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setAnimationLoop(null);
        document.body.appendChild(this.renderer.domElement);
        this.renderer.domElement.id = "webGLApp";
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.camera.position.z = 50;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e27);
        this.clock = new THREE.Clock();
        this.touchTexture = new TouchTexture();
        this.gradientBackground = new GradientBackground(this);
        this.gradientBackground.uniforms.uTouchTexture.value = this.touchTexture.texture;
        this.colorSchemes = {
          1: {
            color1: new THREE.Vector3(0.945, 0.353, 0.133),
            color2: new THREE.Vector3(0.039, 0.055, 0.153)
          },
          2: {
            color1: new THREE.Vector3(1.0, 0.424, 0.314),
            color2: new THREE.Vector3(0.251, 0.878, 0.816)
          },
          3: {
            color1: new THREE.Vector3(0.945, 0.353, 0.133),
            color2: new THREE.Vector3(0.039, 0.055, 0.153),
            color3: new THREE.Vector3(0.251, 0.878, 0.816)
          },
          4: {
            color1: new THREE.Vector3(0.949, 0.4, 0.2),
            color2: new THREE.Vector3(0.176, 0.42, 0.427),
            color3: new THREE.Vector3(0.82, 0.686, 0.612)
          },
          5: {
            color1: new THREE.Vector3(0.945, 0.353, 0.133),
            color2: new THREE.Vector3(0.0, 0.259, 0.22),
            color3: new THREE.Vector3(0.945, 0.353, 0.133),
            color4: new THREE.Vector3(0.0, 0.0, 0.0),
            color5: new THREE.Vector3(0.945, 0.353, 0.133),
            color6: new THREE.Vector3(0.0, 0.0, 0.0)
          }
        };
        this.currentScheme = 1;
        this.init();
      }
      setColorScheme(scheme) {
        if (!this.colorSchemes[scheme]) return;
        this.currentScheme = scheme;
        const colors = this.colorSchemes[scheme];
        const uniforms = this.gradientBackground.uniforms;
        if (scheme === 3) {
          uniforms.uColor1.value.copy(colors.color1);
          uniforms.uColor2.value.copy(colors.color2);
          uniforms.uColor3.value.copy(colors.color3);
          uniforms.uColor4.value.copy(colors.color1);
          uniforms.uColor5.value.copy(colors.color2);
          uniforms.uColor6.value.copy(colors.color3);
        } else if (scheme === 4) {
          uniforms.uColor1.value.copy(colors.color1);
          uniforms.uColor2.value.copy(colors.color2);
          uniforms.uColor3.value.copy(colors.color3);
          uniforms.uColor4.value.copy(colors.color1);
          uniforms.uColor5.value.copy(colors.color2);
          uniforms.uColor6.value.copy(colors.color3);
        } else if (scheme === 5) {
          uniforms.uColor1.value.copy(colors.color1);
          uniforms.uColor2.value.copy(colors.color2);
          uniforms.uColor3.value.copy(colors.color3);
          uniforms.uColor4.value.copy(colors.color4);
          uniforms.uColor5.value.copy(colors.color5);
          uniforms.uColor6.value.copy(colors.color6);
        } else {
          uniforms.uColor1.value.copy(colors.color1);
          uniforms.uColor2.value.copy(colors.color2);
          uniforms.uColor3.value.copy(colors.color1);
          uniforms.uColor4.value.copy(colors.color2);
          uniforms.uColor5.value.copy(colors.color1);
          uniforms.uColor6.value.copy(colors.color2);
        }
        if (scheme === 1) {
          this.scene.background = new THREE.Color(0x0a0e27);
          uniforms.uDarkNavy.value.set(0.039, 0.055, 0.153);
          uniforms.uGradientSize.value = 0.45;
          uniforms.uGradientCount.value = 12.0;
          uniforms.uSpeed.value = 1.5;
          uniforms.uColor1Weight.value = 0.5;
          uniforms.uColor2Weight.value = 1.8;
        } else if (scheme === 4) {
          this.scene.background = new THREE.Color(0xffffff);
          uniforms.uDarkNavy.value.set(0, 0, 0);
        } else if (scheme === 2) {
          this.scene.background = new THREE.Color(0x0a0e27);
          uniforms.uDarkNavy.value.set(0.039, 0.055, 0.153);
          uniforms.uGradientSize.value = 1.0;
          uniforms.uGradientCount.value = 6.0;
          uniforms.uSpeed.value = 1.2;
          uniforms.uColor1Weight.value = 1.0;
          uniforms.uColor2Weight.value = 1.0;
        } else {
          this.scene.background = new THREE.Color(0x0a0e27);
          uniforms.uDarkNavy.value.set(0.039, 0.055, 0.153);
          uniforms.uGradientSize.value = 0.45;
          uniforms.uGradientCount.value = 12.0;
          uniforms.uSpeed.value = 1.5;
          uniforms.uColor1Weight.value = 0.5;
          uniforms.uColor2Weight.value = 1.8;
        }
      }
      init() {
        this.gradientBackground.init();
        this.setColorScheme(1);
        this.render();
        this.tick();
        window.addEventListener("resize", () => this.onResize());
        window.addEventListener("mousemove", (ev) => this.onMouseMove(ev));
        window.addEventListener("touchmove", (ev) => this.onTouchMove(ev));
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) this.render();
        });
        const wakeUp = () => {
          this.render();
        };
        window.addEventListener("click", wakeUp, {
          once: true
        });
        window.addEventListener("touchstart", wakeUp, {
          once: true
        });
        window.addEventListener("mousemove", wakeUp, {
          once: true
        });
      }
      onTouchMove(ev) {
        const touch = ev.touches[0];
        this.onMouseMove({
          clientX: touch.clientX,
          clientY: touch.clientY
        });
      }
      onMouseMove(ev) {
        this.mouse = {
          x: ev.clientX / window.innerWidth,
          y: 1 - ev.clientY / window.innerHeight
        };
        this.touchTexture.addTouch(this.mouse);
      }
      getViewSize() {
        const fovInRadians = (this.camera.fov * Math.PI) / 180;
        const height = Math.abs(this.camera.position.z * Math.tan(fovInRadians / 2) * 2);
        return {
          width: height * this.camera.aspect,
          height
        };
      }
      update(delta) {
        this.touchTexture.update();
        this.gradientBackground.update(delta);
      }
      render() {
        const delta = this.clock.getDelta();
        const clampedDelta = Math.min(delta, 0.1);
        this.renderer.render(this.scene, this.camera);
        this.update(clampedDelta);
      }
      tick() {
        this.render();
        requestAnimationFrame(() => this.tick());
      }
      onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.gradientBackground.onResize(window.innerWidth, window.innerHeight);
      }
    }
    // Iniciar app
    const app = window.THREE ? new App() : null;
    if (app) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => app.render());
      } else {
        setTimeout(() => app.render(), 0);
      }
    }
    // =====================
    // Datos de noticias por categoría
    // =====================
    const noticias = {
      1: {
        etiqueta: "Bogotá · Movilidad · Debate público",
        titulo: "Corredor verde en Bogotá",
        bajada: "Una obra que divide opiniones entre sostenibilidad, movilidad urbana y preocupación ambiental.",
        videos: [
          {
            title: "Short político 1",
            thumb: "https://img.youtube.com/vi/VvPxydh5qyA/hqdefault.jpg",
            watch: "https://youtube.com/shorts/VvPxydh5qyA"
          },
          {
            title: "Short político 2",
            thumb: "https://img.youtube.com/vi/OQ9HlOg4JCY/hqdefault.jpg",
            watch: "https://youtube.com/shorts/OQ9HlOg4JCY"
          },
          {
            title: "Short político 3",
            thumb: "https://img.youtube.com/vi/uB_qiWPyIIU/hqdefault.jpg",
            watch: "https://youtube.com/shorts/uB_qiWPyIIU"
          }
        ],
        cards: [{
            label: "Una mirada",
            titulo: "Lo que se defiende",
            texto: "Quienes respaldan el proyecto sostienen que el corredor verde busca reorganizar la movilidad en uno de los ejes más importantes de Bogotá, priorizando el transporte público, el espacio peatonal y una visión más sostenible de ciudad. Desde esta postura, la obra no se presenta únicamente como una intervención vial, sino como una transformación urbana de largo alcance."
          },
          {
            label: "Entre Líneas",
            titulo: "Lo que está en discusión",
            texto: "Más allá de estar a favor o en contra, el debate revela una tensión entre la promesa de una ciudad más ordenada y las dudas sobre su ejecución, impacto ambiental y legitimidad social. La discusión no solo es técnica: también habla de confianza institucional, participación ciudadana y de cómo se comunica el cambio urbano."
          },
          {
            label: "Otra mirada",
            titulo: "Lo que se cuestiona",
            texto: "Las críticas se concentran en el impacto ecológico, especialmente por la intervención sobre árboles y zonas sensibles del corredor. También se cuestiona si la obra responde realmente a las prioridades de movilidad de la ciudad o si su desarrollo ha avanzado con mayor velocidad que la conversación pública necesaria para una intervención de este tamaño."
          }
        ]
      },
      2: {
        etiqueta: "Colombia · Fútbol · Selección",
        titulo: "La Selección Colombia y su momento",
        bajada: "Un equipo que genera expectativa, pero también preguntas sobre su rumbo deportivo.",
        videos: [],
        cards: [{
            label: "Una mirada",
            titulo: "El optimismo",
            texto: "Para sus seguidores, la Selección Colombia vive uno de sus mejores momentos generacionales. Con figuras consolidadas en el exterior y un estilo de juego más propositivo, hay quienes ven en este ciclo la oportunidad de volver a competir de verdad en el escenario internacional y recuperar el protagonismo que tuvo en los noventa."
          },
          {
            label: "Entre Líneas",
            titulo: "Lo que está en juego",
            texto: "Más allá de los resultados, el debate sobre la selección refleja tensiones más profundas: cómo se construye un proyecto deportivo de largo plazo, qué tanto influye la gestión federativa en el rendimiento del equipo, y si los logros individuales de los jugadores se traducen realmente en colectivo cuando se visten de amarillo."
          },
          {
            label: "Otra mirada",
            titulo: "Las dudas que persisten",
            texto: "Los críticos señalan inconsistencias en el juego colectivo y una dependencia excesiva de individualidades. También cuestionan la continuidad de los procesos técnicos y si la euforia mediática alrededor del equipo responde a resultados sólidos o a una narrativa construida sobre expectativas más emocionales que deportivas."
          }
        ]
      },
      3: {
        etiqueta: "Colombia · Economía · Inflación",
        titulo: "El costo de vida en Colombia",
        bajada: "La inflación cede, pero el bolsillo de los colombianos todavía no lo siente.",
        videos: [],
        cards: [{
            label: "Una mirada",
            titulo: "Las cifras mejoran",
            texto: "Desde los organismos oficiales y algunos analistas, se destaca que la inflación ha venido cediendo y que las medidas de política monetaria han funcionado. El Banco de la República ha logrado contener el alza de precios sin llevar la economía a una recesión profunda, lo que se presenta como un resultado técnicamente positivo en un contexto global complejo."
          },
          {
            label: "Entre Líneas",
            titulo: "La brecha entre datos y realidad",
            texto: "El problema central es que los indicadores macroeconómicos y la experiencia cotidiana no siempre coinciden. Aunque la inflación baje en términos porcentuales, los precios ya subidos no retroceden. Eso significa que muchos hogares siguen ajustando su consumo, recortando gastos y sintiendo una presión que los promedios estadísticos no logran capturar del todo."
          },
          {
            label: "Otra mirada",
            titulo: "Quiénes pagan el ajuste",
            texto: "Las voces críticas apuntan a que el ajuste económico no ha sido equitativo. Las tasas de interés altas encarecen el crédito y golpean especialmente a pequeños empresarios y deudores de crédito de consumo. Mientras tanto, sectores con mayor capacidad de ahorro e inversión han absorbido mejor el ciclo inflacionario, ampliando la brecha entre distintos niveles de ingreso."
          }
        ]
      },
      4: {
        etiqueta: "Colombia · Cultura · Identidad",
        titulo: "El vallenato en la era del streaming",
        bajada: "Un género patrimonio de la humanidad que busca su lugar entre algoritmos y nuevas audiencias.",
        videos: [],
        cards: [{
            label: "Una mirada",
            titulo: "La tradición que resiste",
            texto: "Para sus defensores, el vallenato ha demostrado una capacidad de adaptación notable sin perder su esencia. Festivales como el de la Leyenda Vallenata siguen siendo un punto de encuentro cultural, y nuevas generaciones de músicos están encontrando formas de llevar el acordeón y la caja a plataformas digitales sin traicionar sus raíces."
          },
          {
            label: "Entre Líneas",
            titulo: "Tradición y transformación",
            texto: "La tensión entre conservar y evolucionar está en el corazón del debate cultural alrededor del vallenato. La pregunta no es si debe cambiar, sino cómo hacerlo sin que el género pierda lo que lo hace único: su vínculo con el territorio, la oralidad y una forma particular de narrar la vida cotidiana del Caribe colombiano."
          },
          {
            label: "Otra mirada",
            titulo: "Lo que se puede perder",
            texto: "Hay quienes advierten que la lógica del streaming premia la brevedad y la viralidad por encima de la profundidad lírica que caracteriza a los grandes compositores del género. En ese contexto, el vallenato de raíz corre el riesgo de quedar relegado a un nicho folclórico mientras las versiones más comerciales acaparan los algoritmos."
          }
        ]
      },
      5: {
        etiqueta: "Colombia · Educación · Cobertura",
        titulo: "La crisis silenciosa de la educación rural",
        bajada: "Millones de niños en zonas apartadas siguen sin acceso real a una educación de calidad.",
        videos: [],
        cards: [{
            label: "Una mirada",
            titulo: "Los avances en cobertura",
            texto: "El Estado colombiano ha ampliado la cobertura educativa en zonas rurales durante las últimas décadas. Programas como Escuela Nueva han sido reconocidos internacionalmente como modelos de educación en contextos de ruralidad dispersa, y hay esfuerzos genuinos desde el Ministerio de Educación por reducir las brechas históricas entre campo y ciudad."
          },
          {
            label: "Entre Líneas",
            titulo: "Cobertura no es calidad",
            texto: "El gran debate en educación rural no es solo cuántos niños están matriculados, sino qué están aprendiendo y en qué condiciones. Tener acceso a una escuela no garantiza acceso a docentes bien formados, materiales actualizados, conectividad o ambientes adecuados. La cobertura ha mejorado; la calidad sigue siendo la deuda pendiente."
          },
          {
            label: "Otra mirada",
            titulo: "Lo que el sistema no ve",
            texto: "Los críticos señalan que el modelo educativo rural sigue diseñado desde lógicas urbanas que no reconocen las particularidades del territorio. El calendario escolar, los contenidos curriculares y los criterios de evaluación no siempre responden a las realidades de comunidades campesinas, indígenas o afrodescendientes, generando una educación que a veces se siente ajena a quienes más la necesita."
          }
        ]
      }
    };

    function renderNoticia(scheme) {
      const data = noticias[scheme];
      if (!data) return;
      const videosGrid = document.getElementById("videosGrid");
      updateScopeStatus();
      document.getElementById("noticiaEtiqueta").textContent = data.etiqueta;
      document.getElementById("noticiaTitulo").textContent = data.titulo;
      document.getElementById("noticiaBajada").textContent = data.bajada;
      document.getElementById("claveAlcance").textContent = data.etiqueta.split("·")[0].trim();
      document.getElementById("claveFoco").textContent = data.cards[1].titulo;
      document.getElementById("claveContraste").textContent = `${data.cards[0].label} / ${data.cards[2].label}`;
      document.getElementById("label1").textContent = data.cards[0].label;
      document.getElementById("titulo1").textContent = data.cards[0].titulo;
      document.getElementById("texto1").textContent = data.cards[0].texto;
      document.getElementById("label2").textContent = data.cards[1].label;
      document.getElementById("titulo2").textContent = data.cards[1].titulo;
      document.getElementById("texto2").textContent = data.cards[1].texto;
      document.getElementById("label3").textContent = data.cards[2].label;
      document.getElementById("titulo3").textContent = data.cards[2].titulo;
      document.getElementById("texto3").textContent = data.cards[2].texto;
      videosGrid.innerHTML = "";
      videosGrid.classList.toggle("hidden", data.videos.length === 0);
      document.getElementById("videosHeading")?.classList.toggle("hidden", data.videos.length === 0);
      data.videos.forEach((video, index) => {
        const card = document.createElement("a");
        card.className = "video-card";
        card.href = video.watch;
        card.target = "_blank";
        card.rel = "noopener noreferrer";
        card.setAttribute("aria-label", `Abrir ${video.title || `video relacionado ${index + 1}`} en YouTube`);

        const thumb = document.createElement("img");
        thumb.src = video.thumb;
        thumb.alt = "";
        thumb.loading = "lazy";

        const play = document.createElement("span");
        play.className = "video-play";
        play.textContent = "▶";

        const title = document.createElement("span");
        title.className = "video-title";
        title.textContent = video.title || `Video ${index + 1}`;

        card.appendChild(thumb);
        card.appendChild(play);
        card.appendChild(title);
        videosGrid.appendChild(card);
      });
      renderTeasers(scheme);
      renderComentarios(scheme);
    }

    function renderTeasers(scheme) {
      const data = noticias[scheme];
      if (!data) return;
      
      const teasersContainer = document.querySelector(".category-teasers");
      if (!teasersContainer) return;
      
      const teaserCards = teasersContainer.querySelectorAll(".teaser-card");
      
      teaserCards.forEach((card, index) => {
        const isVideo = index % 3 === 1;
        
        if (isVideo) {
          const videoIndex = index === 1 ? 0 : 1;
          if (data.videos[videoIndex]) {
            const video = data.videos[videoIndex];
            card.classList.remove("teaser-text");
            card.classList.add("teaser-video");
            card.innerHTML = `
              <span>Video</span>
              <h3>${video.title}</h3>
              <p>Material audiovisual relacionado con el tema</p>
            `;
          }
        } else {
          let cardIndex;
          if (index === 0) cardIndex = 0;
          else if (index === 2) cardIndex = 1;
          else if (index === 3) cardIndex = 2;
          else cardIndex = 0;
          
          const cardData = data.cards[cardIndex];
          card.classList.remove("teaser-video");
          card.classList.add("teaser-text");
          card.innerHTML = `
            <span>${cardData.label}</span>
            <h3>${cardData.titulo}</h3>
            <p>${cardData.texto.substring(0, 120)}...</p>
          `;
        }
      });
    }

    function getScope() {
      try {
        return JSON.parse(localStorage.getItem("entre-lineas-scope")) || {
          label: "General",
          value: "general"
        };
      } catch {
        return {
          label: "General",
          value: "general"
        };
      }
    }

    function saveScope(label, value) {
      localStorage.setItem("entre-lineas-scope", JSON.stringify({
        label,
        value
      }));
      updateScopeStatus();
      updateScopeChip();
    }

    function updateScopeStatus() {
      if (!noticiaSection) return;
      let status = document.getElementById("scopeStatus");
      if (!status) {
        status = document.createElement("p");
        status.className = "scope-status";
        status.id = "scopeStatus";
      }
      const header = noticiaSection.querySelector(".noticia-header");
      if (header && status.parentElement !== header) header.prepend(status);
      const scope = getScope();
      status.textContent = `Viendo: ${scope.label}`;
    }

    function updateScopeChip() {
      const nav = document.querySelector(".color-controls");
      if (!nav) return;
      let chip = document.getElementById("scopeChip");
      if (!chip) {
        chip = document.createElement("button");
        chip.className = "scope-chip";
        chip.id = "scopeChip";
        chip.type = "button";
        chip.addEventListener("click", () => {
          toggleAdjusterBtn?.click();
        });
        nav.insertBefore(chip, document.getElementById("personalizarWrapper"));
      }
      chip.textContent = getScope().label;
    }

    function restoreScopeSelection() {
      const scope = getScope();
      document.querySelectorAll(".submenu-item, [data-level]").forEach((item) => {
        const itemValue = item.dataset.value || item.dataset.level;
        item.classList.toggle("selected", itemValue === scope.value);
        item.classList.toggle("active", itemValue === scope.value);
      });
    }

    function getComentarios(scheme) {
      const raw = localStorage.getItem(`comentarios-${scheme}`);
      try {
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    function renderComentarios(scheme) {
      const comentariosList = document.getElementById("comentariosList");
      comentariosList.innerHTML = "";
      const comentarios = getComentarios(scheme);
      if (comentarios.length === 0) {
        const empty = document.createElement("p");
        empty.className = "comentario-empty";
        empty.textContent = "Aun no hay comentarios en esta seccion.";
        comentariosList.appendChild(empty);
        return;
      }
      comentarios.forEach((comentario) => {
        const normalized = typeof comentario === "string" ? {
          name: "Anónimo",
          text: comentario,
          date: null
        } : comentario;
        const item = document.createElement("article");
        item.className = "comentario-item";
        const date = normalized.date ? new Date(normalized.date).toLocaleString("es-CO", {
          dateStyle: "medium",
          timeStyle: "short"
        }) : "Sin fecha";
        const meta = document.createElement("div");
        meta.className = "comentario-meta";
        const author = document.createElement("strong");
        author.textContent = normalized.name || "Anónimo";
        const time = document.createElement("span");
        time.textContent = date;
        const text = document.createElement("p");
        text.textContent = normalized.text;
        meta.append(author, time);
        item.append(meta, text);
        comentariosList.appendChild(item);
      });
    }

    let currentSection = null;
    const pageSchemes = {
      politica: 1,
      deportes: 2,
      economia: 3,
      cultura: 4,
      educacion: 5
    };
    const pageHrefs = {
      politica: "./politica.html",
      deportes: "./deportes.html",
      economia: "./economia.html",
      cultura: "./cultura.html",
      educacion: "./educacion.html"
    };
    const schemePages = Object.fromEntries(
      Object.entries(pageSchemes).map(([page, scheme]) => [scheme, page])
    );

    // Navegacion y pagina actual
    const colorButtons = document.querySelectorAll(".color-btn");
    const noticiaSection = document.getElementById("noticiaSection");
    const comentarioForm = document.getElementById("comentarioForm");
    const comentarioTexto = document.getElementById("comentarioTexto");
    const comentarioNombre = document.getElementById("comentarioNombre");
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("searchInput");
    const navBar = document.querySelector(".color-controls");
    const navMenuToggle = document.getElementById("navMenuToggle");
    const currentPage = document.body.dataset.page || "inicio";
    const pageScheme = pageSchemes[currentPage] || null;

    function normalizeText(text) {
      return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    }

    function getSearchResults(query) {
      const normalizedQuery = normalizeText(query);
      return Object.entries(noticias)
        .map(([scheme, data]) => {
          const searchable = [
            data.etiqueta,
            data.titulo,
            data.bajada,
            ...data.cards.flatMap((card) => [card.label, card.titulo, card.texto])
          ].join(" ");
          return {
            scheme: Number(scheme),
            data,
            matches: normalizeText(searchable).includes(normalizedQuery)
          };
        })
        .filter((result) => result.matches);
    }

    function ensureSearchPanel() {
      let panel = document.getElementById("searchPanel");
      if (panel) return panel;
      panel = document.createElement("section");
      panel.className = "search-panel hidden";
      panel.id = "searchPanel";
      panel.setAttribute("aria-live", "polite");
      panel.innerHTML = `
        <div class="search-panel-head">
          <h2>Resultados</h2>
          <button class="search-panel-close" type="button" aria-label="Cerrar resultados">&times;</button>
        </div>
        <div class="search-results" id="searchResults"></div>
      `;
      document.body.appendChild(panel);
      panel.querySelector(".search-panel-close").addEventListener("click", () => {
        panel.classList.add("hidden");
      });
      return panel;
    }

    function renderSearchResults(query) {
      const panel = ensureSearchPanel();
      const resultsBox = document.getElementById("searchResults");
      const results = getSearchResults(query);
      resultsBox.innerHTML = "";
      if (!results.length) {
        resultsBox.innerHTML = `<p class="search-empty">No encontramos resultados para "${query}".</p>`;
      } else {
        results.forEach(({ scheme, data }) => {
          const page = schemePages[scheme];
          const link = document.createElement("a");
          link.className = "search-result";
          link.href = pageHrefs[page];
          link.innerHTML = `
            <span>${data.etiqueta}</span>
            <strong>${data.titulo}</strong>
            <small>${data.bajada}</small>
          `;
          resultsBox.appendChild(link);
        });
      }
      panel.classList.remove("hidden");
    }

    colorButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.route === currentPage);
      btn.toggleAttribute("aria-current", btn.dataset.route === currentPage);
    });

    if (navBar && navMenuToggle) {
      navMenuToggle.addEventListener("click", () => {
        const isOpen = navBar.classList.toggle("menu-open");
        navMenuToggle.setAttribute("aria-expanded", String(isOpen));
      });
    }

    if (searchForm && searchInput) {
      searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;
        renderSearchResults(query);
      });
      searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim();
        if (query.length < 2) {
          document.getElementById("searchPanel")?.classList.add("hidden");
          return;
        }
        renderSearchResults(query);
      });
      searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          searchInput.value = "";
          document.getElementById("searchPanel")?.classList.add("hidden");
        }
      });
    }

    if (pageScheme && noticiaSection) {
      currentSection = pageScheme;
      if (app) app.setColorScheme(pageScheme);
      if (currentPage !== "politica" && currentPage !== "deportes") {
        renderNoticia(pageScheme);
      }
      noticiaSection.classList.remove("hidden");
    } else if (app) {
      app.setColorScheme(1);
    }

    // Fix nav labels
    document.querySelectorAll(".color-btn").forEach((btn) => {
      if (btn.dataset.route === "politica") btn.textContent = "Redes";
      if (btn.dataset.route === "deportes") btn.textContent = "Política";
    });
    restoreScopeSelection();
    updateScopeChip();

    if (comentarioForm && comentarioTexto) {
      comentarioForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!currentSection) return;
        const text = comentarioTexto.value.trim();
        if (!text) return;
        const name = comentarioNombre?.value.trim() || "Anónimo";
        const comentarios = getComentarios(currentSection);
        comentarios.unshift({
          name,
          text,
          date: new Date().toISOString()
        });
        localStorage.setItem(`comentarios-${currentSection}`, JSON.stringify(comentarios));
        comentarioTexto.value = "";
        if (comentarioNombre) comentarioNombre.value = "";
        renderComentarios(currentSection);
      });
    }
    // Panel personalizar — toggle con ocultamiento correcto del botón
    const colorAdjusterPanel = document.getElementById("colorAdjusterPanel");
    const toggleAdjusterBtn = document.getElementById("toggleAdjusterBtn");
    const closeAdjusterBtn = document.getElementById("closeAdjusterBtn");
    toggleAdjusterBtn.addEventListener("click", () => {
      colorAdjusterPanel.classList.add("open");
      toggleAdjusterBtn.classList.add("hidden");
    });
    closeAdjusterBtn.addEventListener("click", () => {
      colorAdjusterPanel.classList.remove("open");
      toggleAdjusterBtn.classList.remove("hidden");
    });
    // Submenús de cercanía
    const toggleKeys = ["ciudad", "region", "pais", "continente"];
    toggleKeys.forEach((key) => {
      const option = document.querySelector(`[data-toggle="${key}"]`);
      const submenu = document.getElementById(`sub-${key}`);
      const arrow = document.getElementById(`arrow-${key}`);
      option.addEventListener("click", () => {
        const isOpen = submenu.classList.contains("open");
        // Cierra todos
        document.querySelectorAll(".location-option").forEach((o) => o.classList.remove("active"));
        toggleKeys.forEach((k) => {
          document.getElementById(`sub-${k}`).classList.remove("open");
          document.getElementById(`arrow-${k}`).classList.remove("open");
          document.querySelector(`[data-toggle="${k}"]`).classList.remove("active");
        });
        // Abre el clickeado si estaba cerrado
        if (!isOpen) {
          submenu.classList.add("open");
          arrow.classList.add("open");
          option.classList.add("active");
        }
      });
    });
    // Selección de item de submenu
    document.querySelectorAll(".submenu-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        // Deselecciona todos en el mismo submenu
        const parent = item.closest(".location-submenu");
        parent.querySelectorAll(".submenu-item").forEach((i) => i.classList.remove("selected"));
        item.classList.add("selected");
        saveScope(item.textContent.trim(), item.dataset.value);
      });
    });
    // Opciones sin submenu
    document.querySelectorAll("[data-level]").forEach((opt) => {
      opt.addEventListener("click", () => {
        // Cierra submenús abiertos
        toggleKeys.forEach((k) => {
          document.getElementById(`sub-${k}`).classList.remove("open");
          document.getElementById(`arrow-${k}`).classList.remove("open");
          document.querySelector(`[data-toggle="${k}"]`).classList.remove("active");
        });
        // Marca como activo
        document.querySelectorAll(".location-option").forEach((o) => o.classList.remove("active"));
        opt.classList.add("active");
        saveScope(opt.textContent.trim(), opt.dataset.level);
      });
    });
    // Custom cursor
    const cursor = document.getElementById("customCursor");
    let mouseX = 0,
      mouseY = 0;
    let isCursorAnimating = false;
    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isCursorAnimating) {
        isCursorAnimating = true;
        animateCursor();
      }
    });

    function animateCursor() {
      cursor.style.left = mouseX + "px";
      cursor.style.top = mouseY + "px";
      requestAnimationFrame(animateCursor);
    }
    // Cursor grande en elementos interactivos
    const interactiveEls = [
      ...document.querySelectorAll(".color-btn"),
      document.querySelector(".footer a"),
      toggleAdjusterBtn
    ];
    interactiveEls.forEach((el) => {
      if (!el) return;
      el.addEventListener("mouseenter", () => {
        cursor.style.width = "50px";
        cursor.style.height = "50px";
        cursor.style.borderWidth = "3px";
      });
      el.addEventListener("mouseleave", () => {
        cursor.style.width = "40px";
        cursor.style.height = "40px";
        cursor.style.borderWidth = "2px";
      });
    });
    // Pulse sutil al mover el mouse
    let lastMouseMoveTime = 0;
    let pulseFrame = null;

    function checkPulse() {
      if (Date.now() - lastMouseMoveTime > 100) {
        cursor.style.borderWidth = "2px";
        pulseFrame = null;
      } else {
        pulseFrame = requestAnimationFrame(checkPulse);
      }
    }
    document.addEventListener("mousemove", () => {
      lastMouseMoveTime = Date.now();
      cursor.style.borderWidth = "2.5px";
      if (!pulseFrame) pulseFrame = requestAnimationFrame(checkPulse);
    });
