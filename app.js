/************************************************
 * BRO – VOICE ASSISTANT WITH FACE AUTH & SECURITY
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
let failedAttempts = 0;
const maxFailedAttempts = 3;

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
    // Check if blazeface is available
    if (typeof blazeface === 'undefined') {
      faceStatus.innerText = "Face model not loaded. Please check if blazeface.js is included.";
      debugLog("❌ Blazeface not loaded. Make sure to include blazeface.js in your HTML");
      return;
    }
    
    blazefaceModel = await blazeface.load();
    faceStatus.innerText = "Starting camera...";
    
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480 } 
    });
    cameraFeed.srcObject = stream;
    
    // Check if face was previously saved
    const saved = localStorage.getItem("userFaceData");
    if (saved) {
      try {
        savedFaceDescriptor = JSON.parse(saved);
        faceStatus.innerText = "Face recognized! Click 'Verify Face' to unlock";
        if (verifyFaceBtn) verifyFaceBtn.style.display = "inline-block";
      } catch (e) {
        debugLog("Error parsing saved face data: " + e.message);
        localStorage.removeItem("userFaceData");
      }
    } else {
      faceStatus.innerText = "No face setup. Click 'Setup My Face' to register";
      if (setupFaceBtn) setupFaceBtn.style.display = "inline-block";
    }
    
  } catch (error) {
    faceStatus.innerText = "Error: " + error.message;
    debugLog("Face detection error: " + error.message);
  }
}

async function detectFace() {
  if (!blazefaceModel) return null;
  
  if (cameraFeed.videoWidth === 0 || cameraFeed.videoHeight === 0) {
    debugLog("Camera feed not ready");
    return null;
  }
  
  canvas.width = cameraFeed.videoWidth;
  canvas.height = cameraFeed.videoHeight;
  ctx.drawImage(cameraFeed, 0, 0);
  
  try {
    const predictions = await blazefaceModel.estimateFaces(canvas, false);
    return predictions.length > 0 ? predictions[0] : null;
  } catch (error) {
    debugLog("Face detection failed: " + error.message);
    return null;
  }
}

function getFaceDescriptor(prediction) {
  if (!prediction || !prediction.landmarks) return null;
  
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
  if (!face1 || !face2) return false;
  
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

if (setupFaceBtn) {
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
}

if (verifyFaceBtn) {
  verifyFaceBtn.onclick = async () => {
    faceStatus.innerText = "Verifying your face...";
    verifyFaceBtn.disabled = true;
    
    let attempts = 0;
    const maxAttempts = 3;
    let verificationComplete = false;
    
    const verifyInterval = setInterval(async () => {
      const face = await detectFace();
      attempts++;
      
      if (face && savedFaceDescriptor) {
        const currentDescriptor = getFaceDescriptor(face);
        const isMatch = compareFaces(savedFaceDescriptor, currentDescriptor);
        
        if (isMatch) {
          faceStatus.innerText = "✅ Face verified! Access granted";
          clearInterval(verifyInterval);
          failedAttempts = 0;
          unlockApp();
          verificationComplete = true;
        } else if (attempts >= maxAttempts) {
          clearInterval(verifyInterval);
          failedAttempts++;
          
          if (failedAttempts >= maxFailedAttempts) {
            showSecurityAlert();
          } else {
            faceStatus.innerText = `❌ ACCESS DENIED! Unrecognized face detected. (${failedAttempts}/${maxFailedAttempts} attempts)`;
            const msg = new SpeechSynthesisUtterance("Access denied! Unrecognized face detected.");
            msg.rate = 1.2;
            msg.pitch = 0.8;
            speechSynthesis.speak(msg);
            verifyFaceBtn.disabled = false;
          }
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(verifyInterval);
        faceStatus.innerText = "❌ No face detected. Try again.";
        verifyFaceBtn.disabled = false;
      }
    }, 1000);
  };
}

function showSecurityAlert() {
  // Hide camera feed
  faceOverlay.innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <h1 style="font-size: 4rem; color: #ef4444; margin-bottom: 30px;">🚨 SECURITY BREACH 🚨</h1>
      <div style="font-size: 2rem; color: #fff; margin-bottom: 40px;">
        UNAUTHORIZED ACCESS ATTEMPT DETECTED!
      </div>
      <div style="margin: 40px auto; max-width: 500px;">
        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Cdefs%3E%3ClinearGradient id='bodyGrad' x1='0%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23ff6b6b;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23c92a2a;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Cg transform='translate(200,200)'%3E%3Crect x='-60' y='0' width='120' height='140' rx='15' fill='url(%23bodyGrad)'/%3E%3Ccircle cx='0' cy='-40' r='50' fill='%23ff8787'/%3E%3Crect x='-65' y='40' width='25' height='80' rx='12' fill='%23c92a2a'/%3E%3Crect x='40' y='40' width='25' height='80' rx='12' fill='%23c92a2a'/%3E%3Crect x='-65' y='100' width='30' height='70' rx='12' fill='%23a61e4d'/%3E%3Crect x='35' y='100' width='30' height='70' rx='12' fill='%23a61e4d'/%3E%3Cellipse cx='-15' cy='-45' rx='8' ry='10' fill='%23fff'/%3E%3Cellipse cx='15' cy='-45' rx='8' ry='10' fill='%23fff'/%3E%3Cellipse cx='-15' cy='-45' rx='4' ry='5' fill='%23000'/%3E%3Cellipse cx='15' cy='-45' rx='4' ry='5' fill='%23000'/%3E%3Cpath d='M -15,-25 Q 0,-30 15,-25' stroke='%23000' stroke-width='3' fill='none'/%3E%3Cellipse cx='0' cy='-15' rx='12' ry='8' fill='%23ffd43b'/%3E%3Cpath d='M -25,-60 L -40,-75 L -35,-80 L -20,-65 Z' fill='%23868e96'/%3E%3Cpath d='M 25,-60 L 40,-75 L 35,-80 L 20,-65 Z' fill='%23868e96'/%3E%3Cg transform='translate(80,-20) rotate(25)'%3E%3Crect x='0' y='0' width='15' height='60' rx='7' fill='%234a5568'/%3E%3Crect x='0' y='50' width='35' height='15' rx='7' fill='%232d3748'/%3E%3Crect x='25' y='53' width='8' height='9' fill='%23718096'/%3E%3Cpath d='M 33,57 L 50,57 L 48,62 L 35,62 Z' fill='%23ffd43b' stroke='%23ff6b00' stroke-width='2'/%3E%3Cpath d='M 48,57 L 70,45 L 68,50 L 48,62 Z' fill='%23ffd43b' stroke='%23ff6b00' stroke-width='2'/%3E%3Cpath d='M 48,57 L 70,69 L 68,64 L 48,62 Z' fill='%23ffd43b' stroke='%23ff6b00' stroke-width='2'/%3E%3C/g%3E%3Ctext x='-45' y='180' font-family='Arial Black' font-size='24' fill='%23fff' font-weight='bold'%3ESECURITY%3C/text%3E%3C/g%3E%3C/svg%3E" alt="Security Robot" style="width: 100%; max-width: 400px; animation: shake 0.5s infinite;">
      </div>
      <div style="font-size: 3rem; color: #ff6b6b; font-weight: bold; margin: 30px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); animation: blink 0.5s infinite;">
        GET THE F**K OUT OF HERE!
      </div>
      <div style="font-size: 1.2rem; color: #ffd43b; margin-top: 20px;">
        ⚠️ This incident has been logged ⚠️
      </div>
      <button onclick="resetSecurity()" style="margin-top: 40px; background: #c92a2a; border: 3px solid #fff; color: white; padding: 15px 40px; font-size: 1.2rem; border-radius: 50px; cursor: pointer; font-weight: bold;">
        RESET SECURITY
      </button>
    </div>
    <style>
      @keyframes shake {
        0%, 100% { transform: translateX(0) rotate(0deg); }
        25% { transform: translateX(-10px) rotate(-2deg); }
        75% { transform: translateX(10px) rotate(2deg); }
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
    </style>
  `;
  
  // Play aggressive warning sound
  const warningMsg = new SpeechSynthesisUtterance("Security breach detected! Get the fuck out of here! Unauthorized access will be reported!");
  warningMsg.rate = 1.3;
  warningMsg.pitch = 0.7;
  warningMsg.volume = 1.0;
  speechSynthesis.speak(warningMsg);
}

function resetSecurity() {
  failedAttempts = 0;
  location.reload(); // Reload the page to reinitialize everything
}

if (skipAuthBtn) {
  skipAuthBtn.onclick = () => {
    unlockApp();
  };
}

function unlockApp() {
  isAuthenticated = true;
  faceOverlay.classList.add("hidden");
  
  // Stop camera
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  
  orbIdle();
  if (toggleBtn) {
    toggleBtn.disabled = false;
    toggleBtn.innerText = "Start Listening";
  }
  if (lockBtn) lockBtn.style.display = "inline-block";
  status.innerText = "✅ Authenticated! Ready to use";
  
  speak("Authentication successful. Hello, I am Bro.", "en-IN");
}

function lockApp() {
  isAuthenticated = false;
  stopRecognition();
  orbLocked();
  if (toggleBtn) {
    toggleBtn.disabled = true;
    toggleBtn.innerText = "🔒 Locked";
  }
  if (lockBtn) lockBtn.style.display = "none";
  status.innerText = "🔒 App locked";
  faceOverlay.classList.remove("hidden");
  if (verifyFaceBtn) verifyFaceBtn.disabled = false;
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
      
      if (transcriptEl) {
        transcriptEl.innerText = text || "—";
      }

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

  /* ---- GREETINGS ---- */
  if (/hello|hi|hey|namaste|namaskar/i.test(command)) {
    const greetings = [
      "Hello! How can I help you today?",
      "Hey there! What do you need?",
      "Hi! I'm here to assist you.",
      "Namaste! What can I do for you?"
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    speak(greeting, lang, () => { if (isListening) startRecognition(); });
    return;
  }

  /* ---- HOW ARE YOU ---- */
  if (/how are you|kaise ho|kaisa hai/i.test(command)) {
    speak(
      lang === "hi-IN" 
        ? "Main bilkul theek hoon, aapka shukriya! Aap kaise hain?" 
        : "I'm doing great, thank you! How are you?",
      lang,
      () => { if (isListening) startRecognition(); }
    );
    return;
  }

  /* ---- WHO ARE YOU ---- */
  if (/who are you|what are you|aap kaun ho|tum kaun ho/i.test(command)) {
    speak(
      lang === "hi-IN"
        ? "Main Bro hoon, aapka personal voice assistant. Main aapki madad karne ke liye yahan hoon."
        : "I'm Bro, your personal voice assistant. I'm here to help you with various tasks.",
      lang,
      () => { if (isListening) startRecognition(); }
    );
    return;
  }

  /* ---- WHAT CAN YOU DO ---- */
  if (/what can you do|help|commands|kya kar sakte ho|madad/i.test(command)) {
    speak(
      lang === "hi-IN"
        ? "Main aapko time bata sakta hoon, date bata sakta hoon, music chala sakta hoon, WhatsApp khol sakta hoon, aur nearby jagah dikha sakta hoon. Aap mujhe Bro assemble bol kar apne kaam ke sab links bhi khol sakte hain."
        : "I can tell you the time, date, play music, open WhatsApp, show nearby places, and open all your work links with the assemble command. Just say Bro followed by what you need!",
      lang,
      () => { if (isListening) startRecognition(); }
    );
    return;
  }

  /* ---- THANK YOU ---- */
  if (/thank you|thanks|shukriya|dhanyavaad/i.test(command)) {
    const responses = [
      "You're welcome!",
      "Happy to help!",
      "Anytime!",
      "Koi baat nahi!"
    ];
    const response = responses[Math.floor(Math.random() * responses.length)];
    speak(response, lang, () => { if (isListening) startRecognition(); });
    return;
  }

  /* ---- WEATHER ---- */
  if (/weather|mausam|temperature/i.test(command)) {
    speak(
      lang === "hi-IN"
        ? "Main abhi weather check nahi kar sakta, lekin main aapke liye weather website khol sakta hoon."
        : "I can't check the weather right now, but I can open a weather website for you.",
      lang,
      () => {
        window.open("https://weather.com", "_blank");
        if (isListening) setTimeout(startRecognition, 1000);
      }
    );
    return;
  }

  /* ---- NEWS ---- */
  if (/news|khabar|samachar/i.test(command)) {
    speak(
      lang === "hi-IN"
        ? "Latest news dikha raha hoon"
        : "Opening latest news for you",
      lang,
      () => {
        window.open("https://news.google.com", "_blank");
        if (isListening) setTimeout(startRecognition, 1000);
      }
    );
    return;
  }

  /* ---- GOOGLE SEARCH ---- */
  if (/search|google|khojo|dhundo/i.test(command)) {
    const query = command.replace(/search|google|khojo|dhundo/gi, "").trim();
    speak(
      lang === "hi-IN" ? "Google pe search kar raha hoon" : "Searching on Google",
      lang,
      () => {
        window.open(
          `https://www.google.com/search?q=${encodeURIComponent(query || "search")}`,
          "_blank"
        );
        if (isListening) setTimeout(startRecognition, 1000);
      }
    );
    return;
  }

  /* ---- OPEN GMAIL ---- */
  if (/gmail|email|mail|inbox/i.test(command)) {
    speak(
      lang === "hi-IN" ? "Gmail khol raha hoon" : "Opening Gmail",
      lang,
      () => {
        window.open("https://mail.google.com", "_blank");
        if (isListening) setTimeout(startRecognition, 1000);
      }
    );
    return;
  }

  /* ---- OPEN YOUTUBE ---- */
  if (/youtube|video/i.test(command) && !/play|chalao/i.test(command)) {
    speak(
      lang === "hi-IN" ? "YouTube khol raha hoon" : "Opening YouTube",
      lang,
      () => {
        window.open("https://www.youtube.com", "_blank");
        if (isListening) setTimeout(startRecognition, 1000);
      }
    );
    return;
  }

  /* ---- JOKE ---- */
  if (/joke|funny|hasao|mazak/i.test(command)) {
    const jokes = [
      "Why don't scientists trust atoms? Because they make up everything!",
      "Why did the scarecrow win an award? Because he was outstanding in his field!",
      "What do you call a bear with no teeth? A gummy bear!",
      "Ek baar ek smartphone doctor ke paas gaya. Doctor ne kaha, screen todne ki aadat chhod do!",
      "Teacher: Where is your homework? Student: I made it into a paper plane and it flew away!"
    ];
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    speak(joke, lang, () => { if (isListening) startRecognition(); });
    return;
  }

  /* ---- MOTIVATIONAL QUOTE ---- */
  if (/motivate|inspire|quote|hausla/i.test(command)) {
    const quotes = [
      "Believe you can and you're halfway there.",
      "The only way to do great work is to love what you do.",
      "Don't watch the clock; do what it does. Keep going.",
      "Sapne wo nahi jo neend mein aaye, sapne wo hain jo neend ude de.",
      "Success is not final, failure is not fatal: it is the courage to continue that counts."
    ];
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    speak(quote, lang, () => { if (isListening) startRecognition(); });
    return;
  }

  /* ---- CALCULATOR ---- */
  if (/calculate|math|plus|minus|multiply|divide|jodo|ghata|guna/i.test(command)) {
    speak(
      lang === "hi-IN" ? "Calculator khol raha hoon" : "Opening calculator",
      lang,
      () => {
        window.open("https://www.google.com/search?q=calculator", "_blank");
        if (isListening) setTimeout(startRecognition, 1000);
      }
    );
    return;
  }

  /* ---- REMINDER ---- */
  if (/remind|reminder|yaad|yaad dilao/i.test(command)) {
    speak(
      lang === "hi-IN"
        ? "Main abhi reminders set nahi kar sakta, lekin aap Google Calendar use kar sakte hain."
        : "I can't set reminders yet, but you can use Google Calendar for that.",
      lang,
      () => {
        window.open("https://calendar.google.com", "_blank");
        if (isListening) setTimeout(startRecognition, 1000);
      }
    );
    return;
  }

  /* ---- GOOD MORNING/NIGHT ---- */
  if (/good morning|good night|good afternoon|shubh ratri|namaste/i.test(command)) {
    const hour = new Date().getHours();
    let response = "";
    
    if (hour < 12) {
      response = lang === "hi-IN" ? "Shubh prabhaat! Aaj ka din shubh ho!" : "Good morning! Have a great day!";
    } else if (hour < 17) {
      response = lang === "hi-IN" ? "Namaste! Aapka din kaisa ja raha hai?" : "Good afternoon! How's your day going?";
    } else {
      response = lang === "hi-IN" ? "Shubh sandhya! Aapka din kaisa raha?" : "Good evening! How was your day?";
    }
    
    speak(response, lang, () => { if (isListening) startRecognition(); });
    return;
  }

  /* ---- STOP/SHUTDOWN ---- */
  if (/stop|shutdown|band karo|chup|quiet/i.test(command)) {
    speak(
      lang === "hi-IN"
        ? "Theek hai, main band ho raha hoon. Dobara milenge!"
        : "Okay, shutting down. See you later!",
      lang,
      () => {
        stopRecognition();
        if (toggleBtn) toggleBtn.innerText = "Start Listening";
      }
    );
    return;
  }
  
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
      ? "Samajh nahi aaya, kripya dobara boliye. Aap mujhse time, date, music, WhatsApp, ya help ke baare mein pooch sakte hain."
      : "I didn't understand that, please try again. You can ask me about time, date, music, WhatsApp, or say help to know more.",
    lang,
    () => { if (isListening) startRecognition(); }
  );
}

if (toggleBtn) {
  toggleBtn.onclick = function() {
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
  };
}

if (lockBtn) {
  lockBtn.onclick = lockApp;
}

/* ---------- INIT ---------- */
window.addEventListener('load', () => {
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
});

// Make functions available globally
window.resetSecurity = resetSecurity;
window.unlockApp = unlockApp;
window.lockApp = lockApp;
