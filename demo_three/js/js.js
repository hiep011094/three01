class Slider {
    constructor(opts) {
      this.scene = new THREE.Scene();
      this.vertex = `varying vec2 vUv;void main() {vUv = uv;gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );}`;
      this.fragment = opts.fragment;
      this.uniforms = opts.uniforms;
      this.renderer = new THREE.WebGLRenderer();
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(this.width, this.height);
      this.renderer.setClearColor(0xeeeeee, 1);
      this.duration = opts.duration || 2.5;
      this.debug = opts.debug || false;
      this.easing = opts.easing || "easeInOut";
  
      this.slider = document.querySelector(".c-slider");
      this.images = JSON.parse(this.slider.getAttribute("data-images"));
      this.width = this.slider.offsetWidth;
      this.height = this.slider.offsetHeight;
      this.slider.appendChild(this.renderer.domElement);
  
      this.camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.001,
        1000
      );
  
      this.camera.position.set(0, 0, 2);
      this.time = 0;
      this.current = 0;
      this.textures = [];
  
      this.paused = true;
      this.initiate(() => {
        this.setupResize();
        this.settings();
        this.addObjects();
        this.resize();
        this.clickEvent();
        this.addEvents();
        this.play();
        this.autoPlay();
        // this.scrollPlay();
      });
    }
  
    initiate(cb) {
      const promises = [];
      let that = this;
      this.images.forEach((url, i) => {
        let promise = new Promise((resolve) => {
          that.textures[i] = new THREE.TextureLoader().load(url, resolve);
        });
        promises.push(promise);
      });
  
      Promise.all(promises).then(() => {
        cb();
      });
    }
  
    addEvents() {
      let pagButtons = Array.from(
        document.querySelector(".c-pagination").querySelectorAll("button")
      );
      let that = this;
      pagButtons.forEach((el) => {
        el.addEventListener("click", function () {
          document
            .querySelector(".c-pagination")
            .querySelectorAll(".active")[0].className = "";
          this.className = "active";
          let slideId = parseInt(this.dataset.slide, 10);
          that.dots(slideId);
        });
      });
    }
  
    clickEvent() {
      this.slider.addEventListener("click", () => {
        this.next();
      });
    }
    settings() {
      this.settings = { progress: 0.5 };
      Object.keys(this.uniforms).forEach((item) => {
        this.settings[item] = this.uniforms[item].value;
      });
    }
  
    scrollPlay() {
      this.slider.addEventListener(
        "wheel",
        (event) => {
          if (event.deltaY < 0) {
            this.prev();
          } else {
            this.next();
          }
        },
        true
      );
    }
  
    autoPlay() {
      let intervalAuto = function () {
        const buttons = document.querySelector(".c-pagination");
        let current = parseInt(
          buttons.querySelectorAll(".active")[0].dataset.slide
        );
        if (current === 2) current = -1;
  
        let next = buttons.querySelectorAll(
          "[data-slide='" + (current + 1).toString() + "']"
        )[0];
        next.click();
      };
      window.setInterval(intervalAuto, 5000);
      clearInterval(intervalAuto);
    }
  
    setupResize() {
      window.addEventListener("resize", this.resize.bind(this));
    }
  
    resize() {
      this.width = this.slider.offsetWidth;
      this.height = this.slider.offsetHeight;
      this.renderer.setSize(this.width, this.height);
      this.camera.aspect = this.width / this.height;
  
      // image cover
      this.imageAspect =
        this.textures[0].image.height / this.textures[0].image.width;
      let a1;
      let a2;
      if (this.height / this.width > this.imageAspect) {
        a1 = (this.width / this.height) * this.imageAspect;
        a2 = 1;
      } else {
        a1 = 1;
        a2 = this.height / this.width / this.imageAspect;
      }
  
      this.material.uniforms.resolution.value.x = this.width;
      this.material.uniforms.resolution.value.y = this.height;
      this.material.uniforms.resolution.value.z = a1;
      this.material.uniforms.resolution.value.w = a2;
  
      const dist = this.camera.position.z;
      const height = 1;
      this.camera.fov = 2 * (180 / Math.PI) * Math.atan(height / (2 * dist));
  
      this.plane.scale.x = this.camera.aspect;
      this.plane.scale.y = 1;
  
      this.camera.updateProjectionMatrix();
    }
  
    addObjects() {
      let that = this;
      this.material = new THREE.ShaderMaterial({
        extensions: {
          derivatives: "#extension GL_OES_standard_derivatives : enable",
        },
        side: THREE.DoubleSide,
        uniforms: {
          time: { type: "f", value: 0 },
          scaleTimes1: { type: "f", value: 1 },
          scaleTimes2: { type: "f", value: 1 },
          progress: { type: "f", value: 0.0 },
          intensity: { type: "f", value: 0.5 },
          swipe: { type: "f", value: 0 },
          texture1: { type: "f", value: this.textures[0] },
          texture2: { type: "f", value: this.textures[1] },
          displacement: {
            type: "f",
            value: new THREE.TextureLoader().load(
              "https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/rock-_disp.png"
            ),
          },
          resolution: { type: "v4", value: new THREE.Vector4() },
        },
        vertexShader: this.vertex,
        fragmentShader: this.fragment,
      });
  
      this.geometry = new THREE.PlaneGeometry(1, 1, 2, 2);
  
      this.plane = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.plane);
    }
  
    stop() {
      this.paused = true;
    }
  
    play() {
      this.paused = false;
      this.render();
    }
  
    dots(i) {
      if (this.isRunning) return;
      this.isRunning = true;
      let len = this.textures.length;
      let nextTexture = this.textures[i % len];
      this.material.uniforms.texture2.value = nextTexture;
      this.material.uniforms.scaleTimes2.value = 1;
      let tl = new TimelineMax();
      tl.to(this.material.uniforms.progress, this.duration, {
        value: 1,
        ease: Power2[this.easing],
        onComplete: () => {
          this.current = i % len;
          this.material.uniforms.texture1.value = nextTexture;
          this.material.uniforms.progress.value = 0;
          this.material.uniforms.scaleTimes1.value = this.material.uniforms.scaleTimes2.value;
          this.isRunning = false;
        },
      });
    }
  
    next() {
      if (this.isRunning) return;
      this.isRunning = true;
      let len = this.textures.length;
      let nextTexture = this.textures[(this.current + 1) % len];
      this.material.uniforms.texture2.value = nextTexture;
      this.material.uniforms.scaleTimes2.value = 1;
      let tl = new TimelineMax();
      tl.to(this.material.uniforms.progress, this.duration, {
        value: 1,
        ease: Power2[this.easing],
        onComplete: () => {
          this.current = (this.current + 1) % len;
          this.material.uniforms.texture1.value = nextTexture;
          this.material.uniforms.progress.value = 0;
          this.material.uniforms.scaleTimes1.value = this.material.uniforms.scaleTimes2.value;
  
          this.isRunning = false;
        },
      });
      const buttons = document.querySelector(".c-pagination");
      let classActive = buttons.querySelectorAll(".active");
      let length = buttons.children.length - 1;
  
      classActive.forEach((el) => {
        el.classList.remove("active");
      });
  
      if (this.current === length) this.current = -1;
      buttons.querySelector(
        "[data-slide='" + (this.current + 1).toString() + "']"
      ).classList = "active";
    }
  
    prev() {
      if (this.isRunning) return;
      const buttons = document.querySelector(".c-pagination");
      let classActive = buttons.querySelectorAll(".active");
      let length = buttons.children.length - 1;
  
      if (this.current === 0) {
        this.current = length;
      } else {
        this.current = this.current - 1;
      }
      this.isRunning = true;
      let len = this.textures.length;
      let nextTexture = this.textures[this.current % len];
      this.material.uniforms.texture2.value = nextTexture;
      let tl = new TimelineMax();
      tl.to(this.material.uniforms.progress, this.duration, {
        value: 1,
        ease: Power2[this.easing],
        onComplete: () => {
          this.current = this.current % len;
  
          this.material.uniforms.texture1.value = nextTexture;
          this.material.uniforms.progress.value = 0;
          this.isRunning = false;
        },
      });
  
      classActive.forEach((el) => {
        el.classList.remove("active");
      });
  
      buttons.querySelector(
        "[data-slide='" + this.current.toString() + "']"
      ).classList = "active";
    }
  
    render() {
      if (this.paused) return;
      this.time += 0.05;
      this.material.uniforms.time.value = this.time;
      if (this.material.uniforms.scaleTimes1.value > 0.8) {
        this.material.uniforms.scaleTimes1.value -= 0.0004
      }
      if (this.isRunning) {
        this.material.uniforms.scaleTimes2.value -= 0.0004
      }
  
      Object.keys(this.uniforms).forEach((item) => {
        this.material.uniforms[item].value = this.settings[item];
      });
  
      requestAnimationFrame(this.render.bind(this));
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  let slider = new Slider({
    debug: true,
    uniforms: {
      intensity: { value: 0.3, type: "f", min: 0, max: 2 },
    },
    fragment: `
            uniform float progress;
            uniform float scaleTimes1;
            uniform float scaleTimes2;
            uniform float intensity;
            uniform sampler2D texture1;
            uniform sampler2D texture2;
            uniform sampler2D displacement1;
            uniform sampler2D displacement2;
            uniform vec4 resolution;
            varying vec2 vUv;
    
            void main()	{
              vec2 newUV1 = vec2(scaleTimes1) * ((vUv - vec2(0.5))*resolution.zw) + vec2(0.5);
              vec2 newUV2 = vec2(scaleTimes2) * ((vUv - vec2(0.5))*resolution.zw) + vec2(0.5);
  
             vec4 d1 = texture2D(texture1, newUV2);
             vec4 d2 = texture2D(texture2, newUV2);
    
             vec4 displacement1 = texture2D(displacement1, newUV1);
             vec4 displacement2 = texture2D(displacement2, newUV2);
             vec2 dispVec1 = vec2(displacement1.x, displacement1.y);
             vec2 dispVec2 = vec2(displacement2.x, displacement2.y);
             
             vec4 t1 = texture2D(texture1, (newUV1 + (dispVec1 * intensity * progress)));
             vec4 t2 = texture2D(texture2, (newUV2 + (dispVec2 * -(intensity * (1.0 - progress)))));
    
             gl_FragColor = mix(t1, t2, progress);
    
            }
    
        `,
  });
  