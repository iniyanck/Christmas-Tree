import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export class FractalControls {
    constructor(camera, domElement, scene) {
        this.camera = camera;
        this.scene = scene;
        this.domElement = domElement;

        // Base controls
        this.controls = new PointerLockControls(camera, domElement);

        // Input state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.moveUp = false;
        this.moveDown = false;

        // Physics/Hyperbolic params
        this.baseSpeed = 5.0; // Reduced base speed
        this.minSpeed = 0.001;
        this.collisionPadding = 0.5;
        this.raycaster = new THREE.Raycaster();

        // Smoothing/Inertia
        this.velocity = new THREE.Vector3();
        this.friction = 5.0; // Higher = faster stop
        this.acceleration = 40.0; // Higher = faster start

        // State for fog
        this.closestDistance = 100.0;

        // Setup listeners
        this.setupEventListeners();

        // Setup click to lock
        this.setupPointerLock();
    }

    setupPointerLock() {
        this.domElement.addEventListener('click', () => {
            if (!this.controls.isLocked) {
                this.controls.lock();
            }
        });
    }

    setupEventListeners() {
        const onKeyDown = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW': this.moveForward = true; break;
                case 'ArrowLeft':
                case 'KeyA': this.moveLeft = true; break;
                case 'ArrowDown':
                case 'KeyS': this.moveBackward = true; break;
                case 'ArrowRight':
                case 'KeyD': this.moveRight = true; break;
                case 'Space': this.moveUp = true; break;
                case 'ShiftLeft':
                case 'ShiftRight': this.moveDown = true; break;
            }
        };

        const onKeyUp = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW': this.moveForward = false; break;
                case 'ArrowLeft':
                case 'KeyA': this.moveLeft = false; break;
                case 'ArrowDown':
                case 'KeyS': this.moveBackward = false; break;
                case 'ArrowRight':
                case 'KeyD': this.moveRight = false; break;
                case 'Space': this.moveUp = false; break;
                case 'ShiftLeft':
                case 'ShiftRight': this.moveDown = false; break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
    }

    getDistanceToSurface(treeMesh) {
        if (!treeMesh) return 100.0;

        // Optimization: Throttled, Single-Ray Check
        const now = performance.now();
        if (this.lastRaycastTime && (now - this.lastRaycastTime < 100)) {
            // Return cached distance if less than 100ms has passed
            return this.closestDistance;
        }
        this.lastRaycastTime = now;

        // Perform only ONE raycast in the forward direction
        // This is sufficient for collision avoidance (don't fly into things)
        // and "fog when close" (usually when you look at it).
        // Side-collisions won't trigger fog, but that's an acceptable compromise for performance.

        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);

        this.raycaster.set(this.camera.position, forward);
        this.raycaster.far = 50; // Use a shorter max distance

        const intersects = this.raycaster.intersectObject(treeMesh);
        if (intersects.length > 0) {
            return intersects[0].distance;
        }

        return 100.0;
    }

    update(delta, treeMesh) {
        if (!this.controls.isLocked) return;

        // 1. Calculate Closest Surface (for Fog and Global Speed scaling)
        this.closestDistance = this.getDistanceToSurface(treeMesh);

        // 2. Determine Input Direction
        const inputDir = new THREE.Vector3();
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();

        this.camera.getWorldDirection(forward);
        right.crossVectors(forward, this.camera.up);

        if (this.moveForward) inputDir.add(forward);
        if (this.moveBackward) inputDir.sub(forward);
        if (this.moveRight) inputDir.add(right);
        if (this.moveLeft) inputDir.sub(right);
        if (this.moveUp) inputDir.add(this.camera.up);
        if (this.moveDown) inputDir.sub(this.camera.up);

        inputDir.normalize();

        // 3. Calculate Target Speed based on distance
        // Slower when far away (user request), "slower especially when you're away"
        // Wait, "slower when away from the tree" usually means "slower when in empty space".
        // And "closer to surface... you can't see".
        // Usually, in fractal zooms, you want to move SLOWER when CLOSER to avoid crashing.
        // User asked: "slower (especially when you're away from the tree, or moving away from it)."
        // Maybe they feel it's too fast in the void? 
        // Let's implement a capped speed that relates to distance.
        // If distance is large, speed should NOT be huge. 
        // Let's damp the "hyperbolic" scaling.

        // Standard fractal zoom: Speed ~ Distance.
        // User Request: "slower... away from tree".
        // Interpretation: Don't let speed explode when distance is high. Cap it.

        let speedMultiplier = Math.max(this.minSpeed, this.closestDistance * 0.4);
        // Capped at a reasonable max to prevent zooming off into infinity too fast
        speedMultiplier = Math.min(speedMultiplier, 20.0);

        // 4. Apply Physics (Inertia)
        // Target velocity
        const targetVelocity = inputDir.clone().multiplyScalar(speedMultiplier);

        // Acceleration / Friction
        // If inputting, accelerate towards target.
        // If not inputting, decelerate to 0 (friction).

        const frameDecay = Math.exp(-this.friction * delta);
        // Simply lerp velocity towards targetVelocity?
        // Or separate accel/decel?
        // Let's use simple damped spring-like approach

        // v = v + (target - v) * (1 - exp(-k * dt))
        // k varies if we are accelerating or braking?
        // Let's use constant damping for smoothness.

        const smoothFactor = 1.0 - Math.exp(-this.friction * delta);
        this.velocity.lerp(targetVelocity, smoothFactor);

        // 5. Apply Movement
        if (this.velocity.lengthSq() > 0.000001) {
            const moveVec = this.velocity.clone().multiplyScalar(delta * this.acceleration);
            // Wait, velocity is already units/sec.
            // this.velocity stores desired "speed".
            // So move = velocity * delta.

            // Correction:
            // velocity is in units/sec.
            // lerp updates velocity.
            // position += velocity * delta.

            this.camera.position.add(this.velocity.clone().multiplyScalar(delta));
        }
    }
}
