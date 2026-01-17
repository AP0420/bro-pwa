/************************************************
 * BRO – WAKE WORD VOICE ASSISTANT (FIXED v2)
 * Wake word: "bro"
 ************************************************/

const status = document.getElementById("status");
const orb = document.getElementById("orb");
const transcriptEl = document.getElementById("transcript");
const toggleBtn = document.getElementById("toggleBtn");
const debugEl = document.getElementById("debug");

function debugLog(msg) {
  console.log(msg);
  debugEl.innerHTML = msg + "<br>" + debugEl.innerHTML;
}

/* ---------- ORB STATES ---------- */
const orbIdle = () => orb.className = "orb idle";
const orbListening = () => orb.className = "orb listening";
const orbSpeaking = () => orb.className = "orb speaking";

/* ---------- SPEAK ---------- */
let speaking = false;
let isListening = false;

function speak(text, lang = "en-IN", callback) {
  debugLog(`🗣️ Speaking: ${text}`);
  speaking = true;
  
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = lang;
  msg.rate = 1.0;
  msg.pitch = 1.0;
  msg.volume = 1.0;
  
  orbSpeaking();
  status.innerText = `🤖 ${text}`;
  
  speechSynthesis.cancel();
  
  msg.onstart = () => {
    debugLog("✅ Speech started");
  };
  
  msg.onend = () => {
    debugLog("✅ Speech ended");
    speaking = false;
    orbIdle();
    if (callback) {
      setTimeout(callback, 500);
    }
  };

  msg.onerror = (e) => {
    debugLog(`❌ Speech error: ${e.error}`);
    speaking = false;
    orbIdle();
    if (callback) callback();
  };
  
  speechSynthesis.speak(msg);
}

/* ---------- SPEECH RECOGNITION ---------- */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let recognitionActive = false;
let restartTimeout = null;
let lastProcessedCommand = "";
let commandTimeout = null;

/* ---------- LANGUAGE DETECTION ---------- */
function detectLanguage(text) {
  const hindiWords = /hai|kya|ka|kar|bhej|chalu|karo|batao|dikhao|samay|tarikh/;
  return hindiWords.test(text) ? "hi-IN" : "en-IN";
}

/* ---------- WAKE WORD EXTRACTION ---------- */
function extractCommand(text) {
  const lower = text.toLowerCase();
  
  // Look for "bro" followed by a command
  const patterns = [
    /(?:hey\s+)?(?:ok\s+)?bro\s+(.+)/i
  ];
  
  for (let pattern of patterns) {
    const match = lower.match(pattern);
    if (match && match[1]) {
      const cmd = match[1].trim();
      debugLog(`✅ Wake word detected! Command: "${cmd}"`);
      return cmd;
    }
  }
  
  return null;
}

/* ---------- START CONTINUOUS LISTENING ---------- */
function startRecognition() {
  if (!isListening || speaking || recognitionActive) {
    debugLog(`⏸️ Skipping start (listening: ${isListening}, speaking: ${speaking}, active: ${recognitionActive})`);
    return;
  }
  
  try {
    recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    
    let fullTranscript = "";

    orbListening();
    status.innerText = "👂 Listening for 'Bro'...";
    recognitionActive = true;
    debugLog("🎤 Recognition STARTED");

    recognition.onresult = (e) => {
      let interim = "";
      let final = "";
      
      for (let i = 0; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += transcript + " ";
        } else {
          interim += transcript;
        }
      }

      fullTranscript = final + interim;
      const text = fullTranscript.toLowerCase().trim();
      
      transcriptEl.innerText = text || "—";

      // Check for wake word
      const command = extractCommand(text);
      if (command && command !== lastProcessedCommand) {
        debugLog(`🎯 Command detected: "${command}"`);
        
        // Clear any existing timeout
        clearTimeout(commandTimeout);
        
        // Wait for complete command (more patience)
        commandTimeout = setTimeout(() => {
          debugLog(`⚡ Processing command...`);
          handleCommand(command);
          fullTranscript = "";
          lastProcessedCommand = command;
        }, 1200);
      }
    };

    recognition.onerror = (e) => {
      debugLog(`❌ Recognition error: ${e.error}`);
      recognitionActive = false;
    };

    recognition.onend = () => {
      debugLog("🔴 Recognition ENDED");
      recognitionActive = false;
      
      // Auto-restart if still supposed to be listening
      if (isListening && !speaking) {
        clearTimeout(restartTimeout);
        restartTimeout = setTimeout(() => {
          debugLog("🔄 Auto-restarting...");
          startRecognition();
        }, 500);
      }
    };

    recognition.start();
    
  } catch (error) {
    debugLog(`❌ Failed to start: ${error.message}`);
  }
}

/* ---------- STOP LISTENING ---------- */
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
  
  orbIdle();
  status.innerText = "Stopped listening";
}

/* ---------- COMMAND HANDLER ---------- */
function handleCommand(command) {
  debugLog(`🔧 HANDLING: "${command}"`);
  
  // Stop listening while processing
  if (recognition && recognitionActive) {
    recognition.stop();
  }
  
  const lang = detectLanguage(command);

  /* ---- TIME ---- */
  if (/what.*time|time|samay|kitna baj/i.test(command)) {
    const time = new Date().toLocaleTimeString("en-IN", {
      hour: '2-digit',
      minute: '2-digit'
    });
    speak(
      lang === "hi-IN" ? `Abhi ${time} baj rahe hain` : `The time is ${time}`,
      lang,
      () => { if (isListening) startRecognition(); }
    );
    return;
  }

  /* ---- DATE ---- */
  if (/what.*date|today.*date|date|tarikh|aaj ki tarikh/i.test(command)) {
    const date = new Date().toLocaleDateString("en-IN", {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    speak(
      lang === "hi-IN" ? `Aaj ki tarikh hai ${date}` : `Today's date is ${date}`,
      lang,
      () => { if (isListening) startRecognition(); }
    );
    return;
  }

  /* ---- MUSIC/PLAY ---- */
  if (/play|chalao|chala|song|music|gaana/i.test(command)) {
    const query = command
      .replace(/play|chalao|chala|song|music|gaana/gi, "")
      .trim() || "music";
    
    speak(
      lang === "hi-IN" ? "Music chala raha hun" : "Playing music",
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

  /* ---- WHATSAPP ---- */
  if (/whatsapp|message|msg|bhej|send/i.test(command)) {
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

  /* ---- ASSEMBLE ---- */
  if (/assemble|asemble|asembl|sembl|sambal/i.test(command)) {
    speak(
      lang === "hi-IN" ? "Sab links khol raha hun" : "Opening all work links",
      lang,
      () => {
        // Open all work links
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
          }, index * 500); // Stagger opening by 500ms each
        });
        
        if (isListening) setTimeout(startRecognition, 3000);
      }
    );
    return;
  }

  /* ---- NEARBY/MAPS ---- */
  if (/nearby|near me|paas|najdeek|dikhao/i.test(command)) {
    speak(
      lang === "hi-IN" ? "Aas paas ki jagah dikha raha hun" : "Showing nearby places",
      lang,
      () => {
        window.open(
          `https://www.google.com/maps/search/${encodeURIComponent(command)}`,
          "_blank"
        );
        if (isListening) setTimeout(startRecognition, 1000);
      }
    );
    return;
  }

  /* ---- FALLBACK ---- */
  speak(
    lang === "hi-IN" 
      ? "Samajh nahi aaya, kripya dobara boliye" 
      : "I didn't understand that, please try again",
    lang,
    () => { if (isListening) startRecognition(); }
  );
}

/* ---------- TOGGLE BUTTON ---------- */
function toggleListening() {
  if (isListening) {
    stopRecognition();
    toggleBtn.innerText = "Start Listening";
  } else {
    isListening = true;
    toggleBtn.innerText = "Stop Listening";
    lastProcessedCommand = "";
    startRecognition();
  }
}

/* ---------- INIT ---------- */
window.onload = () => {
  if (!SpeechRecognition) {
    status.innerText = "❌ Speech recognition not supported";
    debugLog("❌ SpeechRecognition API not available");
    return;
  }
  
  debugLog("✅ App initialized");
  status.innerText = "Ready! Click 'Start Listening'";
  orbIdle();
  
  // Test speech synthesis
  setTimeout(() => {
    speak(
      "Hello, I am Bro. Click start listening, then say Bro followed by your command.",
      "en-IN",
      () => {
        debugLog("✅ Initial greeting complete");
        status.innerText = "Ready! Click 'Start Listening'";
      }
    );
  }, 500);
};
