/************************************************
 * BRO – VOICE ASSISTANT WITH FACE AUTH
 * ENHANCED SMART VERSION
 ************************************************/

const status = document.getElementById("status");
const orb = document.getElementById("orb");
const transcriptEl = document.getElementById("transcript");
const toggleBtn = document.getElementById("toggleBtn");
const lockBtn = document.getElementById("lockBtn");
const debugEl = document.getElementById("debug");

// Face detection elements
const faceOverlay = document.getElementById("faceOverlay");
const faceStatus = document.getElementById("faceStatus");
const cameraFeed = document.getElementById("cameraFeed");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const setupFaceBtn = document.getElementById("setupFaceBtn");
const verifyFaceBtn = document.getElementById("verifyFaceBtn");
const skipAuthBtn = document.getElementById("skipAuthBtn");

// Enhanced features
const commandHistory = [];
const userPreferences = {
    name: "User",
    language: "en-IN",
    speakRate: 1.0
};

let blazefaceModel = null;
let stream = null;
let isAuthenticated = false;
let savedFaceDescriptor = null;
let conversationContext = {
    lastTopic: "",
    lastCommand: "",
    followUpExpected: false
};

// Enhanced greeting system
const greetings = {
    morning: ["Good morning!", "Top of the morning to you!", "Rise and shine!"],
    afternoon: ["Good afternoon!", "Hope you're having a productive day!"],
    evening: ["Good evening!", "Hope you had a great day!"],
    night: ["Good night!", "Sleep well!"],
    hindi: ["Namaste!", "Kaise ho?", "Aapka din mangalmay ho!"]
};

function debugLog(msg) {
    console.log(msg);
    debugEl.innerHTML = `<span class="timestamp">[${new Date().toLocaleTimeString()}]</span> ${msg}<br>` + debugEl.innerHTML;
}

/* ---------- ORB STATES ---------- */
const orbIdle = () => orb.className = "orb idle";
const orbListening = () => orb.className = "orb listening";
const orbSpeaking = () => orb.className = "orb speaking";
const orbProcessing = () => orb.className = "orb processing";
const orbLocked = () => orb.className = "orb locked";

/* ---------- FACE DETECTION (Enhanced) ---------- */
async function initFaceDetection() {
    try {
        faceStatus.innerText = "Loading face detection model...";
        blazefaceModel = await blazeface.load();
        faceStatus.innerText = "Starting camera...";
        
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, facingMode: "user" } 
        });
        cameraFeed.srcObject = stream;
        
        // Check if face was previously saved
        const saved = localStorage.getItem("userFaceData");
        if (saved) {
            savedFaceDescriptor = JSON.parse(saved);
            faceStatus.innerText = "✅ Face recognized! Click 'Verify Face' to unlock";
            verifyFaceBtn.style.display = "inline-block";
            // Auto-verify after 2 seconds
            setTimeout(() => {
                if (!isAuthenticated) verifyFaceBtn.click();
            }, 2000);
        } else {
            faceStatus.innerText = "👤 No face setup. Click 'Setup My Face' to register";
            setupFaceBtn.style.display = "inline-block";
        }
        
    } catch (error) {
        faceStatus.innerText = "Error: " + error.message;
        debugLog("Face detection error: " + error.message);
        // Fallback to skip button
        skipAuthBtn.style.display = "inline-block";
    }
}

async function detectFace() {
    if (!blazefaceModel) return null;
    
    canvas.width = cameraFeed.videoWidth;
    canvas.height = cameraFeed.videoHeight;
    ctx.drawImage(cameraFeed, 0, 0);
    
    const predictions = await blazefaceModel.estimateFaces(canvas, false);
    return predictions.length > 0 ? predictions[0] : null;
}

function getFaceDescriptor(prediction) {
    const landmarks = prediction.landmarks;
    return {
        landmarks: landmarks.map(point => ({x: point[0], y: point[1]})),
        boundingBox: prediction.topLeft.concat(prediction.bottomRight)
    };
}

function compareFaces(face1, face2) {
    if (!face1 || !face2) return false;
    
    const landmarks1 = face1.landmarks;
    const landmarks2 = face2.landmarks;
    
    if (landmarks1.length !== landmarks2.length) return false;
    
    let totalDistance = 0;
    for (let i = 0; i < landmarks1.length; i++) {
        const dx = landmarks1[i].x - landmarks2[i].x;
        const dy = landmarks1[i].y - landmarks2[i].y;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
    }
    
    const avgDistance = totalDistance / landmarks1.length;
    return avgDistance < 25; // Lower threshold for better accuracy
}

setupFaceBtn.onclick = async () => {
    faceStatus.innerText = "📸 Look at the camera and hold still...";
    setupFaceBtn.disabled = true;
    
    setTimeout(async () => {
        const face = await detectFace();
        if (face) {
            savedFaceDescriptor = getFaceDescriptor(face);
            localStorage.setItem("userFaceData", JSON.stringify(savedFaceDescriptor));
            localStorage.setItem("lastFaceSetup", new Date().toISOString());
            faceStatus.innerText = "✅ Face registered successfully!";
            setupFaceBtn.style.display = "none";
            verifyFaceBtn.style.display = "inline-block";
            speak("Face registered successfully. Welcome!", "en-IN");
        } else {
            faceStatus.innerText = "❌ No face detected. Please try again.";
            setupFaceBtn.disabled = false;
        }
    }, 2000);
};

verifyFaceBtn.onclick = async () => {
    faceStatus.innerText = "🔍 Verifying your face...";
    verifyFaceBtn.disabled = true;
    
    let attempts = 0;
    const maxAttempts = 3;
    
    const verifyInterval = setInterval(async () => {
        const face = await detectFace();
        attempts++;
        
        if (face && savedFaceDescriptor) {
            const currentDescriptor = getFaceDescriptor(face);
            const isMatch = compareFaces(savedFaceDescriptor, currentDescriptor);
            
            if (isMatch) {
                faceStatus.innerText = "✅ Face verified! Access granted";
                clearInterval(verifyInterval);
                unlockApp();
            } else if (attempts >= maxAttempts) {
                faceStatus.innerText = "❌ Face verification failed. Try again.";
                verifyFaceBtn.disabled = false;
                clearInterval(verifyInterval);
            }
        } else if (attempts >= maxAttempts) {
            faceStatus.innerText = "❌ No face detected. Try again.";
            verifyFaceBtn.disabled = false;
            clearInterval(verifyInterval);
        }
    }, 1000);
};

skipAuthBtn.onclick = () => {
    unlockApp();
};

function unlockApp() {
    isAuthenticated = true;
    faceOverlay.classList.add("hidden");
    
    // Stop camera
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    
    orbIdle();
    toggleBtn.disabled = false;
    toggleBtn.innerText = "🎤 Start Listening";
    lockBtn.style.display = "inline-block";
    status.innerText = "✅ Authenticated! Ready to use";
    
    // Smart greeting based on time
    const hour = new Date().getHours();
    let greeting;
    if (hour < 12) greeting = greetings.morning[Math.floor(Math.random() * greetings.morning.length)];
    else if (hour < 17) greeting = greetings.afternoon[Math.floor(Math.random() * greetings.afternoon.length)];
    else greeting = greetings.evening[Math.floor(Math.random() * greetings.evening.length)];
    
    speak(`${greeting} I am Bro. How can I help you today?`, "en-IN");
}

function lockApp() {
    isAuthenticated = false;
    stopRecognition();
    orbLocked();
    toggleBtn.disabled = true;
    toggleBtn.innerText = "🔒 Locked";
    lockBtn.style.display = "none";
    status.innerText = "🔒 App locked";
    faceOverlay.classList.remove("hidden");
    verifyFaceBtn.disabled = false;
    initFaceDetection();
}

/* ---------- ENHANCED SPEECH FUNCTIONS ---------- */
let speaking = false;
let isListening = false;

function speak(text, lang = "en-IN", callback) {
    if (!text || text.trim() === "") return;
    
    debugLog(`🗣️ Speaking: ${text}`);
    speaking = true;
    
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = lang;
    msg.rate = userPreferences.speakRate;
    msg.pitch = 1.0;
    msg.volume = 1.0;
    
    orbSpeaking();
    status.innerText = `🤖 ${text}`;
    transcriptEl.innerHTML += `<div class="ai-response">🤖 ${text}</div>`;
    
    speechSynthesis.cancel();
    
    msg.onstart = () => {
        debugLog("✅ Speech started");
    };
    
    msg.onend = () => {
        debugLog("✅ Speech ended");
        speaking = false;
        if (isAuthenticated) orbIdle();
        if (callback) {
            setTimeout(callback, 500);
        }
    };

    msg.onerror = (e) => {
        debugLog(`❌ Speech error: ${e.error}`);
        speaking = false;
        if (isAuthenticated) orbIdle();
        if (callback) callback();
    };
    
    speechSynthesis.speak(msg);
}

/* ---------- ENHANCED COMMAND PROCESSING ---------- */
function getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    if (hour < 21) return "evening";
    return "night";
}

function extractCommand(text) {
    const lower = text.toLowerCase();
    
    // Enhanced wake word detection
    const patterns = [
        /(?:hey\s+)?(?:ok\s+)?bro\s+(.+)/i,
        /^(bro\s+)(.+)/i,
        /^(hey\s+)(.+)/i
    ];
    
    for (let pattern of patterns) {
        const match = lower.match(pattern);
        if (match && match[1]) {
            const cmd = match[1].trim();
            debugLog(`✅ Wake word detected! Command: "${cmd}"`);
            return cmd;
        }
    }
    
    // Check if this is a follow-up to previous command
    if (conversationContext.followUpExpected) {
        return text.trim();
    }
    
    return null;
}

function detectLanguage(text) {
    const hindiPattern = /hai|kya|ka|kar|bhej|chalu|karo|batao|dikhao|samay|tarikh|aap|tum|mera|tera|kaha|kyu|kaise/i;
    return hindiPattern.test(text.toLowerCase()) ? "hi-IN" : "en-IN";
}

/* ---------- ENHANCED COMMAND HANDLER ---------- */
async function handleCommand(command) {
    debugLog(`🔧 HANDLING: "${command}"`);
    
    if (recognition && recognitionActive) {
        recognition.stop();
    }
    
    // Add to command history
    commandHistory.push({
        command: command,
        timestamp: new Date().toISOString(),
        context: {...conversationContext}
    });
    
    const lang = detectLanguage(command);
    const lowerCommand = command.toLowerCase();
    
    orbProcessing();
    
    // Check for conversational responses
    const conversationalResponse = handleConversationalCommand(command, lang);
    if (conversationalResponse) {
        speak(conversationalResponse, lang, () => {
            if (isListening) startRecognition();
        });
        return;
    }
    
    // YOUR CUSTOM COMMANDS (Preserved and enhanced)
    /* ---- TIME ---- */
    if (/what.*time|time|samay|kitna baj|current time/i.test(lowerCommand)) {
        const time = new Date().toLocaleTimeString("en-IN", {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        speak(
            lang === "hi-IN" ? `Abhi ${time} baj rahe hain` : `The time is ${time}`,
            lang,
            () => { if (isListening) startRecognition(); }
        );
        conversationContext.lastCommand = "time";
        return;
    }

    /* ---- DATE ---- */
    if (/what.*date|today.*date|date|tarikh|aaj ki tarikh|day today/i.test(lowerCommand)) {
        const date = new Date().toLocaleDateString("en-IN", {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        speak(
            lang === "hi-IN" ? `Aaj ki tarikh hai ${date}` : `Today is ${date}`,
            lang,
            () => { if (isListening) startRecognition(); }
        );
        conversationContext.lastCommand = "date";
        return;
    }

    /* ---- MUSIC/PLAY (Enhanced) ---- */
    if (/play|chalao|chala|song|music|gaana|tune|beat/i.test(lowerCommand)) {
        let query = command.replace(/play|chalao|chala|song|music|gaana|tune|beat|by|from/gi, "").trim();
        
        if (!query || query === "") {
            query = "trending music";
            speak(
                lang === "hi-IN" ? "Konsa gaana sunna chahenge?" : "What song would you like to hear?",
                lang
            );
            conversationContext.followUpExpected = true;
            conversationContext.lastCommand = "music";
            return;
        }
        
        speak(
            lang === "hi-IN" ? `${query} chala raha hun` : `Playing ${query}`,
            lang,
            () => {
                window.open(
                    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
                    "_blank"
                );
                if (isListening) setTimeout(startRecognition, 1000);
            }
        );
        return;
    }

    /* ---- WHATSAPP (Enhanced) ---- */
    if (/whatsapp|message|msg|bhej|send|text/i.test(lowerCommand)) {
        if (/to whom|kisko|whom/i.test(lowerCommand)) {
            speak(
                lang === "hi-IN" ? "Kisko message bhejna hai?" : "Who do you want to message?",
                lang
            );
            conversationContext.followUpExpected = true;
            conversationContext.lastCommand = "whatsapp";
            return;
        }
        
        speak(
            lang === "hi-IN" ? "WhatsApp khol raha hun" : "Opening WhatsApp",
            lang,
            () => {
                window.open("https://web.whatsapp.com", "_blank");
                if (isListening) setTimeout(startRecognition, 1000);
            }
        );
        return;
    }

    /* ---- ASSEMBLE (Enhanced) ---- */
    if (/assemble|asemble|asembl|sembl|sambal|all work|open all/i.test(lowerCommand)) {
        speak(
            lang === "hi-IN" ? "Sab kaam ki links khol raha hun" : "Opening all work links",
            lang,
            () => {
                const links = [
                    "http://outlook.office.com/mail/inbox/id/AAQkADY1ODE5YTg5LWE0ZWItNDczMy05OGNjLTk5YzkxNzMzNDJmNAAQAEUrUSYfY2dJq6PVcGU9qu8%3D",
                    "https://web.whatsapp.com/",
                    "https://console.acefone.in/livecalls",
                    "https://crmadmin.oneandro.com/user-management",
                    "https://desk.zoho.in/agent/oneandro/oneandro-support/tickets/new"
                ];
                
                links.forEach((link, index) => {
                    setTimeout(() => {
                        window.open(link, "_blank");
                    }, index * 500);
                });
                
                if (isListening) setTimeout(startRecognition, 3000);
            }
        );
        conversationContext.lastCommand = "assemble";
        return;
    }

    /* ---- NEARBY/MAPS (Enhanced) ---- */
    if (/nearby|near me|paas|najdeek|dikhao|restaurant|hospital|atm|petrol|gas|fuel/i.test(lowerCommand)) {
        let query = "nearby places";
        
        // Extract location type
        if (/restaurant|food|eat|khana/i.test(lowerCommand)) query = "restaurants nearby";
        else if (/hospital|doctor|clinic/i.test(lowerCommand)) query = "hospitals nearby";
        else if (/atm|cash|bank/i.test(lowerCommand)) query = "ATM nearby";
        else if (/petrol|gas|fuel|pump/i.test(lowerCommand)) query = "petrol pump nearby";
        else if (/hotel|lodge|stay/i.test(lowerCommand)) query = "hotels nearby";
        
        speak(
            lang === "hi-IN" ? `${query} dikha raha hun` : `Showing ${query}`,
            lang,
            () => {
                window.open(
                    `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
                    "_blank"
                );
                if (isListening) setTimeout(startRecognition, 1000);
            }
        );
        return;
    }

    /* ---- WEATHER (New Feature) ---- */
    if (/weather|mausam|baarish|rain|temperature|garmi|thand/i.test(lowerCommand)) {
        speak(
            lang === "hi-IN" ? "Mausam ki jankari de raha hun" : "Getting weather information",
            lang,
            () => {
                window.open("https://www.google.com/search?q=weather", "_blank");
                if (isListening) setTimeout(startRecognition, 1000);
            }
        );
        return;
    }

    /* ---- NEWS (New Feature) ---- */
    if (/news|khabar|headlines|latest|update/i.test(lowerCommand)) {
        speak(
            lang === "hi-IN" ? "Taza khabar dikha raha hun" : "Showing latest news",
            lang,
            () => {
                window.open("https://news.google.com", "_blank");
                if (isListening) setTimeout(startRecognition, 1000);
            }
        );
        return;
    }

    /* ---- CALCULATOR (New Feature) ---- */
    if (/calculate|compute|math|add|subtract|multiply|divide|plus|minus|times/i.test(lowerCommand)) {
        try {
            // Extract math expression
            const mathExpr = command.replace(/calculate|compute|math|what is|how much is/gi, "").trim();
            // Simple evaluation (use a proper math parser in production)
            speak(
                `Calculating ${mathExpr}`,
                lang,
                () => {
                    window.open(`https://www.google.com/search?q=${encodeURIComponent(mathExpr)}`, "_blank");
                    if (isListening) setTimeout(startRecognition, 1000);
                }
            );
        } catch (e) {
            speak("I couldn't calculate that. Please try again.", lang);
        }
        return;
    }

    /* ---- SMART SEARCH (Enhanced Fallback) ---- */
    // If no specific command matches, do a smart search
    if (!conversationContext.followUpExpected) {
        speak(
            lang === "hi-IN" ? 
                "Mujhe nahi pata, kya main internet se search karun?" : 
                "I'm not sure, would you like me to search the web?",
            lang,
            () => {
                conversationContext.followUpExpected = true;
                conversationContext.lastCommand = "search";
                if (isListening) startRecognition();
            }
        );
        return;
    }
    
    // Handle follow-up responses
    handleFollowUp(command, lang);
}

/* ---------- CONVERSATIONAL INTELLIGENCE ---------- */
function handleConversationalCommand(command, lang) {
    const lower = command.toLowerCase();
    
    // Greetings
    if (/hello|hi|hey|namaste|kaise ho/i.test(lower)) {
        const greetingType = getTimeBasedGreeting();
        const greetingsList = greetings[greetingType];
        return lang === "hi-IN" ? 
            "Namaste! Main Bro hun. Aapki kya madad kar sakta hun?" :
            `${greetingsList[Math.floor(Math.random() * greetingsList.length)]} How can I help you?`;
    }
    
    // Thanks
    if (/thank|thanks|dhanyavad|shukriya/i.test(lower)) {
        return lang === "hi-IN" ?
            "Aapka swagat hai! Aur kya madad kar sakta hun?" :
            "You're welcome! Is there anything else I can help with?";
    }
    
    // Goodbye
    if (/bye|goodbye|see you|alvida|chalta hun/i.test(lower)) {
        return lang === "hi-IN" ?
            "Alvida! Aapse baat karke achha laga." :
            "Goodbye! Have a great day!";
    }
    
    // How are you
    if (/how are you|kaise ho|aap kaise hain/i.test(lower)) {
        return lang === "hi-IN" ?
            "Main theek hun, dhanyavad! Aap sunaiye." :
            "I'm doing great, thank you for asking! How about you?";
    }
    
    // What can you do
    if (/what can you do|aap kya kar sakte ho|your abilities|features/i.test(lower)) {
        return lang === "hi-IN" ?
            "Main aapki madad kar sakta hun: samay bata sakta hun, music chala sakta hun, WhatsApp khol sakta hun, aur bahut kuch!" :
            "I can help you with: telling time, playing music, opening WhatsApp, showing nearby places, and much more!";
    }
    
    // Who are you
    if (/who are you|aap kaun ho|your name|tum kaun ho/i.test(lower)) {
        return lang === "hi-IN" ?
            "Mera naam Bro hai. Main aapka personal voice assistant hun." :
            "I'm Bro, your personal voice assistant. I'm here to help you!";
    }
    
    return null;
}

function handleFollowUp(command, lang) {
    const lastCmd = conversationContext.lastCommand;
    
    switch(lastCmd) {
        case "search":
            speak(
                lang === "hi-IN" ? "Internet par search kar raha hun" : "Searching the web",
                lang,
                () => {
                    window.open(`https://www.google.com/search?q=${encodeURIComponent(command)}`, "_blank");
                    if (isListening) setTimeout(startRecognition, 1000);
                }
            );
            break;
            
        case "music":
            speak(
                lang === "hi-IN" ? `${command} chala raha hun` : `Playing ${command}`,
                lang,
                () => {
                    window.open(
                        `https://www.youtube.com/results?search_query=${encodeURIComponent(command)}`,
                        "_blank"
                    );
                    if (isListening) setTimeout(startRecognition, 1000);
                }
            );
            break;
            
        case "whatsapp":
            speak(
                lang === "hi-IN" ? `${command} ko WhatsApp khol raha hun` : `Opening WhatsApp for ${command}`,
                lang,
                () => {
                    window.open("https://web.whatsapp.com", "_blank");
                    if (isListening) setTimeout(startRecognition, 1000);
                }
            );
            break;
            
        default:
            speak(
                lang === "hi-IN" ? 
                    "Mujhe abhi samajh nahi aaya" : 
                    "I didn't understand that",
                lang,
                () => { if (isListening) startRecognition(); }
            );
    }
    
    conversationContext.followUpExpected = false;
}

/* ---------- ENHANCED SPEECH RECOGNITION ---------- */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let recognitionActive = false;
let restartTimeout = null;
let lastProcessedCommand = "";
let commandTimeout = null;

function startRecognition() {
    if (!isAuthenticated) {
        debugLog("⚠️ App is locked. Cannot start recognition.");
        return;
    }
    
    if (!isListening || speaking || recognitionActive) {
        debugLog(`⏸️ Skipping start (listening: ${isListening}, speaking: ${speaking}, active: ${recognitionActive})`);
        return;
    }
    
    try {
        recognition = new SpeechRecognition();
        recognition.lang = "en-IN";
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 3; // Increased for better accuracy
        
        let fullTranscript = "";
        let finalTranscript = "";

        orbListening();
        status.innerText = "👂 Listening... Say 'Hey Bro'";
        recognitionActive = true;
        debugLog("🎤 Recognition STARTED");

        recognition.onresult = (e) => {
            let interim = "";
            
            for (let i = 0; i < e.results.length; i++) {
                const transcript = e.results[i][0].transcript;
                if (e.results[i].isFinal) {
                    finalTranscript += transcript + " ";
                    // Display user speech
                    transcriptEl.innerHTML += `<div class="user-speech">👤 ${transcript}</div>`;
                } else {
                    interim += transcript;
                }
            }

            fullTranscript = finalTranscript + interim;
            const text = fullTranscript.toLowerCase().trim();
            
            if (interim) {
                transcriptEl.innerText = text + "..." || "—";
            }

            const command = extractCommand(text);
            if (command && command !== lastProcessedCommand) {
                debugLog(`🎯 Command detected: "${command}"`);
                
                clearTimeout(commandTimeout);
                
                commandTimeout = setTimeout(() => {
                    debugLog(`⚡ Processing command...`);
                    handleCommand(command);
                    finalTranscript = "";
                    fullTranscript = "";
                    lastProcessedCommand = command;
                }, 1200);
            }
        };

        recognition.onerror = (e) => {
            debugLog(`❌ Recognition error: ${e.error}`);
            recognitionActive = false;
            // Auto-restart on certain errors
            if (e.error !== 'no-speech' && e.error !== 'aborted') {
                setTimeout(() => {
                    if (isListening && !speaking) startRecognition();
                }, 1000);
            }
        };

        recognition.onend = () => {
            debugLog("🔴 Recognition ENDED");
            recognitionActive = false;
            
            if (isListening && !speaking && isAuthenticated) {
                clearTimeout(restartTimeout);
                restartTimeout = setTimeout(() => {
                    debugLog("🔄 Auto-restarting...");
                    startRecognition();
                }, 800);
            }
        };

        recognition.start();
        
    } catch (error) {
        debugLog(`❌ Failed to start: ${error.message}`);
    }
}

function stopRecognition() {
    debugLog("🛑 Stopping recognition");
    isListening = false;
    clearTimeout(restartTimeout);
    clearTimeout(commandTimeout);
    
    if (recognition && recognitionActive) {
        try {
            recognition.stop();
        } catch (e) {
            debugLog("Recognition already stopped");
        }
    }
    
    if (isAuthenticated) orbIdle();
    status.innerText = "⏸️ Stopped listening";
}

function toggleListening() {
    if (!isAuthenticated) return;
    
    if (isListening) {
        stopRecognition();
        toggleBtn.innerHTML = "🎤 Start Listening";
    } else {
        isListening = true;
        toggleBtn.innerHTML = "⏸️ Stop Listening";
        lastProcessedCommand = "";
        conversationContext.followUpExpected = false;
        startRecognition();
    }
}

/* ---------- INITIALIZATION ---------- */
window.onload = () => {
    if (!SpeechRecognition) {
        status.innerText = "❌ Speech recognition not supported";
        debugLog("❌ SpeechRecognition API not available");
        return;
    }
    
    debugLog("🚀 Bro Assistant v2.0 Initialized");
    status.innerText = "🔒 Locked - Authenticate to use";
    orbLocked();
    
    // Load user preferences
    const savedPrefs = localStorage.getItem("broPreferences");
    if (savedPrefs) {
        Object.assign(userPreferences, JSON.parse(savedPrefs));
    }
    
    // Start face detection
    initFaceDetection();
    
    // Add keyboard shortcut (Space to toggle listening)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && isAuthenticated) {
            e.preventDefault();
            toggleListening();
        }
    });
};

/* ---------- HELPER FUNCTIONS ---------- */
function savePreferences() {
    localStorage.setItem("broPreferences", JSON.stringify(userPreferences));
}

function clearHistory() {
    commandHistory.length = 0;
    debugLog("📝 Command history cleared");
}

// Export for debugging
window.BroAssistant = {
    toggleListening,
    lockApp,
    clearHistory,
    commandHistory,
    preferences: userPreferences,
    savePreferences
};
