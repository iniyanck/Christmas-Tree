import * as THREE from 'three';

export const CONFIG = {
    scene: {
        backgroundColor: 0x000510,
        fogColor: 0x000510,
        fogDensity: 0.02,
        ambientLightColor: 0x404040,
        ambientLightIntensity: 2,
    },
    tree: {
        maxLevel: 4,
        height: 30,
        radius: 2.5,
        ringCount: 12, // Replaces spiralTurns
        branchesPerRing: 9, // Replaces branchesPerTurn
        scaleFactor: 0.5,
        coneColor: 0x2E8B57,
        ringOffset: Math.PI / 5, // Rotation offset per ring for natural look
        taperStart: 0.1, // Start tapering earlier or later (0-1)
    },
    star: {
        positionY: 12,
        radius: 0.8,
        color1: 0xffd700,
        emissive1: 0xffaa00,
        color2: 0xffffee,
        emissive2: 0xffffff,
    }
};
