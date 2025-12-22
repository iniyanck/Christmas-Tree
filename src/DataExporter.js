export class DataExporter {
    constructor() {
        this.data = {
            tree: null,
            star: null
        };
    }

    setTreeData(matrices) {
        // matrices is a Float32Array
        this.data.tree = Array.from(matrices);
    }

    setStarData(attributes) {
        // attributes object containing position, normal, color arrays
        this.data.star = {
            position: Array.from(attributes.position.array),
            normal: Array.from(attributes.normal.array),
            color: Array.from(attributes.color.array),
            indices: attributes.index ? Array.from(attributes.index.array) : null
        };
    }

    export(filename = 'geometry-data.json') {
        const json = JSON.stringify(this.data);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
