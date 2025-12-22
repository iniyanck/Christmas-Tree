import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'spiralTree.js');

try {
    if (fs.existsSync(filePath)) {
        console.log("File exists at:", filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        console.log("--- START CONTENT ---");
        console.log(content);
        console.log("--- END CONTENT ---");
    } else {
        console.log("File DOES NOT exist at:", filePath);
        // List directory to be sure
        console.log("Directory listing of src:");
        const srcDir = path.join(process.cwd(), 'src');
        if (fs.existsSync(srcDir)) {
            console.log(fs.readdirSync(srcDir));
        } else {
            console.log("src directory missing!");
        }
    }
} catch (e) {
    console.error("Error:", e);
}
