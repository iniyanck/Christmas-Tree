import * as THREE from 'three';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FractalTree } from '../src/spiralTree.js';
import { FractalStar } from '../src/fractalStar.js';
import { CONFIG } from '../src/config.js';

// Mock Scene
const scene = new THREE.Scene();

console.log("Generating Tree Geometry...");
const tree = new FractalTree(scene, CONFIG.tree);

console.log("Generating Star Geometry...");
const star = new FractalStar(scene, CONFIG.star);

// Ensure matrices are up to date
scene.updateMatrixWorld(true);

// Extract Data
console.log("Extracting matrices...");
const treeMatrixArray = tree.getMatrices(); // Float32Array
const starData = star.getGeometryData();

// Ensure public dir exists
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

// 1. Write Tree Data (Binary)
// treeMatrixArray is a Float32Array. We can write its buffer directly.
const treeBuffer = Buffer.from(treeMatrixArray.buffer);
const treePath = path.join(publicDir, 'tree.bin');
console.log(`Writing Tree Binary to ${treePath} (${treeBuffer.length} bytes)...`);
fs.writeFileSync(treePath, treeBuffer);

// 2. Write Star Data (JSON)
// Star is likely small enough for JSON
const starDataJSON = {
    position: Array.from(starData.position.array),
    normal: starData.normal ? Array.from(starData.normal.array) : [],
    color: starData.color ? Array.from(starData.color.array) : [],
    indices: starData.index ? Array.from(starData.index.array) : null
};

const starPath = path.join(publicDir, 'star.json');
console.log(`Writing Star JSON to ${starPath}...`);
fs.writeFileSync(starPath, JSON.stringify(starDataJSON));

console.log("Done!");
