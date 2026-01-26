function analyzeDNA() {
    // 1. Get the input text & convert to Uppercase
    const input = document.getElementById('dnaInput').value.toUpperCase();
    const resultBox = document.getElementById('results');

    // Validation: If empty, don't do anything
    if (input.trim() === "") {
        alert("Please enter a DNA sequence!");
        return;
    }

    // 2. Calculate Length
    const length = input.length;
    
    // 3. Calculate GC Content (Biology Logic)
    // G (Guanine) + C (Cytosine) count
    let gcCount = 0;
    for (let i = 0; i < length; i++) {
        if (input[i] === 'G' || input[i] === 'C') {
            gcCount++;
        }
    }
    // Formula: (GC Count / Total Length) * 100
    const gcPercentage = ((gcCount / length) * 100).toFixed(2); // toFixed(2) keeps 2 decimals

    // 4. Update the UI
    document.getElementById('lengthDisplay').innerText = length + " bp";
    document.getElementById('gcDisplay').innerText = gcPercentage + "%";
    
    // Fun Logic: Guessing stability based on GC content
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
