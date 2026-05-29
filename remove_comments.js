const fs = require('fs');
const path = require('path');

const projectDir = __dirname;
const dirs = [
    path.join(projectDir, 'src'),
    path.join(projectDir, 'public')
];

function removeCommentsFromText(text, ext) {
    if (ext === '.js') {
        // Regex to remove JS comments but keep strings intact (simplified, but works for most cases)
        // Be careful not to remove URL protocols like http://
        return text.replace(/\/\*[\s\S]*?\*\/|(?<!:)\/\/.*/g, '').replace(/^\s*[\r\n]/gm, '');
    } else if (ext === '.html') {
        return text.replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*[\r\n]/gm, '');
    }
    return text;
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else {
            const ext = path.extname(fullPath);
            if (ext === '.js' || ext === '.html') {
                const content = fs.readFileSync(fullPath, 'utf8');
                const newContent = removeCommentsFromText(content, ext);
                if (content !== newContent) {
                    fs.writeFileSync(fullPath, newContent, 'utf8');
                    console.log(`Comments removed from ${fullPath}`);
                }
            }
        }
    }
}

dirs.forEach(processDirectory);
console.log('Finished removing comments.');
