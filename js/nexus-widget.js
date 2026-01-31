document.addEventListener("DOMContentLoaded", function() {
    // 1. Inject CSS for the Floating Widget
    const style = document.createElement('style');
    style.innerHTML = `
        /* Floating Button */
        #nexus-fab {
            position: fixed;
            bottom: 25px;
            right: 25px;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #10b981, #3b82f6);
            border-radius: 50%;
            box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            animation: pulse-glow 3s infinite;
        }
        #nexus-fab:hover { transform: scale(1.1) rotate(5deg); }
        
        @keyframes pulse-glow {
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        /* The SVG Icon */
        .nexus-icon { width: 32px; height: 32px; fill: white; }

        /* Chat Window (Hidden by default) */
        #nexus-chat-window {
            position: fixed;
            bottom: 100px;
            right: 25px;
            width: 350px;
            height: 500px;
            background: #0f172a; /* Dark Blue Slate */
            border: 1px solid #334155;
            border-radius: 20px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
            z-index: 9998;
            opacity: 0;
            pointer-events: none;
            transform: translateY(20px) scale(0.95);
            transition: all 0.3s ease;
            font-family: 'Space Grotesk', sans-serif;
            overflow: hidden;
        }

        #nexus-chat-window.active {
            opacity: 1;
            pointer-events: auto;
            transform: translateY(0) scale(1);
        }

        /* Header */
        .chat-header {
            background: linear-gradient(to right, #1e293b, #0f172a);
            padding: 15px;
            border-bottom: 1px solid #334155;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        /* Messages Area */
        .chat-body {
            flex-grow: 1;
            padding: 15px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
            scrollbar-width: thin;
            scrollbar-color: #334155 #0f172a;
        }

        /* Input Area */
        .chat-footer {
            padding: 15px;
            background: #1e293b;
            border-top: 1px solid #334155;
            display: flex;
            gap: 10px;
        }

        #nexus-input {
            flex-grow: 1;
            background: #0f172a;
            border: 1px solid #334155;
            color: white;
            padding: 10px 15px;
            border-radius: 99px;
            outline: none;
            font-size: 14px;
        }
        #nexus-input:focus { border-color: #10b981; }

        /* Bubbles */
        .msg { max-width: 85%; padding: 10px 15px; font-size: 14px; line-height: 1.5; }
        .msg.user { align-self: flex-end; background: #3b82f6; color: white; border-radius: 15px 15px 2px 15px; }
        .msg.ai { align-self: flex-start; background: #334155; color: #e2e8f0; border-radius: 15px 15px 15px 2px; border: 1px solid #475569; }
        
        /* Markdown Bold */
        .msg b { color: #34d399; font-weight: 700; }
    `;
    document.head.appendChild(style);

    // 2. Inject HTML Structure
    const widgetHTML = `
        <div id="nexus-fab" onclick="toggleChat()">
            <svg class="nexus-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2ZM12 4.5L19.5 8.25V15.75L12 19.5L4.5 15.75V8.25L12 4.5Z" opacity="0.5"/>
                <path d="M12 6L16 8V12L12 14L8 12V8L12 6Z" fill="white"/>
                <circle cx="12" cy="10" r="1.5" fill="#0f172a"/>
            </svg>
        </div>

        <div id="nexus-chat-window">
            <div class="chat-header">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:20px;">🧬</span>
                    <div>
                        <h3 style="margin:0; font-size:16px; color:white; font-weight:bold;">Dr. Nexus</h3>
                        <span style="font-size:10px; color:#10b981;">● Online</span>
                    </div>
                </div>
                <button onclick="toggleChat()" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:20px;">×</button>
            </div>
            
            <div class="chat-body" id="chat-body">
                <div class="msg ai">Hello Commander! I am Dr. Nexus. How can I assist with your research today?</div>
            </div>

            <div class="chat-footer">
                <input type="text" id="nexus-input" placeholder="Ask anything..." onkeypress="handleEnter(event)">
                <button onclick="sendNexusMessage()" style="background:#10b981; border:none; width:40px; height:40px; border-radius:50%; color:white; cursor:pointer;">➤</button>
            </div>
        </div>
    `;
    
    // Append to Body
    const div = document.createElement('div');
    div.innerHTML = widgetHTML;
    document.body.appendChild(div);
});

// 3. Logic Functions
function toggleChat() {
    const win = document.getElementById('nexus-chat-window');
    win.classList.toggle('active');
    if(win.classList.contains('active')) {
        document.getElementById('nexus-input').focus();
    }
}

function handleEnter(e) {
    if (e.key === 'Enter') sendNexusMessage();
}

async function sendNexusMessage() {
    const input = document.getElementById('nexus-input');
    const body = document.getElementById('chat-body');
    const text = input.value.trim();

    if (!text) return;

    // Add User Message
    body.innerHTML += `<div class="msg user">${text}</div>`;
    input.value = '';
    body.scrollTop = body.scrollHeight;

    // Add Loading
    const loadingId = 'loading-' + Date.now();
    body.innerHTML += `<div class="msg ai" id="${loadingId}">Thinking...</div>`;
    body.scrollTop = body.scrollHeight;

    try {
        // CALL BACKEND API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await response.json();
        
        document.getElementById(loadingId).remove();
        
        if (data.reply) {
            // Simple formatter for bold text
            const formatted = data.reply.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            body.innerHTML += `<div class="msg ai">${formatted}</div>`;
        } else {
            body.innerHTML += `<div class="msg ai" style="color:#f87171;">Error connecting to neural core.</div>`;
        }
    } catch (err) {
        document.getElementById(loadingId).remove();
        body.innerHTML += `<div class="msg ai" style="color:#f87171;">System Error.</div>`;
    }
    body.scrollTop = body.scrollHeight;
}