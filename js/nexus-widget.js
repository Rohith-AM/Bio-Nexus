/* js/nexus-widget.js - Dark Mode, Compact & Draggable */

document.addEventListener("DOMContentLoaded", function() {
    
    // --- 1. Inject Styles ---
    const style = document.createElement('style');
    style.innerHTML = `
        /* Floating Button (Dark Theme) */
        #nexus-fab {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 60px;
            height: 60px;
            background: #1e293b; /* Dark Slate */
            border: 2px solid #10b981; /* Emerald Border */
            border-radius: 50%;
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
            cursor: grab;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            transition: all 0.3s ease;
        }
        
        #nexus-fab:hover { 
            box-shadow: 0 0 30px rgba(16, 185, 129, 0.5); 
            transform: scale(1.05);
        }
        #nexus-fab:active { cursor: grabbing; transform: scale(0.95); }

        /* The Chat Window (Compact & Safe) */
        #nexus-chat-window {
            position: fixed;
            bottom: 100px; /* Safe distance from bottom */
            right: 30px;
            width: 380px;  /* Compact Width */
            height: 500px; /* Safe Height */
            max-height: 70vh; /* 🔥 CRITICAL FIX: Never exceeds 70% of screen height */
            background: rgba(15, 23, 42, 0.98); /* Deep Dark Blue */
            backdrop-filter: blur(10px);
            border: 1px solid rgba(16, 185, 129, 0.2);
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
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

        /* Mobile Adjustments 📱 */
        @media (max-width: 768px) {
            #nexus-chat-window {
                width: 90vw;
                height: 60vh;
                bottom: 100px;
                right: 5vw;
            }
        }

        /* Header */
        .chat-header {
            background: #0f172a;
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        
        /* Body */
        .chat-body {
            flex: 1;
            padding: 15px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
            background: #020617; /* Very Dark */
        }

        /* Footer */
        .chat-footer {
            padding: 12px;
            background: #0f172a;
            display: flex;
            gap: 8px;
            border-top: 1px solid rgba(255,255,255,0.05);
        }

        /* Input */
        #nexus-input {
            flex: 1;
            background: #1e293b;
            border: 1px solid #334155;
            color: white;
            padding: 10px 15px;
            border-radius: 99px;
            outline: none;
            font-size: 14px;
        }
        #nexus-input:focus { border-color: #10b981; }

        /* Bubbles */
        .msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.4; }
        .msg.user { align-self: flex-end; background: #10b981; color: #022c22; border-bottom-right-radius: 2px; font-weight: 500; }
        .msg.ai { align-self: flex-start; background: #1e293b; color: #e2e8f0; border-bottom-left-radius: 2px; border: 1px solid #334155; }
        .msg b { color: #34d399; }
    `;
    document.head.appendChild(style);

    // --- 2. Inject HTML Structure (Updated Icons) ---
    const widgetHTML = `
        <div id="nexus-fab">
            <span style="font-size: 28px;">🤖</span>
        </div>

        <div id="nexus-chat-window">
            <div class="chat-header">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:28px; height:28px; background:#10b981; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px;">⚡</div>
                    <div>
                        <h3 style="margin:0; font-size:15px; color:white; font-weight:bold;">Dr. Nexus</h3>
                        <span style="font-size:10px; color:#10b981;">● Online</span>
                    </div>
                </div>
                <button id="close-chat" style="background:none; border:none; color:#94a3b8; font-size:20px; cursor:pointer;">&times;</button>
            </div>
            
            <div class="chat-body" id="chat-body">
                <div class="msg ai">Hello! I am Dr. Nexus.<br>I am ready to assist with your biology research.</div>
            </div>

            <div class="chat-footer">
                <input type="text" id="nexus-input" placeholder="Type here...">
                <button id="send-btn" style="background:#10b981; border:none; width:40px; height:40px; border-radius:50%; color:white; cursor:pointer; font-weight:bold;">➤</button>
            </div>
        </div>
    `;

    const widgetContainer = document.createElement('div');
    widgetContainer.innerHTML = widgetHTML;
    document.body.appendChild(widgetContainer);

    // --- 3. DRAG LOGIC ---
    const fab = document.getElementById('nexus-fab');
    const chatWin = document.getElementById('nexus-chat-window');
    
    makeDraggable(fab);

    let isDragging = false;
    fab.addEventListener('click', () => {
        if(!fab.getAttribute('data-dragging')) {
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

// Drag Function (Standard)
function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    element.onmousedown = dragMouseDown;
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
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
        element.style.bottom = "auto";
        element.style.right = "auto";
        element.setAttribute('data-dragging', 'true');
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        setTimeout(() => element.removeAttribute('data-dragging'), 100);
    }

    function dragTouchStart(e) {
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
        element.setAttribute('data-dragging', 'true');
    }
}

// API Logic (Same as before)
async function sendNexusMessage() {
    const input = document.getElementById('nexus-input');
    const body = document.getElementById('chat-body');
    const text = input.value.trim();
    if (!text) return;

    body.innerHTML += `<div class="msg user">${text}</div>`;
    input.value = '';
    body.scrollTop = body.scrollHeight;

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
            let cleanText = data.reply.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            body.innerHTML += `<div class="msg ai">${cleanText}</div>`;
        } else {
            body.innerHTML += `<div class="msg ai" style="color:red">Error: No Reply</div>`;
        }
    } catch (e) {
        document.getElementById(loadId).remove();
        body.innerHTML += `<div class="msg ai" style="color:red">Offline.</div>`;
    }
    body.scrollTop = body.scrollHeight;
}