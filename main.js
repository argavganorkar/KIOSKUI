const CONFIG = {
    TL: { startAngle: 0, endAngle: 90, cx: 0, cy: 0, id: 'top-left-svg' },
    TR: { startAngle: 90, endAngle: 180, cx: 800, cy: 0, id: 'top-right-svg' },
    BR: { startAngle: 180, endAngle: 270, cx: 800, cy: 800, id: 'bottom-right-svg' },
    BL: { startAngle: 270, endAngle: 360, cx: 0, cy: 800, id: 'bottom-left-svg' }
};

const DATA = {
    primary: ['Edit Color', 'Material', 'Finish', 'Texture'],
    Material: ['Wood', 'Metal', 'Plastic', 'Fabric', 'Glass', 'Ceramic', 'Leather', 'Composite'],
    Wood: ['Oak', 'Walnut', 'Teak', 'Pine', 'Maple', 'Birch', 'Ash', 'Mahogany', '+ Add more'],
    Metal: ['Aluminum', 'Stainless Steel', 'Brass', 'Copper', 'Titanium', 'Mild Steel', 'Anodized Metal', '+ Add more'],
    Plastic: ['ABS', 'Polycarbonate', 'Polypropylene', 'Acrylic', 'PVC', 'Nylon', '+ Add more'],
    Fabric: ['Cotton', 'Linen', 'Polyester', 'Wool', 'Denim', 'Silk', '+ Add more'],
    Glass: ['Tempered Glass', 'Frosted Glass', 'Clear Glass', '+ Add more'],
    Ceramic: ['Porcelain', 'Stoneware', 'Ceramic Matte', '+ Add more'],
    Finish: ['Matte', 'Gloss', 'Satin', 'Brushed', 'Polished', 'Textured', 'Anodized', 'Powder Coated'],
    Texture: ['Smooth', 'Grain', 'Ribbed', 'Knurled', 'Woven', 'Perforated', 'Embossed', 'Organic'],
    'Edit Color': ['Hue Shift', 'Saturation', 'Brightness', 'Contrast', 'Opacity', 'Warm/Cool', 'Save Variant']
};

class CMFRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.container.innerHTML = '';
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 100);
        this.camera.position.set(0, 0, 25);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.container.appendChild(this.renderer.domElement);
        
        this.colorState = {
            base: new THREE.Color('#3F00FF'),
            hueShift: 0,
            saturation: 1.0,
            brightness: 1.0,
            contrast: 1.0,
            opacity: 1.0
        };
        
        this.setupLighting();
        this.setupBottle();
        
        window.addEventListener('resize', () => this.onWindowResize());
        
        this.animate();
        this.applyCMF({ color: '#3F00FF', material: 'Metal', finish: 'Satin' }); // Initial Default
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0xaaccff, 0.6);
        fillLight.position.set(-5, 0, -5);
        this.scene.add(fillLight);
        
        const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
        rimLight.position.set(0, 5, -10);
        this.scene.add(rimLight);
    }
    
    setupBottle() {
        const path = new THREE.Path();
        path.moveTo(0.001, 0); // Bottom center 
        path.lineTo(1.8, 0); // Bottom edge
        path.bezierCurveTo(2.0, 0, 2.1, 0.1, 2.1, 0.3); // Bevel
        path.lineTo(2.1, 5.5); // Main body
        path.bezierCurveTo(2.1, 7.5, 0.7, 8.5, 0.7, 10.0); // Shoulder to neck
        path.lineTo(0.7, 11.0); // Neck
        path.lineTo(0.9, 11.0); // Lip ring bottom
        path.lineTo(0.9, 11.2); // Lip ring side
        path.lineTo(0.7, 11.2); // Lip ring top
        path.lineTo(0.7, 11.5); // Top inner
        
        const lathePoints = path.getPoints(60);
        const geometry = new THREE.LatheGeometry(lathePoints, 64);
        
        geometry.computeBoundingBox();
        const yOffset = -0.5 * (geometry.boundingBox.max.y - geometry.boundingBox.min.y);
        geometry.translate(0, yOffset, 0);
        
        this.material = new THREE.MeshPhysicalMaterial({
            color: this.colorState.base.clone(),
            metalness: 0.8,
            roughness: 0.2,
            clearcoat: 0.1,
            clearcoatRoughness: 0.2,
            side: THREE.DoubleSide
        });
        
        this.bottle = new THREE.Mesh(geometry, this.material);
        this.bottleGroup = new THREE.Group();
        this.bottleGroup.add(this.bottle);
        this.scene.add(this.bottleGroup);
    }
    
    applyCMF(config) {
        if (!this.material) return;
        
        if (config.color) {
            this.colorState.base.set(config.color);
            this.updateFinalColor();
        }
        
        const materialMap = {
            'Metal': { metalness: 0.9, roughness: 0.2, clearcoat: 0.1 },
            'Plastic': { metalness: 0.1, roughness: 0.4, clearcoat: 0.5 },
            'Wood': { metalness: 0.05, roughness: 0.8, clearcoat: 0.0 }, 
            'Glass': { metalness: 0.1, roughness: 0.05, transmission: 0.95, transparent: true, opacity: 1, ior: 1.5, thickness: 1.0 },
            'Ceramic': { metalness: 0.0, roughness: 0.5, clearcoat: 0.8 },
            'Leather': { metalness: 0.05, roughness: 0.7, clearcoat: 0.05 }
        };
        
        const finishMap = {
            'Matte': { roughnessModifier: 0.4, clearcoat: 0 },
            'Gloss': { roughnessModifier: -0.3, clearcoat: 1.0, clearcoatRoughness: 0.05 },
            'Satin': { roughnessModifier: 0.0, clearcoat: 0.3, clearcoatRoughness: 0.5 },
            'Metallic': { metalnessOverride: 1.0, roughnessModifier: -0.2 }
        };
        
        let targetMetalness = this.material.metalness;
        let targetRoughness = this.material.roughness;
        let targetClearcoat = this.material.clearcoat;
        
        if (config.material && materialMap[config.material]) {
            const props = materialMap[config.material];
            targetMetalness = props.metalness !== undefined ? props.metalness : targetMetalness;
            targetRoughness = props.roughness !== undefined ? props.roughness : targetRoughness;
            targetClearcoat = props.clearcoat !== undefined ? props.clearcoat : targetClearcoat;
            
            if (props.transparent) {
                this.material.transmission = props.transmission;
                this.material.opacity = props.opacity;
                this.material.transparent = true;
                this.material.ior = props.ior;
                this.material.thickness = props.thickness;
            } else {
                this.material.transmission = 0;
                this.material.transparent = false;
            }
        }
        
        if (config.finish && finishMap[config.finish]) {
            const props = finishMap[config.finish];
            if (props.metalnessOverride !== undefined) targetMetalness = props.metalnessOverride;
            targetRoughness = Math.max(0, Math.min(1, targetRoughness + (props.roughnessModifier || 0)));
            targetClearcoat = props.clearcoat !== undefined ? props.clearcoat : targetClearcoat;
            if (props.clearcoatRoughness !== undefined) this.material.clearcoatRoughness = props.clearcoatRoughness;
        }
        
        this.animateProperty('metalness', targetMetalness);
        this.animateProperty('roughness', Math.max(0, Math.min(1, targetRoughness)));
        this.animateProperty('clearcoat', targetClearcoat);
    }
    
    animateProperty(prop, targetValue) {
        const startValue = this.material[prop];
        const duration = 400; 
        const startTime = performance.now();
        
        const step = (time) => {
            const progress = Math.min((time - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            this.material[prop] = startValue + (targetValue - startValue) * ease;
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }
    
    applyLivePreviewFilter(property, value) {
        if (!this.material) return;
        
        if (property === 'Brightness') {
            this.colorState.brightness = value * 2.0; 
        } else if (property === 'Saturation') {
            this.colorState.saturation = value * 2.0; 
        } else if (property === 'Hue Shift') {
            this.colorState.hueShift = value; 
        } else if (property === 'Contrast') {
            this.colorState.contrast = value * 2.0;
        } else if (property === 'Opacity') {
            this.colorState.opacity = value;
            this.material.transparent = value < 1.0;
            this.material.opacity = value;
        }
        
        this.updateFinalColor();
    }
    
    updateFinalColor() {
        const c = this.colorState.base.clone();
        
        const hsl = { h: 0, s: 0, l: 0 };
        c.getHSL(hsl);
        
        hsl.h = (hsl.h + this.colorState.hueShift) % 1.0;
        hsl.s = Math.max(0, Math.min(1, hsl.s * this.colorState.saturation));
        hsl.l = Math.max(0, Math.min(1, hsl.l * this.colorState.brightness));
        
        c.setHSL(hsl.h, hsl.s, hsl.l);
        
        c.r = Math.max(0, Math.min(1, (c.r - 0.5) * this.colorState.contrast + 0.5));
        c.g = Math.max(0, Math.min(1, (c.g - 0.5) * this.colorState.contrast + 0.5));
        c.b = Math.max(0, Math.min(1, (c.b - 0.5) * this.colorState.contrast + 0.5));
        
        this.material.color.copy(c);
        this.material.needsUpdate = true;
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        // Delay slightly if the container needs to re-layout
        setTimeout(() => {
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        }, 100);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.bottleGroup) {
            this.bottleGroup.rotation.y += 0.002;
        }
        this.renderer.render(this.scene, this.camera);
    }
}

class RadialSystem {
    constructor() {
        this.activeCorner = null;
        this.activeLayer = 1;
        this.activeParent = null; 
        this.cornerStates = {
            TL: { color: '#3F00FF', pantone: 'Ultramarine Blue', material: 'Metal', isActivated: true },
            TR: { color: '#0a0a0f', pantone: 'PANTONE 7584 C', material: 'Plastic', isActivated: false },
            BL: { color: '#0a0a0f', pantone: 'PANTONE 7527 C', material: 'Wood', isActivated: false },
            BR: { color: '#0a0a0f', pantone: 'PANTONE 5405 C', material: 'Leather', isActivated: false }
        };

        const randomColors = ['#2F5D50', '#C46A4A', '#D8C3A5', '#5A6C8E', '#8b5cf6', '#0ea5e9'];
        this.detectionColors = randomColors;

        this.rotation = 0;
        this.velocity = 0;
        this.lastDragTime = 0;
        this.isDragging = false;
        this.isAnimating = false;
        this.startDragAngle = 0;
        this.startRotation = 0;
        this.activeOptions = [];
        this.isControlMode = false;
        this.currentProperty = null;
        this.currentValue = 0.5;

        // Initialize Real-time CMF Renderer
        if (typeof THREE !== 'undefined') {
            this.cmfRenderer = new CMFRenderer('project-canvas');
        }

        this.init();
    }

    init() {
        document.querySelectorAll('.corner-node').forEach(node => {
            node.addEventListener('click', (e) => this.handleCornerClick(node, e));
        });
        document.getElementById('global-overlay').addEventListener('click', () => this.closeMenu());
        document.getElementById('close-modal').addEventListener('click', () => this.toggleModal(false));
        
        // Center Action Listeners
        document.getElementById('center-trigger').addEventListener('click', (e) => this.toggleFloatingAction(true, e));
        document.getElementById('main-action-pill').addEventListener('click', (e) => this.expandActionSystem(e));
        document.getElementById('upload-btn').addEventListener('click', () => document.getElementById('file-picker').click());
        document.getElementById('file-picker').addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('library-btn').addEventListener('click', () => this.toggleModal(true));
        
        window.addEventListener('mousemove', (e) => this.handleDrag(e));
        window.addEventListener('mouseup', () => this.stopDrag());
        window.addEventListener('touchmove', (e) => this.handleDrag(e.touches[0]), { passive: false });
        window.addEventListener('touchend', () => this.stopDrag());

        // Pre-activate targeted corner (Top-Left) with Ultramarine Blue
        this.syncCornerUI('TL');
    }

    syncCornerUI(corner) {
        const node = document.querySelector(`.corner-node[data-corner="${corner}"]`);
        const state = this.cornerStates[corner];
        if (!node || !state.isActivated) return;

        node.classList.add('activated');
        node.style.setProperty('--corner-color', state.color);
        
        const path = node.querySelector('.base-path');
        if (path) {
            path.style.fill = state.color;
            path.style.fillOpacity = "0.8"; // Make it clearly active
        }
        
        const pantone = node.querySelector('.pantone-code');
        if (pantone) pantone.textContent = state.pantone;

        const hex = node.querySelector('.hex-value');
        if (hex) hex.textContent = state.color.toUpperCase();
    }

    handleCornerClick(node, event) {
        const corner = node.dataset.corner;
        const state = this.cornerStates[corner];

        if (!state.isActivated) {
            // Trigger Activation / Sensor Lock
            this.activateCorner(corner, node);
        } else {
            // Normal Menu Interaction
            if (this.activeCorner === null) {
                this.openLayer2(corner);
            } else if (this.activeCorner !== corner) {
                this.closeMenu(() => this.openLayer2(corner));
            }
        }
    }

    activateCorner(corner, node) {
        const state = this.cornerStates[corner];
        state.isActivated = true;
        // Assign a "detected" color if not already set (like our custom override)
        if (state.color === '#0a0a0f') {
            state.color = this.detectionColors[Math.floor(Math.random() * this.detectionColors.length)];
        }
        
        this.syncCornerUI(corner);
        console.log(`Corner ${corner} activated with ${state.color}`);
    }

    openLayer2(corner) {
        this.activeCorner = corner;
        this.activeLayer = 2;
        this.activeParent = null;
        this.renderMenu(corner, 2, DATA.primary);
        document.getElementById('radial-menu-overlay').classList.add('active');
        document.getElementById('global-overlay').classList.add('active');
    }

    renderMenu(corner, layer, options, parentOption = null) {
        this.activeOptions = options;
        this.activeLayer = layer;
        this.activeParent = parentOption;
        this.rotation = 0;
        this.velocity = 0;

        const container = document.getElementById('radial-menu-overlay');
        // Force clean clear
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 800 800");
        svg.setAttribute("id", CONFIG[corner].id);
        svg.classList.add('radial-menu-svg');
        svg.style.setProperty('--corner-color', this.cornerStates[corner].color);
        
        svg.addEventListener('mousedown', (e) => this.startDrag(e, corner));
        svg.addEventListener('touchstart', (e) => this.startDrag(e.touches[0], corner));

        const contentGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        contentGroup.id = "radial-content-group";
        svg.appendChild(contentGroup);

        const { cx, cy, startAngle, endAngle } = CONFIG[corner];
        const innerRadius = 250;
        const outerRadius = 550;
        const segmentSweep = 22.5; 

        // Infinite Carousel: Repeat options until they fill the 360deg circle (16 segments)
        const minSegments = 16;
        let virtualOptions = [...options];
        while (virtualOptions.length < minSegments) {
            virtualOptions = virtualOptions.concat(options);
        }

        virtualOptions.forEach((opt, i) => {
            const sAngle = startAngle + (i * segmentSweep);
            const eAngle = sAngle + segmentSweep;
            
            const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            group.classList.add('radial-segment-group');
            group.dataset.index = i;

            const path = this.createSegmentPath(cx, cy, innerRadius, outerRadius, sAngle, eAngle);
            const segment = document.createElementNS("http://www.w3.org/2000/svg", "path");
            segment.setAttribute("d", path);
            segment.classList.add('radial-segment');
            
            segment.addEventListener('click', (e) => {
                if (this.isDragging || Math.abs(this.velocity) > 0.1) return;
                e.stopPropagation();
                if (opt === '+ Add more') {
                    this.toggleModal(true);
                } else if (['Saturation', 'Brightness', 'Contrast', 'Hue Shift', 'Opacity'].includes(opt)) {
                    this.renderControlDial(corner, opt);
                } else if (DATA[opt]) {
                    this.renderMenu(corner, layer + 1, DATA[opt], opt);
                } else {
                    this.selectOption(corner, parentOption, opt);
                }
            });

            group.appendChild(segment);

            const midAngle = (sAngle + eAngle) / 2;
            const textRadius = (innerRadius + outerRadius) / 2;
            const tx = cx + textRadius * Math.cos(midAngle * Math.PI / 180);
            const ty = cy + textRadius * Math.sin(midAngle * Math.PI / 180);

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", tx);
            text.setAttribute("y", ty);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("dominant-baseline", "middle");
            text.classList.add('radial-text');
            text.style.pointerEvents = "none";
            
            if (opt.includes(' ')) {
                const parts = opt.split(' ');
                const tspan1 = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                tspan1.textContent = parts[0];
                tspan1.setAttribute("x", tx);
                tspan1.setAttribute("dy", "-0.6em");
                tspan1.style.fontSize = "22px";
                tspan1.style.fontWeight = "bold";
                const tspan2 = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                tspan2.textContent = parts.slice(1).join(' ');
                tspan2.setAttribute("x", tx);
                tspan2.setAttribute("dy", "1.2em");
                tspan2.style.fontSize = "14px";
                tspan2.style.opacity = "0.7";
                text.appendChild(tspan1);
                text.appendChild(tspan2);
            } else {
                text.textContent = opt;
                text.style.fontSize = "20px";
                text.style.fontWeight = "500";
            }
            
            let rot = midAngle;
            if (corner === 'TR' || corner === 'BR') rot += 180;
            text.setAttribute("transform", `rotate(${rot}, ${tx}, ${ty})`);

            group.appendChild(text);
            contentGroup.appendChild(group);
        });

        this.addCenterButton(svg, corner, layer);
        if (layer >= 3) this.addLibraryButton(svg, corner, outerRadius, startAngle, endAngle);

        container.appendChild(svg);
        this.updateRotation(corner);
    }

    startDrag(e, corner) {
        this.isDragging = true;
        this.isAnimating = false;
        const rect = document.getElementById(CONFIG[corner].id).getBoundingClientRect();
        const { cx, cy } = CONFIG[corner];
        const svgCx = rect.left + (cx / 800) * rect.width;
        const svgCy = rect.top + (cy / 800) * rect.height;
        this.startDragAngle = Math.atan2(e.clientY - svgCy, e.clientX - svgCx) * 180 / Math.PI;
        this.startRotation = this.rotation;
        this.lastDragTime = performance.now();
        if (e.preventDefault) e.preventDefault();
    }

    handleDrag(e) {
        if (!this.activeCorner) return;
        if (this.isControlMode) {
            this.handleControlDrag(e);
            return;
        }
        if (!this.isDragging) return;
        const rect = document.getElementById(CONFIG[this.activeCorner].id).getBoundingClientRect();
        const { cx, cy } = CONFIG[this.activeCorner];
        const svgCx = rect.left + (cx / 800) * rect.width;
        const svgCy = rect.top + (cy / 800) * rect.height;
        const currentAngle = Math.atan2(e.clientY - svgCy, e.clientX - svgCx) * 180 / Math.PI;
        const newRotation = this.startRotation + (currentAngle - this.startDragAngle);
        const now = performance.now();
        const dt = now - this.lastDragTime;
        if (dt > 0) this.velocity = (newRotation - this.rotation) / dt;
        this.rotation = newRotation;
        this.lastDragTime = now;
        this.updateRotation(this.activeCorner);
    }

    stopDrag() {
        if (!this.isDragging) return;
        this.isDragging = false;
        if (Math.abs(this.velocity) > 0.05) this.startInertia();
        else this.snapToNearest();
    }

    startInertia() {
        this.isAnimating = true;
        const friction = 0.95;
        const step = () => {
            if (!this.isAnimating) return;
            this.rotation += this.velocity * 16;
            this.velocity *= friction;
            if (Math.abs(this.velocity) < 0.01) {
                this.isAnimating = false;
                this.snapToNearest();
            } else {
                this.updateRotation(this.activeCorner);
                requestAnimationFrame(step);
            }
        };
        requestAnimationFrame(step);
    }

    snapToNearest() {
        const segmentSize = 22.5;
        this.rotation = Math.round(this.rotation / segmentSize) * segmentSize;
        this.updateRotation(this.activeCorner);
    }

    updateRotation(corner) {
        const svg = document.getElementById(CONFIG[corner].id);
        if (!svg) return;
        const group = svg.querySelector("#radial-content-group");
        if (!group) return;
        const { cx, cy } = CONFIG[corner];
        group.setAttribute("transform", `rotate(${this.rotation}, ${cx}, ${cy})`);
        this.highlightActive(corner, svg);
    }

    highlightActive(corner, svg) {
        const { startAngle, endAngle } = CONFIG[corner];
        const centerLine = (startAngle + endAngle) / 2;
        const segmentSize = 22.5;
        svg.querySelectorAll('.radial-segment-group').forEach((group, i) => {
            const segmentMid = startAngle + (i * segmentSize) + (segmentSize / 2);
            const currentAngle = (segmentMid + this.rotation);
            let diff = Math.abs((((currentAngle - centerLine + 180) % 360 + 360) % 360) - 180);
            if (diff < segmentSize / 2) group.classList.add('active-segment');
            else group.classList.remove('active-segment');
        });
    }

    addCenterButton(svg, corner, layer) {
        const { cx, cy, startAngle, endAngle } = CONFIG[corner];
        const rad = 80;
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", cx); circle.setAttribute("cy", cy); circle.setAttribute("r", rad);
        circle.setAttribute("fill", "var(--glass-bg)");
        circle.setAttribute("stroke", "var(--glass-border)");
        circle.style.cursor = "pointer";
        circle.style.backdropFilter = "blur(15px)";
        circle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.isControlMode) {
                this.isControlMode = false;
                this.renderMenu(corner, 3, DATA['Edit Color'], 'Edit Color');
            } else if (layer === 4) this.renderMenu(corner, 3, DATA.Material, 'Material');
            else if (layer === 3) this.renderMenu(corner, 2, DATA.primary);
            else this.closeMenu();
        });
        svg.appendChild(circle);
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.style.fill = "white"; text.style.fontSize = "18px"; text.style.fontWeight = "600";
        text.textContent = (layer > 2 || this.isControlMode) ? "BACK" : "CLOSE";
        text.setAttribute("text-anchor", "middle"); text.setAttribute("dominant-baseline", "middle");
        const offset = 45; const cAngle = (startAngle + endAngle) / 2 * Math.PI / 180;
        const tx = cx + offset * Math.cos(cAngle); const ty = cy + offset * Math.sin(cAngle);
        text.setAttribute("x", tx); text.setAttribute("y", ty);
        let rot = 0; if (corner === 'TR' || corner === 'BR') rot = 180;
        text.setAttribute("transform", `rotate(${rot}, ${tx}, ${ty})`);
        svg.appendChild(text);
    }

    addLibraryButton(svg, corner, radius, start, end) {
        const { cx, cy } = CONFIG[corner];
        const inner = radius + 20; const outer = radius + 70;
        const path = this.createSegmentPath(cx, cy, inner, outer, start, end);
        const segment = document.createElementNS("http://www.w3.org/2000/svg", "path");
        segment.setAttribute("d", path);
        segment.classList.add('radial-segment', 'library-trigger');
        segment.setAttribute("fill", "rgba(100,100,255,0.3)");
        segment.setAttribute("stroke", "rgba(255,255,255,0.4)");
        segment.addEventListener('click', (e) => { e.stopPropagation(); this.toggleModal(true); });
        svg.appendChild(segment);
        const mid = (start + end) / 2; const tr = (inner + outer) / 2;
        const tx = cx + tr * Math.cos(mid * Math.PI / 180); const ty = cy + tr * Math.sin(mid * Math.PI / 180);
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", tx); text.setAttribute("y", ty);
        text.setAttribute("text-anchor", "middle"); text.setAttribute("dominant-baseline", "middle");
        text.classList.add('radial-text'); text.style.fontSize = '12px'; text.textContent = "+ LIBRARY";
        let rot = mid; if (corner === 'TR' || corner === 'BR') rot += 180;
        text.setAttribute("transform", `rotate(${rot}, ${tx}, ${ty})`);
        svg.appendChild(text);
    }

    selectOption(corner, category, value) {
        console.log(`Selected ${value} for ${category}`);
        if (this.cmfRenderer) {
            const config = {};
            if (category === 'Material') config.material = value;
            if (category === 'Finish') config.finish = value;
            this.cmfRenderer.applyCMF(config);
        }
        this.closeMenu();
    }

    createSegmentPath(cx, cy, innerRadius, outerRadius, startAngle, endAngle) {
        const rad1 = startAngle * Math.PI / 180; const rad2 = endAngle * Math.PI / 180;
        const x1 = cx + outerRadius * Math.cos(rad1); const y1 = cy + outerRadius * Math.sin(rad1);
        const x2 = cx + outerRadius * Math.cos(rad2); const y2 = cy + outerRadius * Math.sin(rad2);
        const x3 = cx + innerRadius * Math.cos(rad2); const y3 = cy + innerRadius * Math.sin(rad2);
        const x4 = cx + innerRadius * Math.cos(rad1); const y4 = cy + innerRadius * Math.sin(rad1);
        return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 0 0 ${x4} ${y4} Z`;
    }

    closeMenu(callback) {
        const container = document.getElementById('radial-menu-overlay');
        container.classList.remove('active');
        document.getElementById('global-overlay').classList.remove('active');
        this.toggleFloatingAction(false);
        setTimeout(() => { container.innerHTML = ''; this.activeCorner = null; if (callback) callback(); }, 300);
    }

    toggleModal(show) {
        const modal = document.getElementById('library-modal');
        if (show) { this.populateLibrary(); modal.classList.add('active'); }
        else { modal.classList.remove('active'); }
    }

    populateLibrary() {
        const grid = document.getElementById('library-grid');
        grid.innerHTML = '';
        const items = [
            { name: 'Vector Sneaker', type: 'Footwear Concept', img: './assets/sneaker.png' },
            { name: 'Titanium Chrono', type: 'Horology Concept', img: './assets/watch.png' },
            { name: 'Aero Chair', type: 'Furniture Concept', img: './assets/chair.png' },
            { name: 'Origin Device', type: 'Gaming Concept', img: './assets/device.png' }
        ];
        items.forEach(item => {
            const el = document.createElement('div'); el.className = 'library-item';
            el.innerHTML = `
                <div class="item-preview" style="background: white; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                    <img src="${item.img}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </div>
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <p>${item.type}</p>
                </div>`;
            el.onclick = () => { 
                const canvas = document.getElementById('project-canvas');
                canvas.innerHTML = `<img src="${item.img}" alt="${item.name}">`;
                this.toggleModal(false); 
                this.closeMenu(); 
            };
            grid.appendChild(el);
        });
    }

    renderControlDial(corner, property) {
        this.isControlMode = true;
        this.currentProperty = property;
        this.currentValue = 0.5;

        const container = document.getElementById('radial-menu-overlay');
        while (container.firstChild) container.removeChild(container.firstChild);

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 800 800");
        svg.setAttribute("id", CONFIG[corner].id);
        svg.classList.add('radial-menu-svg');
        svg.style.setProperty('--corner-color', this.cornerStates[corner].color);

        const { cx, cy, startAngle, endAngle } = CONFIG[corner];
        const midRadius = 400; // Centered at 400 (between 350 and 450)
        const strokeWidth = 80;

        // Base Track (Rounded)
        const track = document.createElementNS("http://www.w3.org/2000/svg", "path");
        track.id = "control-track";
        track.setAttribute("fill", "none");
        track.setAttribute("stroke", "rgba(255, 255, 255, 0.05)");
        track.setAttribute("stroke-width", strokeWidth);
        track.setAttribute("stroke-linecap", "round");
        const trackD = this.createArcPath(cx, cy, midRadius, startAngle, endAngle);
        track.setAttribute("d", trackD);
        svg.appendChild(track);

        // Fill Path (Rounded + Gradient)
        const fill = document.createElementNS("http://www.w3.org/2000/svg", "path");
        fill.id = "control-fill";
        fill.setAttribute("fill", "none");
        fill.setAttribute("stroke", "var(--corner-color, var(--accent-solid))");
        fill.setAttribute("stroke-width", strokeWidth);
        fill.setAttribute("stroke-linecap", "round");
        fill.style.filter = "drop-shadow(0 0 15px var(--corner-color, var(--accent-solid)))";
        svg.appendChild(fill);

        // Knob
        const knob = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        knob.id = "control-knob";
        knob.setAttribute("r", "25");
        knob.setAttribute("fill", "white");
        knob.style.filter = "drop-shadow(0 0 15px white)";
        svg.appendChild(knob);

        // Value Text
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.id = "control-value-text";
        const valR = 220; // Move to the space between slider and center
        const valX = cx + valR * Math.cos((startAngle + endAngle)/2 * Math.PI/180);
        const valY = cy + valR * Math.sin((startAngle + endAngle)/2 * Math.PI/180);
        text.setAttribute("x", valX);
        text.setAttribute("y", valY);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.style.fill = "white";
        text.style.fontSize = "28px";
        text.style.fontWeight = "700";
        svg.appendChild(text);

        // Property label
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.textContent = property.toUpperCase();
        label.setAttribute("x", cx); label.setAttribute("y", cy);
        label.style.fill = "var(--corner-color, var(--accent-solid))"; label.style.fontSize = "14px";
        label.style.fontWeight = "800"; label.style.letterSpacing = "2px";
        svg.appendChild(label);

        this.addCenterButton(svg, corner, 99); // 99 as special mode
        container.appendChild(svg);
        this.updateControlUI(corner);
    }

    handleControlDrag(e) {
        const corner = this.activeCorner;
        const rect = document.getElementById(CONFIG[corner].id).getBoundingClientRect();
        const { cx, cy, startAngle, endAngle } = CONFIG[corner];
        const svgCx = rect.left + (cx / 800) * rect.width;
        const svgCy = rect.top + (cy / 800) * rect.height;
        
        let angle = Math.atan2(e.clientY - svgCy, e.clientX - svgCx) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        
        let normalized = (angle - startAngle) / (endAngle - startAngle);
        if (corner === 'TL' && angle > 270) normalized = (angle - 360 - startAngle) / (endAngle - startAngle);
        
        this.currentValue = Math.max(0, Math.min(1, normalized));
        this.updateControlUI(corner);
        this.applyLivePreview(corner);
    }

    updateControlUI(corner) {
        const { cx, cy, startAngle, endAngle } = CONFIG[corner];
        const midR = 400;
        const currentAngle = startAngle + this.currentValue * (endAngle - startAngle);

        const fill = document.getElementById('control-fill');
        if (fill) {
            fill.setAttribute("d", this.createArcPath(cx, cy, midR, startAngle, currentAngle));
        }

        const knob = document.getElementById('control-knob');
        if (knob) {
            knob.setAttribute("cx", cx + midR * Math.cos(currentAngle * Math.PI / 180));
            knob.setAttribute("cy", cy + midR * Math.sin(currentAngle * Math.PI / 180));
        }

        const text = document.getElementById('control-value-text');
        if (text) {
            text.textContent = `${Math.round(this.currentValue * 100)}%`;
            const labelR = 220;
            const midA = (startAngle + endAngle) / 2;
            text.setAttribute("x", cx + labelR * Math.cos(midA * Math.PI / 180));
            text.setAttribute("y", cy + labelR * Math.sin(midA * Math.PI / 180));
        }
    }

    createArcPath(cx, cy, r, startAngle, endAngle) {
        // Ensure there is at least a tiny arc to avoid invalid path data
        if (Math.abs(endAngle - startAngle) < 0.01) endAngle += 0.01;
        
        const rad1 = startAngle * Math.PI / 180;
        const rad2 = endAngle * Math.PI / 180;
        const x1 = cx + r * Math.cos(rad1);
        const y1 = cy + r * Math.sin(rad1);
        const x2 = cx + r * Math.cos(rad2);
        const y2 = cy + r * Math.sin(rad2);
        const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
        const sweep = endAngle > startAngle ? 1 : 0;
        return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
    }

    applyLivePreview(corner) {
        const state = this.cornerStates[corner];
        const baseColor = state.color;
        const path = document.querySelector(`#${corner} .base-path`);
        if (!path) return;

        // Simplified real-time manipulation using CSS filters
        let filter = '';
        if (this.currentProperty === 'Brightness') filter = `brightness(${this.currentValue * 2})`;
        if (this.currentProperty === 'Saturation') filter = `saturate(${this.currentValue * 2})`;
        if (this.currentProperty === 'Opacity') path.style.fillOpacity = this.currentValue;
        if (this.currentProperty === 'Hue Shift') filter = `hue-rotate(${this.currentValue * 360}deg)`;
        if (this.currentProperty === 'Contrast') filter = `contrast(${this.currentValue * 2})`;
        
        path.style.filter = filter;
        
        if (this.cmfRenderer) {
            this.cmfRenderer.applyLivePreviewFilter(this.currentProperty, this.currentValue);
        }
    }

    // --- Center Tap Action System ---
    toggleFloatingAction(show, event) {
        if (event) event.stopPropagation();
        const container = document.getElementById('floating-action-system');
        if (show) {
            container.classList.add('active');
        } else {
            container.classList.remove('active');
            container.classList.remove('expanded');
        }
    }

    expandActionSystem(event) {
        event.stopPropagation();
        const container = document.getElementById('floating-action-system');
        container.classList.toggle('expanded');
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const canvas = document.getElementById('project-canvas');
            canvas.innerHTML = `<img src="${e.target.result}" alt="Project Asset">`;
            this.toggleFloatingAction(false);
        };
        reader.readAsDataURL(file);
    }
}

window.addEventListener('DOMContentLoaded', () => { window.system = new RadialSystem(); });
