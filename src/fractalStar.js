import * as THREE from 'three';

export class FractalStar {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.maxLevel = options.maxLevel || 3;
        this.radius = options.radius || 1.2;

        // Handle position from config (positionY) or Vector3
        if (options.position) {
            this.position = options.position;
        } else if (options.positionY !== undefined) {
            this.position = new THREE.Vector3(0, options.positionY, 0);
        } else {
            this.position = new THREE.Vector3(0, 12, 0);
        }

        this.group = new THREE.Group();
        this.group.position.copy(this.position);
        this.scene.add(this.group);

        const color1 = options.color1 || 0xffd700;
        const emissive1 = options.emissive1 || 0xffaa00;
        const color2 = options.color2 || 0xffffee;
        const emissive2 = options.emissive2 || 0xffffff;

        this.materials = [
            new THREE.MeshStandardMaterial({
                color: color1,
                emissive: emissive1,
                emissiveIntensity: 0.5,
                roughness: 0.2,
                metalness: 1.0,
                vertexColors: true
            }),
            new THREE.MeshStandardMaterial({
                color: color2,
                emissive: emissive2,
                emissiveIntensity: 0.8,
                roughness: 0.3,
                metalness: 0.8
            })
        ];

        if (options.preloadedData) {
            this.loadFromData(options.preloadedData);
        } else {
            this.generate();
        }
    }

    loadFromData(data) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data.position), 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(data.normal), 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(data.color), 3));
        if (data.indices) {
            geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(data.indices), 1));
        }

        // Use a material that supports vertex colors
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.3,
            metalness: 0.9,
            emissive: 0xffaa00,
            emissiveIntensity: 0.2
        });

        const mesh = new THREE.Mesh(geometry, material);
        this.group.add(mesh);
    }

    generate() {
        this.generateSpikeBall(this.group, 0, this.radius);
    }

    generateSpikeBall(parentObject, level, radius) {
        if (level >= this.maxLevel) return;

        // Core
        const coreGeo = new THREE.IcosahedronGeometry(radius * 0.3, 0);
        const material = this.materials[Math.min(level, this.materials.length - 1)];
        const core = new THREE.Mesh(coreGeo, material);
        parentObject.add(core);

        // Directions for spikes (6 axes)
        const directions = [
            new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
        ];

        // Also add 8 diagonals for a denser star if level 0
        if (level === 0) {
            const d = 0.577; // 1/sqrt(3)
            directions.push(
                new THREE.Vector3(d, d, d), new THREE.Vector3(-d, d, d),
                new THREE.Vector3(d, -d, d), new THREE.Vector3(-d, -d, d),
                new THREE.Vector3(d, d, -d), new THREE.Vector3(-d, d, -d),
                new THREE.Vector3(d, -d, -d), new THREE.Vector3(-d, -d, -d)
            );
        }

        directions.forEach(dir => {
            const spikeLength = radius * 1.0;
            const spikeGeo = new THREE.ConeGeometry(radius * 0.1, spikeLength, 8);
            spikeGeo.translate(0, spikeLength / 2, 0); // Pivot at base

            const spikeMesh = new THREE.Mesh(spikeGeo, material);

            // Orient spike to point in 'dir' direction
            const axis = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, dir);
            spikeMesh.setRotationFromQuaternion(quaternion);

            core.add(spikeMesh);

            // Recursion at tip of spike
            const tipPos = dir.clone().multiplyScalar(spikeLength);

            if (level < this.maxLevel - 1) {
                const tipContainer = new THREE.Group();
                tipContainer.position.copy(tipPos);

                // Inherit orientation? Or just align to the spike?
                // For a fractal star, maybe align to the spike direction
                tipContainer.setRotationFromQuaternion(quaternion);

                core.add(tipContainer);

                this.generateSpikeBall(tipContainer, level + 1, radius * 0.4);
            }
        });
    }

    update() {
        this.group.rotation.y -= 0.01;
        this.group.rotation.z += 0.005;

        const s = 1 + Math.sin(Date.now() * 0.003) * 0.1;
        this.group.scale.set(s, s, s);
    }

    getGeometryData() {
        // We need to merge all geometries in the group into one
        let geometries = [];
        this.group.traverse((child) => {
            if (child.isMesh) {
                const geometry = child.geometry.clone();
                // Apply child's world matrix relative to the group
                // Note: The group itself has a transform, but we want the geometry
                // to be relative to the group's origin, so that this.group can still be transformed.
                // However, traverse visits children. We need their matrix relative to this.group.
                // Since simpler approach is:
                // 1. Force update matrix world of group
                // 2. For each mesh, use its world matrix, but multiply by inverse of group world matrix.

                child.updateMatrixWorld();
                // We actually want the matrix relative to this.group.
                // matrixWorld of child = matrixWorld of group * matrixRelative
                // => matrixRelative = inverse(group.matrixWorld) * child.matrixWorld

                const relativeMatrix = new THREE.Matrix4().copy(this.group.matrixWorld).invert().multiply(child.matrixWorld);
                geometry.applyMatrix4(relativeMatrix);

                // Ensure attributes exist and are compatible
                // Create color attribute if missing (using material color)
                if (!geometry.attributes.color) {
                    const count = geometry.attributes.position.count;
                    const colors = new Float32Array(count * 3);
                    const color = child.material.color;
                    for (let i = 0; i < count; i++) {
                        colors[i * 3] = color.r;
                        colors[i * 3 + 1] = color.g;
                        colors[i * 3 + 2] = color.b;
                    }
                    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                }

                geometries.push(geometry);
            }
        });

        // Use BufferGeometryUtils to merge if available, or do manual merge?
        // Since we don't have BufferGeometryUtils imported, let's assume valid generic merge
        // Wait, standard three.js usually requires explicit import for mergeBufferGeometries.
        // It's safer to just return the array of attributes if we can't merge easily, 
        // OR import BufferGeometryUtils.
        // Let's try to do a manual merge of positions/normals/colors since these are standard.

        return this.manualMerge(geometries);
    }

    manualMerge(geometries) {
        let totalVertices = 0;
        let totalIndices = 0;

        geometries.forEach(g => {
            totalVertices += g.attributes.position.count;
            if (g.index) totalIndices += g.index.count;
        });

        const positions = new Float32Array(totalVertices * 3);
        const normals = new Float32Array(totalVertices * 3);
        const colors = new Float32Array(totalVertices * 3);
        const indices = totalIndices > 0 ? new Uint32Array(totalIndices) : null;

        let vOffset = 0;
        let iOffset = 0;

        geometries.forEach(g => {
            const pos = g.attributes.position;
            const norm = g.attributes.normal;
            const col = g.attributes.color;
            const ind = g.index;

            positions.set(pos.array, vOffset * 3);
            if (norm) normals.set(norm.array, vOffset * 3);
            if (col) colors.set(col.array, vOffset * 3);

            if (ind && indices) {
                for (let i = 0; i < ind.count; i++) {
                    indices[iOffset + i] = ind.array[i] + vOffset;
                }
                iOffset += ind.count;
            }

            vOffset += pos.count;
        });

        return {
            position: new THREE.BufferAttribute(positions, 3),
            normal: new THREE.BufferAttribute(normals, 3),
            color: new THREE.BufferAttribute(colors, 3),
            index: indices ? new THREE.BufferAttribute(indices, 1) : null
        };
    }
}
