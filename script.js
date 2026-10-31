/**
 * ============================================================================
 * ENERGY DRINK — Awwwards-Winning Interactive Experience & 3D WebGL Engine
 * ============================================================================
 * Fixes & Enhancements:
 * 1. FRONT HEADING ALWAYS FACES CAMERA AT REST (No more showing the back!)
 *    - Uses exact CAN_FRONT_Y orientation (Math.PI / 180° front facing)
 * 2. NO AUTO-SPIN IN PLACE (Bottle stays STILL and stable on its own)
 * 3. 360° SPIN ONLY DURING SCROLL (Spins on the way, stops with FRONT at every checkpoint)
 *    - Point 1 (Hero): Drops in, lands showing FRONT heading
 *    - Point 2 (Formula): Spins 360° on the way, lands showing FRONT heading
 *    - Point 3 (Compare): Spins 360° on the way, lands showing FRONT heading
 *    - Point 4 (CTA Banner): Spins 360° on the way, lands showing FRONT heading
 * 4. 35% Smaller 3D Size (sleek, precise proportions)
 * 5. Interactive 360° Drag (user can freely inspect any angle)
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // 1. Text & Button Entrance Animations (GSAP)
  // =========================================================================
  if (typeof gsap !== 'undefined') {
    const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });

    heroTl
      .from(".header", {
        y: -40,
        opacity: 0,
        duration: 0.9
      })
      .from(".hero-title .title-text", {
        y: 60,
        opacity: 0,
        scale: 0.95,
        duration: 1.1
      }, "-=0.6")
      .from(".hero-tagline", {
        y: 35,
        opacity: 0,
        duration: 0.9
      }, "-=0.7")
      .from(".order-btn", {
        scale: 0.85,
        opacity: 0,
        duration: 0.8,
        ease: "back.out(1.7)"
      }, "-=0.6")
      .from(".animated-specs", {
        y: 40,
        opacity: 0,
        duration: 0.9
      }, "-=0.7");
  }

  // =========================================================================
  // 2. 3D WebGL Engine (Three.js + GLTF + GSAP)
  // =========================================================================
  const container3d = document.getElementById('canvas3d-container') || document.getElementById('canvas3d-stage');
  const loaderPill = document.getElementById('modelLoader');

  // Exact front-facing orientation angle for Blender exported GLB (180° / Math.PI)
  let CAN_FRONT_Y = Math.PI;

  if (container3d && typeof THREE !== 'undefined') {
    init3DExperience(container3d);
  }

  function init3DExperience(container) {
    const isFlavorsPage = document.body.classList.contains('flavors-page');

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 7.8);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x59ff00, 3.4);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x00f0aa, 1.8);
    fillLight.position.set(4, -4, -2);
    scene.add(fillLight);

    const topLight = new THREE.SpotLight(0xffffff, 2.0);
    topLight.position.set(0, 10, 2);
    topLight.angle = Math.PI / 4;
    scene.add(topLight);

    window.canLights = { rimLight, fillLight };

    // Floating 3D Carbonation Particles
    const particleCount = 42;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleSpeed = [];

    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 5;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 4;
      particleSpeed.push(0.01 + Math.random() * 0.02);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x59ff00,
      size: 0.06,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // Can Grouping
    const masterGroup = new THREE.Group();
    const canGroup = new THREE.Group();
    masterGroup.add(canGroup);
    scene.add(masterGroup);

    // Initial Desktop Resting Position (Harmoniously in front/beside heading)
    const getHeroRestingX = () => (isFlavorsPage ? 0 : (window.innerWidth > 1080 ? 1.15 : 0));
    const getHeroRestingY = () => (isFlavorsPage ? -0.1 : (window.innerWidth > 1080 ? 0.05 : -0.2));

    masterGroup.position.set(getHeroRestingX(), getHeroRestingY(), 0);

    // Resize Handler
    window.addEventListener('resize', () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);

      if (!isFlavorsPage && window.scrollY < 200) {
        masterGroup.position.x = getHeroRestingX();
        masterGroup.position.y = getHeroRestingY();
      }
    });

    // Manual Drag Orbit Physics
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let dragVelocityX = 0;
    let dragVelocityY = 0;

    const domCanvas = renderer.domElement;

    domCanvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        dragVelocityX = deltaX * 0.008;
        dragVelocityY = deltaY * 0.008;
        canGroup.rotation.y += dragVelocityX;
        canGroup.rotation.x += dragVelocityY;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    });

    // Touch Support
    domCanvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => { isDragging = false; });

    window.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - prevMouseX;
        const deltaY = e.touches[0].clientY - prevMouseY;
        dragVelocityX = deltaX * 0.008;
        dragVelocityY = deltaY * 0.008;
        canGroup.rotation.y += dragVelocityX;
        canGroup.rotation.x += dragVelocityY;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    // Subtle Cursor Tilt Parallax
    let mouseTiltX = 0;
    let mouseTiltY = 0;

    window.addEventListener('mousemove', (e) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseTiltX = normX * 0.14;
      mouseTiltY = normY * 0.08;
    });

    // Model Loader
    const gltfLoader = new THREE.GLTFLoader();

    function loadCanGLB(onSuccess) {
      gltfLoader.load(
        'energy_drink.glb',
        onSuccess,
        undefined,
        (fileErr) => {
          console.warn('Direct file load intercepted by CORS, using base64 fallback...', fileErr);
          if (window.ENERGY_DRINK_MODEL_BASE64) {
            gltfLoader.load(window.ENERGY_DRINK_MODEL_BASE64, onSuccess, undefined, (b64Err) => {
              console.error('Failed to load 3D model:', b64Err);
              if (loaderPill) loaderPill.classList.add('hidden');
            });
          }
        }
      );
    }

    loadCanGLB((gltf) => {
      const model = gltf.scene;

      // Center model
      const bbox = new THREE.Box3().setFromObject(model);
      const center = bbox.getCenter(new THREE.Vector3());
      const size = bbox.getSize(new THREE.Vector3());

      model.position.x += (model.position.x - center.x);
      model.position.y += (model.position.y - center.y);
      model.position.z += (model.position.z - center.z);

      // 35% Smaller 3D Size
      const maxDimension = Math.max(size.x, size.y, size.z);
      const targetScale = isFlavorsPage ? (2.6 / maxDimension) : (3.0 / maxDimension);
      model.scale.set(targetScale, targetScale, targetScale);

      // Materials
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.metalness = 0.52;
            child.material.roughness = 0.28;
            child.material.needsUpdate = true;
          }
        }
      });

      canGroup.add(model);
      window.energyCanMesh = canGroup;

      if (loaderPill) loaderPill.classList.add('hidden');

      // =====================================================================
      // 🎯 CHECKPOINT 1 (HERO INTRO DROP & LANDING SHOWING FRONT HEADING):
      // - Drops from top to resting point in front of main heading
      // - Ends directly at CAN_FRONT_Y (so FRONT FACE IS 100% VISIBLE, NEVER BACK!)
      // - Performs minimal 1 swing
      // =====================================================================
      if (!isFlavorsPage) {
        canGroup.position.y = 11; // Starts high above
        canGroup.rotation.y = CAN_FRONT_Y + Math.PI; // Spins 180° during fall into front
        canGroup.rotation.z = -0.28;
        canGroup.rotation.x = -0.15;

        const introTl = gsap.timeline({ delay: 0.1 });

        // 1. Drop down into the hero position in front of the heading
        introTl.to(canGroup.position, {
          y: 0,
          duration: 1.25,
          ease: "power3.out"
        }, 0);

        // Ends at CAN_FRONT_Y (FRONT HEADING FACES USER!)
        introTl.to(canGroup.rotation, {
          y: CAN_FRONT_Y,
          duration: 1.25,
          ease: "power2.out"
        }, 0);

        // 2. Minimal 1 Swing upon landing
        introTl.to(canGroup.rotation, {
          z: 0.12,
          x: -0.09,
          duration: 0.38,
          ease: "power2.out"
        }, "-=0.15");

        introTl.to(canGroup.rotation, {
          z: -0.04,
          x: 0.03,
          duration: 0.42,
          ease: "sine.inOut"
        });

        introTl.to(canGroup.rotation, {
          z: 0,
          x: 0,
          duration: 0.38,
          ease: "sine.out"
        });

      } else {
        canGroup.position.y = 7;
        canGroup.rotation.y = CAN_FRONT_Y + Math.PI;
        gsap.to(canGroup.position, { y: 0, duration: 1.1, ease: "power3.out" });
        gsap.to(canGroup.rotation, { y: CAN_FRONT_Y, duration: 1.1, ease: "power2.out" });
      }

      // =====================================================================
      // 🔄 CHECKPOINTS 2, 3, 4: ROTATE ONLY DURING TRANSIT & STOP WITH FRONT HEADING
      // - Rotates exact full 360° multiples (Math.PI * 2) so it ALWAYS stops
      //   with FRONT HEADING facing the camera at every single checkpoint!
      // =====================================================================
      if (!isFlavorsPage && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        // Checkpoint 1 (Hero) -> Checkpoint 2 (Formula Section):
        // Spins full 360° on the way & lands beside Formula heading showing FRONT
        ScrollTrigger.create({
          trigger: "#formula",
          start: "top 95%",
          end: "top 25%",
          scrub: 1.2,
          onUpdate: (self) => {
            const p = self.progress;
            // Full 360° spin (2 * Math.PI) on the way -> lands showing FRONT!
            canGroup.rotation.y = CAN_FRONT_Y + p * (Math.PI * 2);
            masterGroup.position.x = gsap.utils.interpolate(1.15, -1.95, p);
            masterGroup.position.y = gsap.utils.interpolate(0.05, -0.15, p);
            canGroup.rotation.z = gsap.utils.interpolate(0, -0.16, p);
          }
        });

        // Checkpoint 2 (Formula) -> Checkpoint 3 (Compare Section):
        // Spins full 360° on the way & lands beside Compare heading showing FRONT
        ScrollTrigger.create({
          trigger: "#compare",
          start: "top 95%",
          end: "top 30%",
          scrub: 1.2,
          onUpdate: (self) => {
            const p = self.progress;
            // Another full 360° spin -> lands showing FRONT!
            canGroup.rotation.y = (CAN_FRONT_Y + Math.PI * 2) + p * (Math.PI * 2);
            masterGroup.position.x = gsap.utils.interpolate(-1.95, 1.85, p);
            masterGroup.position.y = gsap.utils.interpolate(-0.15, 0.0, p);
            canGroup.rotation.z = gsap.utils.interpolate(-0.16, 0.12, p);
          }
        });

        // Checkpoint 3 (Compare) -> Checkpoint 4 (CTA Banner):
        // Spins full 360° on the way & centers right above CTA banner showing FRONT
        ScrollTrigger.create({
          trigger: ".cta-banner-section",
          start: "top 90%",
          end: "top 30%",
          scrub: 1.2,
          onUpdate: (self) => {
            const p = self.progress;
            // Another full 360° spin -> lands showing FRONT!
            canGroup.rotation.y = (CAN_FRONT_Y + Math.PI * 4) + p * (Math.PI * 2);
            masterGroup.position.x = gsap.utils.interpolate(1.85, 0.0, p);
            masterGroup.position.y = gsap.utils.interpolate(0.0, 0.45, p);
            canGroup.rotation.z = gsap.utils.interpolate(0.12, 0.0, p);
          }
        });
      }
    });

    // Render Loop
    let clock = new THREE.Clock();

    function animate3D() {
      requestAnimationFrame(animate3D);
      const elapsed = clock.getElapsedTime();

      // Ambient Idle Floating (Once settled)
      if (canGroup.position.y < 0.5) {
        canGroup.position.y = Math.sin(elapsed * 1.6) * 0.06;

        // Manual drag damping ONLY — ABSOLUTELY NO AUTO-SPIN IN PLACE!
        if (!isDragging) {
          dragVelocityX *= 0.90;
          dragVelocityY *= 0.90;
          canGroup.rotation.y += dragVelocityX; // ONLY drag inertia, NEVER auto-spins on its own!
          canGroup.rotation.x += dragVelocityY;

          // Gentle mouse tilt parallax
          canGroup.rotation.x += (mouseTiltY - canGroup.rotation.x * 0.1) * 0.03;
          canGroup.rotation.z += (-mouseTiltX - canGroup.rotation.z * 0.1) * 0.03;
        }
      }

      // Carbonation particle drift
      const positions = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += particleSpeed[i];
        if (positions[i * 3 + 1] > 4) {
          positions[i * 3 + 1] = -4;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }

    animate3D();
  }

  // Quick 360 Spin trigger on "order now" button
  const orderNowBtn = document.getElementById('orderNowBtn');
  if (orderNowBtn) {
    orderNowBtn.addEventListener('mouseenter', () => {
      if (window.energyCanMesh) {
        gsap.to(window.energyCanMesh.rotation, {
          y: "+=6.28", // Full 360 spin returning to front!
          duration: 0.7,
          ease: "power2.out"
        });
      }
    });
  }

  // =========================================================================
  // 3. Interactive Viscous Fluid Canvas Simulation
  // =========================================================================
  const canvas = document.getElementById('fluidCanvas');
  let ctx = null;
  let width = 0;
  let height = 0;
  const cursorGlow = document.getElementById('cursorGlow');
  const blobs = [];

  if (canvas) {
    ctx = canvas.getContext('2d');
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initBlobs();
    });

    const mouse = {
      x: width * 0.5,
      y: height * 0.45,
      targetX: width * 0.5,
      targetY: height * 0.45,
      active: false,
      radius: 140
    };

    window.addEventListener('mousemove', (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;

      if (cursorGlow) {
        cursorGlow.style.opacity = '1';
        cursorGlow.style.left = `${e.clientX}px`;
        cursorGlow.style.top = `${e.clientY}px`;
      }
    });

    window.addEventListener('mouseleave', () => {
      mouse.active = false;
      if (cursorGlow) cursorGlow.style.opacity = '0';
    });

    class LiquidBlob {
      constructor(x, y, r, color1, color2) {
        this.baseX = x;
        this.baseY = y;
        this.x = x;
        this.y = y;
        this.r = r;
        this.baseR = r;
        this.color1 = color1;
        this.color2 = color2;
        this.phase = Math.random() * Math.PI * 2;
        this.phaseSpeed = 0.015 + Math.random() * 0.02;
      }

      update(time) {
        this.phase += this.phaseSpeed;
        this.x = this.baseX + Math.sin(this.phase) * 60 + Math.cos(time * 0.001 + this.phase) * 35;
        this.y = this.baseY + Math.cos(this.phase * 0.8) * 55 + Math.sin(time * 0.0012) * 30;
        this.r = this.baseR + Math.sin(this.phase * 1.5) * 20;

        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius + this.r && dist > 0) {
          const force = (mouse.radius + this.r - dist) / (mouse.radius + this.r);
          this.x += (dx / dist) * force * 18;
          this.y += (dy / dist) * force * 18;
        }
      }

      draw(context) {
        const gradient = context.createRadialGradient(
          this.x - this.r * 0.2,
          this.y - this.r * 0.2,
          0,
          this.x,
          this.y,
          this.r
        );
        gradient.addColorStop(0, this.color1);
        gradient.addColorStop(0.55, this.color2);
        gradient.addColorStop(1, 'rgba(9, 8, 9, 0)');

        context.beginPath();
        context.fillStyle = gradient;
        context.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        context.fill();
      }
    }

    function initBlobs(customColor = 'rgba(89, 255, 0, 0.22)') {
      blobs.length = 0;
      blobs.push(new LiquidBlob(width * 0.25, height * 0.35, Math.min(width, height) * 0.42, customColor, 'rgba(22, 91, 2, 0.08)'));
      blobs.push(new LiquidBlob(width * 0.75, height * 0.45, Math.min(width, height) * 0.46, 'rgba(56, 183, 0, 0.20)', 'rgba(12, 54, 1, 0.06)'));
      blobs.push(new LiquidBlob(width * 0.5, height * 0.5, Math.min(width, height) * 0.52, 'rgba(77, 232, 0, 0.16)', 'rgba(9, 8, 9, 0)'));
      blobs.push(new LiquidBlob(width * 0.38, height * 0.65, Math.min(width, height) * 0.32, 'rgba(0, 240, 170, 0.18)', 'rgba(12, 54, 1, 0.04)'));
      blobs.push(new LiquidBlob(width * 0.68, height * 0.25, Math.min(width, height) * 0.28, customColor, 'rgba(22, 91, 2, 0.05)'));
      blobs.push(new LiquidBlob(width * 0.15, height * 0.75, Math.min(width, height) * 0.35, 'rgba(40, 150, 0, 0.22)', 'rgba(9, 8, 9, 0)'));
    }

    window.updateFluidColor = function(colorHex) {
      initBlobs(colorHex);
    };

    initBlobs();

    let startTime = performance.now();

    function renderFluid(now) {
      const time = now - startTime;
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      ctx.fillStyle = '#090809';
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < blobs.length; i++) {
        blobs[i].update(time);
        blobs[i].draw(ctx);
      }
      ctx.globalCompositeOperation = 'source-over';

      requestAnimationFrame(renderFluid);
    }

    requestAnimationFrame(renderFluid);
  }

  // =========================================================================
  // 4. Animated Specs Number Counters (0g Sugar, 200mg, 4x)
  // =========================================================================
  const counters = document.querySelectorAll('.counter');
  
  function runCounters() {
    counters.forEach(counter => {
      const target = +counter.getAttribute('data-target');
      const duration = 1400;
      const startTime = performance.now();

      function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(ease * target);
        counter.textContent = current;

        if (progress < 1) {
          requestAnimationFrame(updateNumber);
        } else {
          counter.textContent = target;
        }
      }

      requestAnimationFrame(updateNumber);
    });
  }

  if (counters.length > 0) {
    setTimeout(runCounters, 350);
  }

  // =========================================================================
  // 5. 2nd Page Flavor Switcher (flavors.html)
  // =========================================================================
  const flavorTabs = document.querySelectorAll('.flavor-tab-btn');
  const dynamicFlavorName = document.getElementById('dynamicFlavorName');
  const canGlowHalo = document.getElementById('canGlowHalo');
  const flavorHeadline = document.getElementById('flavorProfileHeadline');
  const meterEnergy = document.getElementById('meterEnergy');
  const meterFizz = document.getElementById('meterFizz');
  const meterTart = document.getElementById('meterTart');

  const flavorData = {
    'neon-lime': {
      name: 'Neon Lime',
      color: '#59ff00',
      threeColor: 0x59ff00,
      headline: 'Clean, crisp citrus shockwave with zero lingering aftertaste.',
      energy: '95%',
      fizz: '90%',
      tart: '82%'
    },
    'cyber-berry': {
      name: 'Cyber Berry',
      color: '#c084fc',
      threeColor: 0xc084fc,
      headline: 'Deep wild blackberry velvet with rich anthocyanin antioxidants.',
      energy: '92%',
      fizz: '85%',
      tart: '78%'
    },
    'solar-surge': {
      name: 'Solar Surge',
      color: '#fb923c',
      threeColor: 0xfb923c,
      headline: 'Electric Sicilian blood orange infused with exotic Japanese yuzu.',
      energy: '96%',
      fizz: '92%',
      tart: '88%'
    },
    'arctic-frost': {
      name: 'Arctic Frost',
      color: '#38bdf8',
      threeColor: 0x38bdf8,
      headline: 'Glacial blue raspberry mountain chill with an icy cooling finish.',
      energy: '94%',
      fizz: '88%',
      tart: '75%'
    }
  };

  flavorTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      flavorTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const id = tab.getAttribute('data-flavor-id');
      const data = flavorData[id];

      if (data) {
        if (dynamicFlavorName) {
          dynamicFlavorName.textContent = data.name;
          dynamicFlavorName.style.color = data.color;
        }
        if (canGlowHalo) {
          canGlowHalo.style.background = `radial-gradient(circle, ${data.color}55 0%, transparent 70%)`;
        }
        if (flavorHeadline) flavorHeadline.textContent = data.headline;
        if (meterEnergy) meterEnergy.style.width = data.energy;
        if (meterFizz) meterFizz.style.width = data.fizz;
        if (meterTart) meterTart.style.width = data.tart;

        if (window.updateFluidColor) {
          window.updateFluidColor(`${data.color}33`);
        }

        // Full 360° spin returning directly to FRONT heading!
        if (window.energyCanMesh) {
          gsap.to(window.energyCanMesh.rotation, {
            y: "+=6.28318",
            duration: 0.85,
            ease: "power2.out"
          });
        }
        if (window.canLights && window.canLights.rimLight) {
          window.canLights.rimLight.color.setHex(data.threeColor);
        }
      }
    });
  });

  // Pack selector on flavors page
  const packOptBtns = document.querySelectorAll('.pack-opt-btn');
  const canPagePrice = document.getElementById('canPagePrice');
  packOptBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      packOptBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const price = btn.getAttribute('data-price');
      if (canPagePrice) canPagePrice.textContent = `$${price}`;
    });
  });

  const orderFlavorBtn = document.getElementById('orderFlavorBtn');
  if (orderFlavorBtn) {
    orderFlavorBtn.addEventListener('click', () => {
      const activeTab = document.querySelector('.flavor-tab-btn.active');
      const activeFlavor = activeTab ? activeTab.getAttribute('data-name') : 'Neon Lime';
      showToast(`Added 12-Pack of ${activeFlavor} to Cart!`);
    });
  }

  // =========================================================================
  // 6. Modals & Cart Engine
  // =========================================================================
  const orderModal = document.getElementById('orderModal');
  const contactModal = document.getElementById('contactModal');
  const contactBtn = document.getElementById('contactBtn');
  const footerContactBtn = document.getElementById('footerContactBtn');
  const closeOrderModal = document.getElementById('closeOrderModal');
  const closeContactModal = document.getElementById('closeContactModal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const toast = document.getElementById('toastNotification');
  const toastText = document.getElementById('toastText');

  const qtyMinus = document.getElementById('qtyMinus');
  const qtyPlus = document.getElementById('qtyPlus');
  const qtyValue = document.getElementById('qtyValue');
  const orderTotal = document.getElementById('orderTotal');

  const packs = [
    { qty: 6, label: '6 Pack', total: '$19.99' },
    { qty: 12, label: '12 Pack', total: '$34.99' },
    { qty: 24, label: '24 Pack', total: '$64.99' }
  ];
  let packIdx = 1;
  let currentFlavor = 'Lime Surge';

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (orderNowBtn) orderNowBtn.addEventListener('click', () => openModal(orderModal));
  if (contactBtn) contactBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(contactModal); });
  if (footerContactBtn) footerContactBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(contactModal); });

  if (closeOrderModal) closeOrderModal.addEventListener('click', () => closeModal(orderModal));
  if (closeContactModal) closeContactModal.addEventListener('click', () => closeModal(contactModal));

  [orderModal, contactModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(orderModal);
      closeModal(contactModal);
    }
  });

  const flavorCards = document.querySelectorAll('.flavor-card');
  flavorCards.forEach(card => {
    card.addEventListener('click', () => {
      flavorCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentFlavor = card.getAttribute('data-flavor');
    });
  });

  function updatePack() {
    if (qtyValue) qtyValue.textContent = packs[packIdx].label;
    if (orderTotal) orderTotal.textContent = packs[packIdx].total;
  }

  if (qtyMinus) {
    qtyMinus.addEventListener('click', () => {
      if (packIdx > 0) {
        packIdx--;
        updatePack();
      }
    });
  }

  if (qtyPlus) {
    qtyPlus.addEventListener('click', () => {
      if (packIdx < packs.length - 1) {
        packIdx++;
        updatePack();
      }
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      closeModal(orderModal);
      showToast(`Added ${packs[packIdx].label} (${currentFlavor}) to cart!`);
    });
  }

  window.showToast = function(msg) {
    if (!toast || !toastText) return;
    toastText.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3800);
  };

  window.handleContactSubmit = function() {
    const nameInput = document.getElementById('contactName');
    const name = nameInput ? nameInput.value : 'Friend';
    closeModal(contactModal);
    showToast(`Transmission received, ${name}!`);
    const form = document.getElementById('contactForm');
    if (form) form.reset();
  };
});
