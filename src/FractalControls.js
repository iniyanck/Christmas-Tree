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
        this.baseSpeed = 10.0; // Base units per second at distance 1
        this.minSpeed = 0.0001; // Minimum speed to avoid stalling completely (or 0?)
        this.collisionPadding = 0.5; // "Surface" distance
        this.raycaster = new THREE.Raycaster();

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

    update(delta, treeMesh) {
        if (!this.controls.isLocked) return;

        // 1. Determine Move Direction
        const direction = new THREE.Vector3();
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();

        // Extract camera directions (projected to horizontal plane if walking, but we are flying)
        // For flying, we just use camera local vectors
        this.camera.getWorldDirection(forward);
        right.crossVectors(forward, this.camera.up);

        if (this.moveForward) direction.add(forward);
        if (this.moveBackward) direction.sub(forward);
        if (this.moveRight) direction.add(right);
        if (this.moveLeft) direction.sub(right);
        if (this.moveUp) direction.add(this.camera.up);
        if (this.moveDown) direction.sub(this.camera.up);

        direction.normalize();

        // 2. Calculate Distance to Geometry (Hyperbolic Logic)
        let distance = 10.0; // Default large distance if nothing found

        if (treeMesh) {
            // Raycast in the direction of movement + omni-check?
            // To be safe, we should check the distance to the NEAREST surface.
            // Casting one ray forward isn't enough (we might strafe into a wall).
            // A perfect solution requires SDF. 
            // Approx solution: Raycast in movement direction and maybe 6 cardinal directions?
            // Doing 1 raycast is cheapest. Let's try casting in the move direction.

            // Actually, if we are "backing up" we still want to be slow if we are close to something behind us.
            // Let's just cast a ray in the move direction for now to prevent collision.
            // AND cast a ray forward to modulate "zoom" speed if just moving forward.

            // Better approximation:
            // Just use the distance from the movement ray.

            this.raycaster.set(this.camera.position, direction);
            // Limit far to optimize?
            this.raycaster.far = 100;
            const intersects = this.raycaster.intersectObject(treeMesh);

            if (intersects.length > 0) {
                distance = intersects[0].distance;
            } else {
                // If no hit in movement direction, maybe we are safe?
                // Or maybe we are close to a wall on the side?
                // Let's assume infinite distance if no hit.
                distance = 100;
            }
        }

        // 3. Modulate Speed
        // "Hyperbolic": Speed proportional to distance.
        // v = k * d
        // As d -> 0, v -> 0.

        const speed = Math.max(this.minSpeed, distance * 1.0); // Factor 1.0 means at 1 unit dist, 1 unit/sec

        // Apply movement
        if (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight || this.moveUp || this.moveDown) {
            // this.controls.moveForward() etc work on local flattening, but we want full 3D fly.
            // PointerLockControls doesn't natively support full 3D fly with "moveForward". It projects to XZ.
            // So we manually move the camera.

            const moveVec = direction.multiplyScalar(speed * delta);
            this.camera.position.add(moveVec);
        }
    }
}
