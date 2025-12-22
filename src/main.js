import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FractalTree } from './spiralTree.js';
import { FractalStar } from './fractalStar.js';
import { CONFIG } from './config.js';

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.scene.backgroundColor);
scene.fog = new THREE.FogExp2(CONFIG.scene.fogColor, CONFIG.scene.fogDensity);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 1000);
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
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 1.5;
controls.minDistance = 0.1; // Allow close zoom

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

async function init() {
    console.log("Initializing infinite fractal tree...");
    tree = new FractalTree(scene, CONFIG.tree);
    star = new FractalStar(scene, CONFIG.star);
}

init();

// Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    if (tree) tree.update(camera);
    if (star) star.update();

    controls.update();
    renderer.render(scene, camera);
}

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
