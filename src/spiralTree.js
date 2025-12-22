import * as THREE from 'three';

export class FractalTree {
    constructor(scene, params = {}) {
        this.scene = scene;
        this.params = {
            maxLevel: params.maxLevel || 3,
            height: params.height || 10,
            radius: params.radius || 4,
            ringCount: params.ringCount || 8,
            branchesPerRing: params.branchesPerRing || 6,
            ringOffset: params.ringOffset || 0,
            scaleFactor: params.scaleFactor || 0.6,
            coneColor: params.coneColor || 0x2E8B57,
            taperStart: params.taperStart || 0,
            spineWidthRatio: params.spineWidthRatio || 1.0,
            ...params
        };

        this.matrices = [];
        this.mesh = null;

        // Geometry: Base Radius 1, Height 1. Pivot at base (y=0).
        this.geometry = new THREE.ConeGeometry(1, 1, 8);
        this.geometry.translate(0, 0.5, 0);

        this.material = new THREE.MeshStandardMaterial({
            color: this.params.coneColor,
            roughness: 0.6,
            metalness: 0.1,
            flatShading: true
        });

        if (this.params.preloadedMatrices) {
            this.loadFromMatrices(this.params.preloadedMatrices);
        } else {
            this.generate();
        }
    }

    loadFromMatrices(matrixData) {
        // matrixData is a Float32Array
        const matrixCount = matrixData.length / 16;
        this.matrices = []; // We might not need to populate the array if we just set the attribute, but keep for consistency if used elsewhere.

        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, matrixCount);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Directly set the instance matrix attribute
        this.mesh.instanceMatrix.set(matrixData);
        this.mesh.instanceMatrix.needsUpdate = true;

        this.scene.add(this.mesh);
    }

    generate() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.dispose();
        }
        this.matrices = [];

        // Initial Cone Parameters (Root)
        // Position: 0,0,0
        // Rotation: Identity (Up is Y)
        // Scale: Radius, Height, Radius
        const rootPos = new THREE.Vector3(0, 0, 0);
        const rootRot = new THREE.Quaternion(); // Identity
        const rootScale = new THREE.Vector3(this.params.radius, this.params.height, this.params.radius);

        this.recursiveGeneration(rootPos, rootRot, rootScale, 0);

        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.matrices.length);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        for (let i = 0; i < this.matrices.length; i++) {
            this.mesh.setMatrixAt(i, this.matrices[i]);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
        this.scene.add(this.mesh);
    }

    // Recursive step using decomposed transforms to avoid shear
    recursiveGeneration(parentPos, parentRot, parentScale, level) {
        if (level >= this.params.maxLevel) return;

        // 1. Add Parent Itself to Matrices (Rendered with Visual Scale)
        const matrix = new THREE.Matrix4();

        // Decouple Visual Scale (Thickness) from Structural Scale (Length/Layout)
        const visualScale = parentScale.clone();
        visualScale.x *= this.params.spineWidthRatio;
        visualScale.z *= this.params.spineWidthRatio;

        matrix.compose(parentPos, parentRot, visualScale);
        this.matrices.push(matrix);

        // 2. Generate Children (Positioned relative to structural flow, but attached to visual surface)
        const currentHeight = parentScale.y;
        // Use visual radius for placement so branches attach to the thinner spine
        const currentRadius = parentScale.x * this.params.spineWidthRatio;

        const ringCount = this.params.ringCount;
        const branchesPerRing = this.params.branchesPerRing;

        // Pre-calculate up vector for rotations
        const up = new THREE.Vector3(0, 1, 0);

        for (let i = 0; i < ringCount; i++) {
            // Normalized height along the cone (0 = base, 1 = tip)
            const t = i / (ringCount - 1 || 1);

            // Skip the very top tip to avoid bunching if desired, or keep logic simple
            // if (t > 0.95) continue;

            const localY = t * currentHeight;

            // Linear taper radius
            // Optional: taperStart can keep bottom cylinder-like for a bit
            const effectiveT = Math.max(0, (t - this.params.taperStart) / (1 - this.params.taperStart));
            // Concave taper for pointier look
            const radiusAtY = currentRadius * Math.pow(1 - t, 1.2);

            const ringRotationOffset = i * this.params.ringOffset;

            for (let j = 0; j < branchesPerRing; j++) {
                const angle = (j / branchesPerRing) * Math.PI * 2 + ringRotationOffset;

                // Local Position relative to Parent Center (Base)
                const localX = Math.cos(angle) * radiusAtY;
                const localZ = Math.sin(angle) * radiusAtY;

                const localPos = new THREE.Vector3(localX, localY, localZ);

                // Transform Local Position to World Position
                const worldOffset = localPos.clone().applyQuaternion(parentRot);
                const childPos = parentPos.clone().add(worldOffset);

                // Child Rotation
                // Point outward and slightly up
                const outwardLocal = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();
                const outwardWorld = outwardLocal.clone().applyQuaternion(parentRot);

                // Orientation logic: smoothly interpolate from outward to up
                // t=0 (base) -> mostly outward
                // t=1 (tip) -> fully up
                const targetDir = new THREE.Vector3().copy(outwardWorld).lerp(new THREE.Vector3(0, 1, 0).applyQuaternion(parentRot), t).normalize();

                const childRot = new THREE.Quaternion().setFromUnitVectors(up, targetDir);

                // Child Scale
                // Smaller as we go up (t approaches 1)
                const sizeDecay = (1 - t) * 0.7 + 0.3; // Min scale 0.3 at top
                const scaleFactor = this.params.scaleFactor * sizeDecay;

                const childScale = parentScale.clone().multiplyScalar(scaleFactor);

                // Recurse
                this.recursiveGeneration(childPos, childRot, childScale, level + 1);
            }
        }
    }

    update(camera) {
        // Optional
    }

    getMatrices() {
        const matArray = new Float32Array(this.matrices.length * 16);
        for (let i = 0; i < this.matrices.length; i++) {
            this.matrices[i].toArray(matArray, i * 16);
        }
        return matArray;
    }
}
