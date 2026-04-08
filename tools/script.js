// ==========================================
// 📖 1. THE UNIVERSAL GENETIC CODE (RNA-BASED)
// ==========================================
const codonTable = {
    'AUA':'I', 'AUC':'I', 'AUU':'I', 'AUG':'M', // M = Start
    'ACA':'T', 'ACC':'T', 'ACG':'T', 'ACU':'T',
    'AAC':'N', 'AAU':'N', 'AAA':'K', 'AAG':'K',
    'AGC':'S', 'AGU':'S', 'AGA':'R', 'AGG':'R',
    'CUA':'L', 'CUC':'L', 'CUG':'L', 'CUU':'L',
    'CCA':'P', 'CCC':'P', 'CCG':'P', 'CCU':'P',
    'CAC':'H', 'CAU':'H', 'CAA':'Q', 'CAG':'Q',
    'CGA':'R', 'CGC':'R', 'CGG':'R', 'CGU':'R',
    'GUA':'V', 'GUC':'V', 'GUG':'V', 'GUU':'V',
    'GCA':'A', 'GCC':'A', 'GCG':'A', 'GCU':'A',
    'GAC':'D', 'GAU':'D', 'GAA':'E', 'GAG':'E',
    'GGA':'G', 'GGC':'G', 'GGG':'G', 'GGU':'G',
    'UCA':'S', 'UCC':'S', 'UCG':'S', 'UCU':'S',
    'UUC':'F', 'UUU':'F', 'UUA':'L', 'UUG':'L',
    'UAC':'Y', 'UAU':'Y', 'UAA':'_', 'UAG':'_', // _ = Stop
    'UGC':'C', 'UGU':'C', 'UGA':'_', 'UGG':'W',
};

// ==========================================
// 🧠 2. THE MAIN MANAGER FUNCTION
// ==========================================
function analyzeDNA() {
    // A. Clean Input
    const rawInput = document.getElementById('dnaInput').value.toUpperCase();
    const input = rawInput.replace(/[^ATGC]/g, ''); // Strips out spaces/numbers safely

    if (input === "") {
        alert("Commander, please enter a valid DNA sequence! (e.g., ATGC)");
        return;
    }

    // B. Logic Calls (Central Dogma Flow)
    const gcPercent = calculateGC(input);
    const rnaSeq = transcribeToRNA(input);       // DNA -> mRNA
    const proteinSeq = translateToProtein(rnaSeq); // mRNA -> Protein

    // C. UI Updates
    document.getElementById('lengthDisplay').innerText = input.length + " bp";
    document.getElementById('gcDisplay').innerText = gcPercent + "%";
    
    // 🔥 STABILITY LOGIC
    const typeText = document.getElementById('typeDisplay');
    if(gcPercent > 60) {
        typeText.innerText = "🔥 High Stability (High GC)";
        typeText.className = "text-lg font-bold text-red-400";
    } else if (gcPercent < 40) {
        typeText.innerText = "❄️ Low Stability (AT Rich)";
        typeText.className = "text-lg font-bold text-blue-400";
    } else {
        typeText.innerText = "⚖️ Balanced Stability";
        typeText.className = "text-lg font-bold text-yellow-400";
    }

    // RNA & Protein Updates
    document.getElementById('rnaResult').innerText = rnaSeq; 
    document.getElementById('proteinDisplay').innerText = proteinSeq;

    // Show Results Panels
    document.getElementById('results').classList.remove('hidden');
    document.getElementById('rnaContainer').classList.remove('hidden');
    document.getElementById('proteinContainer').classList.remove('hidden');
}

// ==========================================
// 👷 3. HELPER FUNCTIONS
// ==========================================

function calculateGC(dna) {
    let gcCount = (dna.match(/[GC]/g) || []).length;
    return (dna.length > 0) ? ((gcCount / dna.length) * 100).toFixed(2) : 0;
}

function transcribeToRNA(dna) {
    // Assuming input is Coding Strand (5' -> 3'). Just replace T with U.
    return dna.replace(/T/g, 'U');
}

function translateToProtein(rna) {
    let protein = "";
    // Reading Frame (3 letters = 1 codon)
    for (let i = 0; i < rna.length - 2; i += 3) {
        let codon = rna.substring(i, i + 3);
        protein += (codonTable[codon] || '?') + "-"; 
    }
    return protein.slice(0, -1); // Remove the trailing dash
}