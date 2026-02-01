/* js/nexus-widget.js - Phase 2 Draggable & Resizable */

document.addEventListener("DOMContentLoaded", function() {
    
    // --- 1. Inject Styles (CSS inside JS for Widget) ---
    const style = document.createElement('style');
    style.innerHTML = `
        /* Floating Action Button (FAB) */
        #nexus-fab {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 65px;
            height: 65px;
            background: linear-gradient(135deg, #059669, #2563eb); /* Emerald to Blue */
            border-radius: 50%;
            box-shadow: 0 10px 30px rgba(5, 150, 105, 0.5);
            cursor: grab; /* Shows hand icon */
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            transition: transform 0.2s;
            user-select: none; /* Text selection off */
            touch-action: none; /* Prevents scrolling while dragging */
        }
        
        #nexus-fab:active { cursor: grabbing; transform: scale(0.95); }
        #nexus-fab:hover { box-shadow: 0 0 25px rgba(5, 150, 105, 0.8); }

        /* The Chat Window */
        #nexus-chat-window {
            position: fixed;
            bottom: 110px;
            right: 30px;
            width: 400px;  /* ✅ Fixed: Bigger Width */
            height: 600px; /* ✅ Fixed: Bigger Height */
            background: rgba(15, 23, 42, 0.95); /* Dark Glass */
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            z-index: 99998;
            opacity: 0;
            pointer-events: none;
            transform: translateY(20px) scale(0.95);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Space Grotesk', sans-serif;
            overflow: hidden;
        }

        #nexus-chat-window.active {
            opacity: 1;
            pointer-events: auto;
            transform: translateY(0) scale(1);
        }

        /* Responsive Mobile Fix 📱 */
        @media (max-width: 768px) {
            #nexus-chat-window {
                width: 90vw;       /* 90% of screen width */
                height: 70vh;      /* 70% of screen height */
                bottom: 100px;
                right: 5vw;        /* Centered roughly */
            }
            #nexus-fab { width: 55px; height: 55px; }
        }

        /* Chat Parts */
        .chat-header {
            background: linear-gradient(90deg, #064e3b, #1e3a8a);
            padding: 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .chat-body {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 15px;
            scroll-behavior: smooth;
        }

        .chat-footer {
            padding: 15px;
            background: rgba(0,0,0,0.3);
            display: flex;
            gap: 10px;
            border-top: 1px solid rgba(255,255,255,0.05);
        }

        #nexus-input {
            flex: 1;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: white;
            padding: 12px 18px;
            border-radius: 99px;
            outline: none;
            transition: 0.3s;
        }
        #nexus-input:focus { border-color: #10b981; background: rgba(255,255,255,0.1); }

        /* Messages */
        .msg { max-width: 85%; padding: 12px 16px; border-radius: 18px; font-size: 14px; line-height: 1.5; }
        .msg.user { align-self: flex-end; background: #3b82f6; color: white; border-bottom-right-radius: 4px; }
        .msg.ai { align-self: flex-start; background: #334155; color: #e2e8f0; border-bottom-left-radius: 4px; border: 1px solid #475569; }
        .msg b { color: #34d399; font-weight: bold; }
    `;
    document.head.appendChild(style);

    // --- 2. Inject HTML Structure ---
    const widgetHTML = `
        <div id="nexus-fab">
            <svg style="width:32px; height:32px; fill:white;" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.17 6.19 21.23 11.56 21.75V21.85C11.75 21.93 11.87 21.98 11.96 22H12.03C12.12 21.98 12.24 21.93 12.43 21.85V21.75C17.8 21.23 22 17.17 22 12C22 6.48 17.52 2 12 2ZM12 4C14.21 4 16 5.79 16 8C16 10.21 14.21 12 12 12C9.79 12 8 10.21 8 8C8 5.79 9.79 4 12 4ZM12 19C9.65 19 7.42 18.29 5.56 17.12C5.9 15.68 8.71 14.5 12 14.5C15.29 14.5 18.09 15.68 18.43 17.12C16.57 18.29 14.35 19 12 19Z"/>
            </svg>
        </div>

        <div id="nexus-chat-window">
            <div class="chat-header">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:30px; height:30px; background:#10b981; border-radius:50%; display:flex; align-items:center; justify-content:center;">🧬</div>
                    <div>
                        <h3 style="margin:0; font-size:16px; color:white; font-weight:bold;">Dr. Nexus</h3>
                        <span style="font-size:11px; color:#10b981;">● Online (Llama-3 Core)</span>
                    </div>
                </div>
                <button id="close-chat" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">&times;</button>
            </div>
            
            <div class="chat-body" id="chat-body">
                <div class="msg ai">Hello! I am Dr. Nexus 🧬.<br>I can analyze DNA, visualize Proteins, or create Flashcards.<br><b>How can I help you today?</b></div>
            </div>

            <div class="chat-footer">
                <input type="text" id="nexus-input" placeholder="Type a message...">
                <button id="send-btn" style="background:#10b981; border:none; width:45px; height:45px; border-radius:50%; color:white; cursor:pointer; font-size:18px;">➤</button>
            </div>
        </div>
    `;

    const widgetContainer = document.createElement('div');
    widgetContainer.innerHTML = widgetHTML;
    document.body.appendChild(widgetContainer);

    // --- 3. LOGIC: Make it DRAGGABLE! 🖱️✋ ---
    const fab = document.getElementById('nexus-fab');
    const chatWin = document.getElementById('nexus-chat-window');
    
    makeDraggable(fab);

    // Toggle Chat
    let isDragging = false; // Prevent click if dragging
    fab.addEventListener('click', () => {
        if(!isDragging) {
            chatWin.classList.toggle('active');
            if(chatWin.classList.contains('active')) document.getElementById('nexus-input').focus();
        }
    });

    document.getElementById('close-chat').addEventListener('click', () => {
        chatWin.classList.remove('active');
    });

    // Send Logic
    document.getElementById('send-btn').addEventListener('click', sendNexusMessage);
    document.getElementById('nexus-input').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') sendNexusMessage();
    });
});

// --- DRAG LOGIC FUNCTION ---
function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    // Mouse Events
    element.onmousedown = dragMouseDown;
    // Touch Events (Mobile)
    element.ontouchstart = dragTouchStart;

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        // Calculate new position
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // Set new position
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
        element.style.bottom = "auto"; // Reset bottom/right
        element.style.right = "auto";
        
        // Flag dragging
        element.setAttribute('data-dragging', 'true');
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        // Reset flag after a short delay
        setTimeout(() => element.removeAttribute('data-dragging'), 100);
    }

    // --- Touch Support (Mobile) ---
    function dragTouchStart(e) {
        // e.preventDefault(); // Don't block scroll completely unless necessary
        const touch = e.touches[0];
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        document.ontouchend = closeDragElement;
        document.ontouchmove = elementTouchDrag;
    }

    function elementTouchDrag(e) {
        const touch = e.touches[0];
        pos1 = pos3 - touch.clientX;
        pos2 = pos4 - touch.clientY;
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
        element.style.bottom = "auto";
        element.style.right = "auto";
    }
}

// --- API CONNECT LOGIC ---
async function sendNexusMessage() {
    const input = document.getElementById('nexus-input');
    const body = document.getElementById('chat-body');
    const text = input.value.trim();
    if (!text) return;

    // User Msg
    body.innerHTML += `<div class="msg user">${text}</div>`;
    input.value = '';
    body.scrollTop = body.scrollHeight;

    // Loading
    const loadId = 'load-' + Date.now();
    body.innerHTML += `<div class="msg ai" id="${loadId}">Thinking...</div>`;
    body.scrollTop = body.scrollHeight;

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        document.getElementById(loadId).remove();
        
        if (data.reply) {
            // Bold Formatter
            let cleanText = data.reply.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            body.innerHTML += `<div class="msg ai">${cleanText}</div>`;
        } else {
            body.innerHTML += `<div class="msg ai" style="color:red">Error: No Reply</div>`;
        }
    } catch (e) {
        document.getElementById(loadId).remove();
        body.innerHTML += `<div class="msg ai" style="color:red">Connection Failed.</div>`;
    }
    body.scrollTop = body.scrollHeight;
}