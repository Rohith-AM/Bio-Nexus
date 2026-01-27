function analyzeDNA() {
    // 1. Get the raw input
    const rawInput = document.getElementById('dnaInput').value.toUpperCase();

    // 🔥 THE FIX: Remove all spaces, tabs, and newlines (Regular Expression)
    // "AT GC" will become "ATGC"
    const input = rawInput.replace(/\s/g, '');

    const resultBox = document.getElementById('results');

    // Validation: If empty, don't do anything
    if (input === "") {
        alert("Please enter a DNA sequence!");
        return;
    }

    // 2. Calculate Length (Now it ignores spaces!)
    const length = input.length;
    
    // 3. Calculate GC Content
    let gcCount = 0;
    for (let i = 0; i < length; i++) {
        if (input[i] === 'G' || input[i] === 'C') {
            gcCount++;
        }
    }
    
    // Formula
    const gcPercentage = ((gcCount / length) * 100).toFixed(2);

    // 4. Update the UI
    document.getElementById('lengthDisplay').innerText = length + " bp";
    document.getElementById('gcDisplay').innerText = gcPercentage + "%";
    
    // Guessing stability
    const typeText = document.getElementById('typeDisplay');
    if(gcPercentage > 60) {
        typeText.innerText = "🔥 High Stability (High GC)";
        typeText.className = "text-lg font-bold text-red-400";
    } else if (gcPercentage < 40) {
        typeText.innerText = "❄️ Low Stability (AT Rich)";
        typeText.className = "text-lg font-bold text-blue-400";
    } else {
        typeText.innerText = "⚖️ Balanced Stability";
        typeText.className = "text-lg font-bold text-yellow-400";
    }

    // Show results
    resultBox.classList.remove('hidden');
}