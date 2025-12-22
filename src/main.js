import * as THREE from 'three';
import { FractalControls } from './FractalControls.js';
import { FractalTree } from './spiralTree.js';
import { FractalStar } from './fractalStar.js';
import { CONFIG } from './config.js';

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.scene.backgroundColor);
scene.fog = new THREE.FogExp2(CONFIG.scene.fogColor, CONFIG.scene.fogDensity);

// Camera
// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.001, 50); // Far clip drastically reduced
camera.position.set(0, 8, 15);
camera.lookAt(0, 4, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// Controls
const controls = new FractalControls(camera, renderer.domElement, scene);
// Controls help text
const info = document.createElement('div');
info.style.position = 'absolute';
info.style.top = '10px';
info.style.left = '10px';
info.style.color = 'white';
info.style.fontFamily = 'monospace';
info.style.userSelect = 'none';
info.innerHTML = 'Click to capture mouse<br>WASD to move<br>Space/Shift to Up/Down';
document.body.appendChild(info);

// Crosshair
const crosshair = document.createElement('div');
crosshair.style.position = 'absolute';
crosshair.style.top = '50%';
crosshair.style.left = '50%';
crosshair.style.width = '10px';
crosshair.style.height = '10px';
crosshair.style.borderRadius = '50%';
crosshair.style.border = '2px solid white';
crosshair.style.transform = 'translate(-50%, -50%)';
crosshair.style.pointerEvents = 'none';
crosshair.style.mixBlendMode = 'difference';
document.body.appendChild(crosshair);

// Lights
const ambientLight = new THREE.AmbientLight(CONFIG.scene.ambientLightColor, CONFIG.scene.ambientLightIntensity);
scene.add(ambientLight);

// 3-Point Directional Lighting
const keyLight = new THREE.DirectionalLight(0xffaa33, 3); // Warm Key Light
keyLight.position.set(10, 10, 10);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x334466, 2); // Cool Fill Light
fillLight.position.set(-10, 5, 10);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 4); // Bright Rim Light
rimLight.position.set(0, 10, -10);
scene.add(rimLight);

// Fractal Tree
let tree;
let star;

async function loadGeometry() {
    console.time("Geometry Load");

    // Load Tree Binary
    const treeResponse = await fetch('./tree.bin');
    if (!treeResponse.ok) throw new Error("Failed to load tree.bin");
    const treeBuffer = await treeResponse.arrayBuffer();
    const treeMatrices = new Float32Array(treeBuffer);

    // Load Star JSON
    const starResponse = await fetch('./star.json');
    if (!starResponse.ok) throw new Error("Failed to load star.json");
    const starData = await starResponse.json();

    console.timeEnd("Geometry Load");
    return { treeMatrices, starData };
}

async function init() {
    console.log("Initializing infinite fractal tree...");

    try {
        const { treeMatrices, starData } = await loadGeometry();

        // Pass preloaded data to configs
        const treeConfig = { ...CONFIG.tree, preloadedMatrices: treeMatrices };
        const starConfig = { ...CONFIG.star, preloadedData: starData };

        tree = new FractalTree(scene, treeConfig);
        star = new FractalStar(scene, starConfig);

    } catch (e) {
        console.warn("Could not load pre-generated geometry, falling back to runtime generation.", e);
        tree = new FractalTree(scene, CONFIG.tree);
        star = new FractalStar(scene, CONFIG.star);
    }
}

init();

// Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (tree) tree.update(camera);
    if (star) star.update();

    controls.update(delta, tree ? tree.mesh : null);

    // Dynamic Fog Logic
    // "closer to a surface... the more you can't see. Like a fog."
    // "Make distant stuff de render" (fog handles this by hiding far stuff)

    if (controls.closestDistance !== undefined) {
        // Map distance to fog density.
        // Close = Dense Fog. Far = Light/No Fog?
        // Actually "Make distant stuff de render" implies we want a base fog that hides far things.
        // AND "closer... more you can't see".
        // This implies TWO fogs? Or one fog that is dense at 0 distance, AND dense at Infinity?
        // That's tricky with standard Three.js FogExp2.

        // Let's interpret "closer... can't see" as:
        // As you get very very close (collision), screen fades to white/fog color.
        // As you get far, standard fog hides the clipping plane.

        // Standard FogExp2(density): Visibility ~ 1/e^(dist * density).
        // If density is high, you see nothing.

        // We want High Density when Distance is Low.
        // We also want High Density (or just opacity) when Distance is High?
        // No, "distant stuff de render" just means normal fog behavior (things far away are foggy).
        // "Closer... can't see" means fog ALSO gets dense when near.

        // Base density 0.08 masks approx dist 50.
        const baseDensity = 0.08;
        const proximityDensity = 0.5 / (controls.closestDistance + 0.1);
        // If dist=0.1, prox=0.5/0.2 = 2.5 (Very dense).
        // If dist=10, prox=0.5/10.1 = 0.05.

        scene.fog.density = baseDensity + proximityDensity;
    }

    renderer.render(scene, camera);
}

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
