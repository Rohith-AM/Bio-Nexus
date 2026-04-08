const fs = require('fs');

// 1. Read the REBASE file
const rawData = fs.readFileSync('Enzyme.txt', 'utf8');

// 2. Split into blocks based on blank lines
const blocks = rawData.split(/\n\s*\n/);
const enzymeDB = {};

blocks.forEach(block => {
    let name = '';
    let seq = '';
    
    // Extract Name (<1>) and Sequence (<5>)
    const lines = block.split('\n');
    lines.forEach(line => {
        if (line.startsWith('<1>')) name = line.replace('<1>', '').trim();
        if (line.startsWith('<5>')) seq = line.replace('<5>', '').trim();
    });
    
    // 3. Clean up Sequence (Remove cut sites ^ and position numbers)
    if (name && seq && seq !== '?') {
        let cleanSeq = seq.replace(/[\^\(\)\d\/\-]/g, '').toUpperCase();
        if(cleanSeq) {
            enzymeDB[name] = cleanSeq;
        }
    }
});

// 4. Export as lightweight JSON
fs.writeFileSync('rebase.json', JSON.stringify(enzymeDB, null, 2));
console.log(`Successfully extracted ${Object.keys(enzymeDB).length} enzymes! 🚀`);