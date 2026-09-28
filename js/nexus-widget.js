/* =========================================================================
   js/nexus-widget.js — Dr. Nexus Biology Research Assistant
   Context-Aware Floating Assistant with Pointer-Events Drag & Dynamic State
   ========================================================================= */

(function () {
    // Avoid double initialization
    if (window.__drNexusInitialized) return;
    window.__drNexusInitialized = true;

    // ── 1. STYLES ──────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.innerHTML = `
        /* ── Floating Action Button (FAB) ── */
        #nexus-fab {
            position: fixed;
            bottom: 28px;
            right: 28px;
            width: 52px;
            height: 52px;
            background: #09090E;
            border: 1.5px solid rgba(217, 119, 87, 0.45);
            border-radius: 50%;
            box-shadow: 0 8px 28px rgba(0,0,0,0.55), 0 0 0 0 rgba(217,119,87,0.2);
            cursor: grab;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            transition: box-shadow 0.25s ease, border-color 0.25s ease, transform 0.15s ease;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
        }

        #nexus-fab:hover {
            border-color: #D97757;
            box-shadow: 0 10px 32px rgba(0,0,0,0.65), 0 0 0 6px rgba(217,119,87,0.14);
            transform: scale(1.04);
        }

        #nexus-fab.nx-open {
            border-color: #D97757;
            box-shadow: 0 8px 30px rgba(0,0,0,0.6), 0 0 0 6px rgba(217,119,87,0.2);
        }

        #nexus-fab.nx-dragging {
            cursor: grabbing;
            transform: scale(0.92);
            box-shadow: 0 14px 40px rgba(0,0,0,0.75);
            transition: transform 0.1s ease, box-shadow 0.1s ease;
        }

        /* 4-point sparkle icon */
        #nexus-fab svg {
            color: #D97757;
            flex-shrink: 0;
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            pointer-events: none;
        }
        #nexus-fab:hover svg { transform: rotate(18deg) scale(1.12); }
        #nexus-fab.nx-open svg { transform: rotate(45deg) scale(1.08); }

        /* Notification pulse dot */
        .nx-fab-badge {
            position: absolute;
            top: 2px;
            right: 2px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #10B981;
            border: 2px solid #09090E;
            box-shadow: 0 0 8px #10B981;
        }

        /* ── CHAT WINDOW ── */
        #nexus-chat-window {
            position: fixed;
            bottom: 90px;
            right: 28px;
            width: 370px;
            height: 520px;
            max-height: 78vh;
            background: rgba(11, 14, 22, 0.96);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 18px;
            box-shadow: 0 32px 80px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.06);
            display: flex;
            flex-direction: column;
            z-index: 99998;
            overflow: hidden;
            font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
            opacity: 0;
            pointer-events: none;
            transform: scale(0.95) translateY(12px);
            transform-origin: bottom right;
            transition: opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1),
                        transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
        }

        #nexus-chat-window.nx-active {
            opacity: 1;
            pointer-events: auto;
            transform: scale(1) translateY(0);
        }

        @media (max-width: 480px) {
            #nexus-chat-window {
                width: calc(100vw - 20px) !important;
                left: 10px !important;
                right: 10px !important;
                bottom: 82px !important;
                top: auto !important;
                height: 70vh;
            }
        }

        /* ── HEADER ── */
        .nx-header {
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            flex-shrink: 0;
            background: #0E121B;
        }

        .nx-header-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .nx-avatar {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, rgba(217,119,87,0.2) 0%, rgba(217,119,87,0.05) 100%);
            border: 1px solid rgba(217, 119, 87, 0.35);
            border-radius: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            color: #D97757;
        }

        .nx-title-group {
            display: flex;
            flex-direction: column;
        }

        .nx-name {
            font-size: 13.5px;
            font-weight: 700;
            color: #F1F5F9;
            letter-spacing: -0.01em;
            margin: 0;
            line-height: 1.2;
        }

        .nx-status-row {
            font-size: 10.5px;
            color: #D97757;
            display: flex;
            align-items: center;
            gap: 5px;
            margin-top: 2px;
            font-family: 'JetBrains Mono', monospace;
        }

        .nx-status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #10B981;
            box-shadow: 0 0 6px #10B981;
            animation: nx-blink 2s ease infinite;
        }
        @keyframes nx-blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .nx-close-btn {
            background: none;
            border: none;
            color: #64748B;
            cursor: pointer;
            width: 28px;
            height: 28px;
            border-radius: 7px;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s, color 0.15s;
        }
        .nx-close-btn:hover {
            background: rgba(239, 68, 68, 0.12);
            color: #F87171;
        }

        /* ── CONTEXT AWARENESS BAR ── */
        .nx-context-bar {
            background: #080B12;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            padding: 8px 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            color: #94A3B8;
            flex-shrink: 0;
        }

        .nx-context-icon {
            font-size: 13px;
            flex-shrink: 0;
        }

        .nx-context-info {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
        }

        .nx-context-tool {
            font-weight: 600;
            color: #E2E8F0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.3;
        }

        .nx-context-summary {
            font-size: 10px;
            color: #64748B;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-family: 'JetBrains Mono', monospace;
        }

        .nx-context-badge {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: rgba(16, 185, 129, 0.12);
            color: #10B981;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid rgba(16, 185, 129, 0.25);
            flex-shrink: 0;
        }

        /* ── QUICK PROMPT CHIPS ── */
        .nx-prompts-row {
            display: flex;
            gap: 6px;
            padding: 8px 12px;
            overflow-x: auto;
            scrollbar-width: none;
            background: #06090F;
            border-bottom: 1px solid rgba(255,255,255,0.04);
            flex-shrink: 0;
        }
        .nx-prompts-row::-webkit-scrollbar { display: none; }

        .nx-prompt-chip {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-radius: 99px;
            padding: 4px 10px;
            font-size: 10.5px;
            color: #CBD5E1;
            cursor: pointer;
            white-space: nowrap;
            font-family: 'Space Grotesk', sans-serif;
            transition: border-color 0.15s, background 0.15s, color 0.15s, transform 0.1s;
            flex-shrink: 0;
        }
        .nx-prompt-chip:hover {
            border-color: #D97757;
            color: #D97757;
            background: rgba(217, 119, 87, 0.08);
            transform: translateY(-1px);
        }

        /* ── MESSAGES BODY ── */
        .nx-body {
            flex: 1;
            padding: 14px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 10px;
            background: #05070D;
            scrollbar-width: thin;
            scrollbar-color: #1E293B transparent;
        }
        .nx-body::-webkit-scrollbar { width: 4px; }
        .nx-body::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 4px; }

        .nx-msg {
            max-width: 88%;
            padding: 10px 14px;
            border-radius: 14px;
            font-size: 12.5px;
            line-height: 1.55;
            animation: nx-pop 0.18s ease;
            word-break: break-word;
        }
        @keyframes nx-pop { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform:none; } }

        .nx-msg.user {
            align-self: flex-end;
            background: #D97757;
            color: #FFFFFF;
            font-weight: 500;
            border-bottom-right-radius: 3px;
            box-shadow: 0 4px 16px rgba(217, 119, 87, 0.25);
        }

        .nx-msg.ai {
            align-self: flex-start;
            background: #0E131E;
            color: #CBD5E1;
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-left: 2.5px solid #D97757;
            border-bottom-left-radius: 3px;
        }
        .nx-msg.ai b, .nx-msg.ai strong { color: #F1F5F9; font-weight: 600; }
        .nx-msg.ai code {
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            background: rgba(0,0,0,0.35);
            padding: 1px 4px;
            border-radius: 3px;
            color: #F59E0B;
        }
        .nx-msg.ai ul, .nx-msg.ai ol { margin-left: 18px; margin-top: 4px; margin-bottom: 4px; }
        .nx-msg.ai li { margin-bottom: 2px; }

        .nx-typing {
            letter-spacing: 3px;
            color: #64748B;
            font-size: 15px;
            padding: 8px 14px;
        }

        /* ── FOOTER ── */
        .nx-footer {
            padding: 10px 12px;
            background: #0A0D15;
            border-top: 1px solid rgba(255,255,255,0.06);
            display: flex;
            gap: 8px;
            align-items: center;
            flex-shrink: 0;
        }

        #nexus-input {
            flex: 1;
            background: #121724;
            border: 1px solid rgba(255,255,255,0.08);
            color: #F1F5F9;
            padding: 9px 14px;
            border-radius: 99px;
            outline: none;
            font-size: 12.5px;
            font-family: inherit;
            transition: border-color 0.15s, box-shadow 0.15s;
        }
        #nexus-input:focus {
            border-color: #D97757;
            box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.15);
        }
        #nexus-input::placeholder { color: #475569; }

        #nexus-send {
            width: 36px;
            height: 36px;
            background: #D97757;
            border: none;
            border-radius: 50%;
            color: #FFFFFF;
            cursor: pointer;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: opacity 0.15s, transform 0.1s;
        }
        #nexus-send:hover { opacity: 0.9; transform: scale(1.05); }
        #nexus-send:active { transform: scale(0.95); }
    `;
    document.head.appendChild(style);

    // ── 2. HTML ────────────────────────────────────────────────────────────
    const container = document.createElement('div');
    container.innerHTML = `
        <div id="nexus-fab" title="Dr. Nexus — Biology AI Assistant">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 3c0 4.97-4.03 9-9 9 4.97 0 9 4.03 9 9 0-4.97 4.03-9 9-9-4.97 0-9-4.03-9-9z"/>
            </svg>
            <span class="nx-fab-badge"></span>
        </div>

        <div id="nexus-chat-window" role="dialog" aria-label="Dr. Nexus AI Assistant">
            <div class="nx-header">
                <div class="nx-header-left">
                    <div class="nx-avatar">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3c0 4.97-4.03 9-9 9 4.97 0 9 4.03 9 9 0-4.97 4.03-9 9-9-4.97 0-9-4.03-9-9z"/>
                        </svg>
                    </div>
                    <div class="nx-title-group">
                        <p class="nx-name">Dr. Nexus</p>
                        <span class="nx-status-row">
                            <span class="nx-status-dot"></span>
                            <span>Biology Core · Online</span>
                        </span>
                    </div>
                </div>
                <button class="nx-close-btn" id="nexus-close" aria-label="Close chat">✕</button>
            </div>

            <!-- Dynamic Context Bar -->
            <div class="nx-context-bar" id="nexus-context-bar">
                <span class="nx-context-icon" id="nexus-ctx-icon">🧬</span>
                <div class="nx-context-info">
                    <span class="nx-context-tool" id="nexus-ctx-tool">Bio-Nexus Research Core</span>
                    <span class="nx-context-summary" id="nexus-ctx-summary">Detecting active tool state...</span>
                </div>
                <span class="nx-context-badge">Live Context</span>
            </div>

            <!-- Dynamic Quick Action Prompts -->
            <div class="nx-prompts-row" id="nexus-prompts-row"></div>

            <!-- Messages Body -->
            <div class="nx-body" id="nexus-body">
                <div class="nx-msg ai">
                    Hello! I'm <b>Dr. Nexus</b> — your biology research copilot.<br>
                    I can see your active screen data. Ask me anything without re-typing!
                </div>
            </div>

            <!-- Input Footer -->
            <div class="nx-footer">
                <input type="text" id="nexus-input" placeholder="Ask Dr. Nexus about this data..." autocomplete="off">
                <button id="nexus-send" aria-label="Send message">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(container);

    // ── 3. ELEMENT REFS ────────────────────────────────────────────────────
    const fab         = document.getElementById('nexus-fab');
    const chatWin     = document.getElementById('nexus-chat-window');
    const msgBody     = document.getElementById('nexus-body');
    const input       = document.getElementById('nexus-input');
    const ctxBar      = document.getElementById('nexus-context-bar');
    const ctxIcon     = document.getElementById('nexus-ctx-icon');
    const ctxTool     = document.getElementById('nexus-ctx-tool');
    const ctxSummary  = document.getElementById('nexus-ctx-summary');
    const promptsRow  = document.getElementById('nexus-prompts-row');

    // ── 4. CONTEXT RESOLUTION ──────────────────────────────────────────────
    function resolvePageContext() {
        if (typeof window.nexusContext === 'function') {
            try {
                return window.nexusContext() || getFallbackContext();
            } catch (e) {
                console.warn('nexusContext execution error', e);
            }
        }
        return getFallbackContext();
    }

    function getFallbackContext() {
        const title = document.title || 'Bio-Nexus';
        const path = window.location.pathname;
        let toolName = 'Bio-Nexus Workspace';
        let icon = '🔬';

        if (path.includes('dna') || title.toLowerCase().includes('dna')) {
            toolName = 'DNA Analyzer'; icon = '🧬';
        } else if (path.includes('restriction')) {
            toolName = 'Restriction Mapper'; icon = '✂️';
        } else if (path.includes('reverse')) {
            toolName = 'Rev-Comp Generator'; icon = '🔄';
        } else if (path.includes('gel')) {
            toolName = 'Gel Electrophoresis'; icon = '🧫';
        } else if (path.includes('mol')) {
            toolName = '3D Mol Viewer'; icon = '🧊';
        } else if (path.includes('species') || path.includes('intelligence')) {
            toolName = 'Species Explorer'; icon = '🌿';
        }

        return {
            tool: toolName,
            icon: icon,
            active: false,
            summary: `Active on ${toolName}`,
            quickPrompts: [
                "How do I use this tool for research?",
                "Explain the biological principle behind this calculation",
                "What bioinformatics algorithms are used here?"
            ],
            data: {
                pageTitle: title,
                urlPath: path
            }
        };
    }

    function refreshContextUI() {
        const ctx = resolvePageContext();
        ctxIcon.textContent = ctx.icon || '🧬';
        ctxTool.textContent = ctx.tool || 'Bio-Nexus';
        ctxSummary.textContent = ctx.summary || 'Connected to workspace';

        // Update placeholder
        if (ctx.tool) {
            input.placeholder = `Ask about ${ctx.tool}...`;
        }

        // Render quick prompts
        promptsRow.innerHTML = '';
        if (ctx.quickPrompts && ctx.quickPrompts.length > 0) {
            ctx.quickPrompts.forEach(p => {
                const btn = document.createElement('button');
                btn.className = 'nx-prompt-chip';
                btn.textContent = p;
                btn.onclick = () => {
                    input.value = p;
                    sendMessage();
                };
                promptsRow.appendChild(btn);
            });
            promptsRow.style.display = 'flex';
        } else {
            promptsRow.style.display = 'none';
        }
    }

    // ── 5. OPEN / CLOSE ────────────────────────────────────────────────────
    function openChat() {
        refreshContextUI();
        positionChatWindow();
        chatWin.classList.add('nx-active');
        fab.classList.add('nx-open');
        input.focus();
    }

    function closeChat() {
        chatWin.classList.remove('nx-active');
        fab.classList.remove('nx-open');
    }

    document.getElementById('nexus-close').addEventListener('click', closeChat);
    document.getElementById('nexus-send').addEventListener('click', () => sendMessage());
    input.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

    // ── 6. POINTER EVENTS DRAG ─────────────────────────────────────────────
    let startX, startY, originLeft, originTop;
    let dragging = false;
    let rafId = null;
    const THRESHOLD = 6;

    fab.addEventListener('pointerdown', e => {
        e.preventDefault();
        dragging = false;
        fab.setPointerCapture(e.pointerId);

        startX = e.clientX;
        startY = e.clientY;

        const r = fab.getBoundingClientRect();
        originLeft = r.left;
        originTop = r.top;

        fab.style.transition = 'box-shadow 0.25s ease, border-color 0.25s ease';
    });

    fab.addEventListener('pointermove', e => {
        if (!fab.hasPointerCapture(e.pointerId)) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (!dragging) {
            if (Math.hypot(dx, dy) < THRESHOLD) return;
            dragging = true;
            fab.classList.add('nx-dragging');
        }

        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            fab.style.left = (originLeft + dx) + 'px';
            fab.style.top = (originTop + dy) + 'px';
            fab.style.right = 'auto';
            fab.style.bottom = 'auto';
        });
    });

    fab.addEventListener('pointerup', e => {
        fab.releasePointerCapture(e.pointerId);
        fab.classList.remove('nx-dragging');

        if (dragging) {
            snapToEdge();
            setTimeout(() => { dragging = false; }, 120);
        } else {
            dragging = false;
            chatWin.classList.contains('nx-active') ? closeChat() : openChat();
        }
    });

    fab.addEventListener('pointercancel', () => {
        fab.classList.remove('nx-dragging');
        snapToEdge();
        dragging = false;
    });

    function snapToEdge() {
        const r = fab.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const pad = 18;

        const snapLeft = (r.left + r.width / 2) < winW / 2
            ? pad
            : winW - r.width - pad;

        const clampedTop = Math.max(pad, Math.min(winH - r.height - pad, r.top));

        fab.style.transition = [
            'left 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)',
            'top  0.38s cubic-bezier(0.34, 1.56, 0.64, 1)',
            'box-shadow 0.25s ease',
            'border-color 0.25s ease'
        ].join(', ');

        fab.style.left = snapLeft + 'px';
        fab.style.top = clampedTop + 'px';
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';

        if (chatWin.classList.contains('nx-active')) {
            setTimeout(positionChatWindow, 60);
        }
    }

    function positionChatWindow() {
        const fabR = fab.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const chatW = Math.min(370, winW - 24);
        const chatH = Math.min(520, winH * 0.78);

        let left;
        if (fabR.left + fabR.width / 2 < winW / 2) {
            left = fabR.right + 12;
        } else {
            left = fabR.left - chatW - 12;
        }

        let top = fabR.top + fabR.height / 2 - chatH / 2;
        top = Math.max(12, Math.min(winH - chatH - 12, top));
        left = Math.max(12, Math.min(winW - chatW - 12, left));

        chatWin.style.left = left + 'px';
        chatWin.style.top = top + 'px';
        chatWin.style.right = 'auto';
        chatWin.style.bottom = 'auto';
        chatWin.style.width = chatW + 'px';
    }

    window.addEventListener('resize', () => {
        if (chatWin.classList.contains('nx-active')) positionChatWindow();
    });

    // ── 7. MESSAGING & CONTEXT INJECTION ───────────────────────────────────
    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        appendMsg(text, 'user');
        input.value = '';

        // Animated typing indicator
        const loadId = 'nx-' + Date.now();
        const loader = document.createElement('div');
        loader.id = loadId;
        loader.className = 'nx-msg ai nx-typing';
        loader.textContent = '•••';
        msgBody.appendChild(loader);
        msgBody.scrollTop = msgBody.scrollHeight;

        // Auto-detect backend target
        const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
        const BACKEND_URL = isLocal ? 'http://localhost:5000' : '';

        // Snapshot current page context
        const currentContext = resolvePageContext();

        try {
            const res = await fetch(`${BACKEND_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    context: currentContext
                })
            });

            const data = await res.json();
            document.getElementById(loadId)?.remove();

            if (data.reply) {
                const formatted = formatMarkdown(data.reply);
                appendMsg(formatted, 'ai', true);
            } else {
                appendMsg('No response received from neural link.', 'ai');
            }
        } catch {
            document.getElementById(loadId)?.remove();
            appendMsg('Offline — backend not reachable. Please check connection.', 'ai');
        }

        msgBody.scrollTop = msgBody.scrollHeight;
    }

    function appendMsg(content, who, isHtml = false) {
        const div = document.createElement('div');
        div.className = `nx-msg ${who}`;
        if (isHtml) div.innerHTML = content;
        else div.textContent = content;
        msgBody.appendChild(div);
        msgBody.scrollTop = msgBody.scrollHeight;
    }

    function formatMarkdown(text) {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>');
    }
})();