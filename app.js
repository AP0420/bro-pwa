/************************************************
 * BRO – VOICE ASSISTANT WITH FACE AUTH
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

let blazefaceModel = null;
let stream = null;
let isAuthenticated = false;
let savedFaceDescriptor = null;

function debugLog(msg) {
  console.log(msg);
  debugEl.innerHTML = msg + "<br>" + debugEl.innerHTML;
}

/* ---------- ORB STATES ---------- */
const orbIdle = () => orb.className = "orb idle";
const orbListening = () => orb.className = "orb listening";
const orbSpeaking = () => orb.className = "orb speaking";
const orbLocked = () => orb.className = "orb locked";

/* ---------- FACE DETECTION ---------- */
async function initFaceDetection() {
  try {
    faceStatus.innerText = "Loading face detection model...";
    blazefaceModel = await blazeface.load();
    faceStatus.innerText = "Starting camera...";
    
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480 } 
    });
    cameraFeed.srcObject = stream;
    
    // Check if face was previously saved
    const saved = localStorage.getItem("userFaceData");
    if (saved) {
      savedFaceDescriptor = JSON.parse(saved);
      faceStatus.innerText = "Face recognized! Click 'Verify Face' to unlock";
      verifyFaceBtn.style.display = "inline-block";
    } else {
      faceStatus.innerText = "No face setup. Click 'Setup My Face' to register";
      setupFaceBtn.style.display = "inline-block";
    }
    
  } catch (error) {
    faceStatus.innerText = "Error: " + error.message;
    debugLog("Face detection error: " + error.message);
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
  // Simple descriptor using face landmarks
  const landmarks = prediction.landmarks;
  return {
    leftEye: landmarks[0],
    rightEye: landmarks[1],
    nose: landmarks[2],
    mouth: landmarks[3],
    leftEar: landmarks[4],
    rightEar: landmarks[5]
  };
}

function compareFaces(face1, face2) {
  // Simple Euclidean distance comparison
  let totalDistance = 0;
  const points = ['leftEye', 'rightEye', 'nose', 'mouth', 'leftEar', 'rightEar'];
  
  for (let point of points) {
    const dx = face1[point][0] - face2[point][0];
    const dy = face1[point][1] - face2[point][1];
    totalDistance += Math.sqrt(dx * dx + dy * dy);
  }
  
  const avgDistance = totalDistance / points.length;
  return avgDistance < 30; // Threshold for matching
}

setupFaceBtn.onclick = async () => {
  faceStatus.innerText = "Look at the camera and hold still...";
  setupFaceBtn.disabled = true;
  
  setTimeout(async () => {
    const face = await detectFace();
    if (face) {
      savedFaceDescriptor = getFaceDescriptor(face);
      localStorage.setItem("userFaceData", JSON.stringify(savedFaceDescriptor));
      faceStatus.innerText = "✅ Face registered! Click 'Verify Face' to unlock";
      setupFaceBtn.style.display = "none";
      verifyFaceBtn.style.display = "inline-block";
    } else {
      faceStatus.innerText = "❌ No face detected. Please try again.";
      setupFaceBtn.disabled = false;
    }
  }, 2000);
};

verifyFaceBtn.onclick = async () => {
  faceStatus.innerText = "Verifying your face...";
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
  toggleBtn.innerText = "Start Listening";
  lockBtn.style.display = "inline-block";
  status.innerText = "✅ Authenticated! Ready to use";
  
  speak("Authentication successful. Hello, I am Bro.", "en-IN");
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

/* ---------- SPEECH RECOGNITION ---------- */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let recognitionActive = false;
let restartTimeout = null;
let lastProcessedCommand = "";
let commandTimeout = null;

function detectLanguage(text) {
  const hindiWords = /hai|kya|ka|kar|bhej|chalu|karo|batao|dikhao|samay|tarikh/;
  return hindiWords.test(text) ? "hi-IN" : "en-IN";
}

function extractCommand(text) {
  const lower = text.toLowerCase();
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

      const command = extractCommand(text);
      if (command && command !== lastProcessedCommand) {
        debugLog(`🎯 Command detected: "${command}"`);
        
        clearTimeout(commandTimeout);
        
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
      
      if (isListening && !speaking && isAuthenticated) {
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
  status.innerText = "Stopped listening";
}

function handleCommand(command) {
  debugLog(`🔧 HANDLING: "${command}"`);
  
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

function toggleListening() {
  if (!isAuthenticated) return;
  
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
  status.innerText = "🔒 Locked - Authenticate to use";
  orbLocked();
  
  // Start face detection
  initFaceDetection();
};
