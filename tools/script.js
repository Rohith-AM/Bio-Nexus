// 📖 1. The Genetic Code Dictionary (Data)
// இதுதான் நம்ம ரெஃபரன்ஸ் புக். கம்ப்யூட்டர் இதில் தேடி தான் பதில் சொல்லும்.
const codonTable = {
    'ATA':'I', 'ATC':'I', 'ATT':'I', 'ATG':'M',
    'ACA':'T', 'ACC':'T', 'ACG':'T', 'ACT':'T',
    'AAC':'N', 'AAT':'N', 'AAA':'K', 'AAG':'K',
    'AGC':'S', 'AGT':'S', 'AGA':'R', 'AGG':'R',
    'CTA':'L', 'CTC':'L', 'CTG':'L', 'CTT':'L',
    'CCA':'P', 'CCC':'P', 'CCG':'P', 'CCT':'P',
    'CAC':'H', 'CAT':'H', 'CAA':'Q', 'CAG':'Q',
    'CGA':'R', 'CGC':'R', 'CGG':'R', 'CGT':'R',
    'GTA':'V', 'GTC':'V', 'GTG':'V', 'GTT':'V',
    'GCA':'A', 'GCC':'A', 'GCG':'A', 'GCT':'A',
    'GAC':'D', 'GAT':'D', 'GAA':'E', 'GAG':'E',
    'GGA':'G', 'GGC':'G', 'GGG':'G', 'GGT':'G',
    'TCA':'S', 'TCC':'S', 'TCG':'S', 'TCT':'S',
    'TTC':'F', 'TTT':'F', 'TTA':'L', 'TTG':'L',
    'TAC':'Y', 'TAT':'Y', 'TAA':'_', 'TAG':'_', // _ = STOP
    'TGC':'C', 'TGT':'C', 'TGA':'_', 'TGG':'W',
};

// 🧠 2. The Main Manager Function (Triggered by HTML Button)
function analyzeDNA() {
    // A. Input பெறுதல்
    const rawInput = document.getElementById('dnaInput').value.toUpperCase();
    const input = rawInput.replace(/\s/g, ''); // Remove spaces

    if (input === "") {
        alert("Please enter a DNA sequence! (e.g., ATGC)");
        return;
    }

    // B. வேலைகளை பிரித்து கொடுத்தல் (Calling Helper Functions)
    const gcPercent = calculateGC(input);     // Link 1
    const rnaSeq = transcribeToRNA(input);    // Link 2
    const proteinSeq = translateToProtein(input); // Link 3 (NEW!)

    // C. முடிவுகளை திரையில் காட்டுதல் (UI Update)
    document.getElementById('lengthDisplay').innerText = input.length + " bp";
    document.getElementById('gcDisplay').innerText = gcPercent + "%";
    document.getElementById('rnaDisplay').innerText = rnaSeq; // (HTML ID update needed)
    document.getElementById('proteinDisplay').innerText = proteinSeq; // (NEW HTML ID needed)

    // Show Results Box
    document.getElementById('results').classList.remove('hidden');
}

// 👷 3. Helper Functions (வேலைக்காரர்கள்)

function calculateGC(dna) {
    let gcCount = 0;
    for (let char of dna) {
        if (char === 'G' || char === 'C') gcCount++;
    }
    return (dna.length > 0) ? ((gcCount / dna.length) * 100).toFixed(2) : 0;
}

function transcribeToRNA(dna) {
    // A->U, T->A, G->C, C->G
    let rna = "";
    for (let char of dna) {
        if (char === 'A') rna += 'U';
        else if (char === 'T') rna += 'A';
        else if (char === 'C') rna += 'G';
        else if (char === 'G') rna += 'C';
        else rna += char;
    }
    return rna;
}

function translateToProtein(dna) {
    let protein = "";
    // 3 எழுத்துக்களாக படிக்க வேண்டும் (Reading Frame)
    for (let i = 0; i < dna.length; i += 3) {
        let codon = dna.substring(i, i + 3);
        if (codon.length === 3) {
            // அகராதியில் தேடு (Look up in codonTable)
            // if undefined, put '?'
            protein += (codonTable[codon] || '?') + "-"; 
        }
    }
    return protein.slice(0, -1); // Remove last dash
}