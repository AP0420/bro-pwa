/*********************************
 * BRO – SIRI STYLE VOICE ASSISTANT
 * FULL LISTEN → SINGLE RESPONSE
 *********************************/

const status = document.getElementById("status");
const mic = document.getElementById("mic");
const orb = document.getElementById("orb");

// ---------- ORB STATES ----------
function orbIdle() {
  orb.className = "orb idle";
}
function orbListening() {
  orb.className = "orb listening";
}
function orbSpeaking() {
  orb.className = "orb speaking";
}

// ---------- SPEAK ----------
function speak(text) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "en-IN";

  orbSpeaking();
  speechSynthesis.cancel();
  speechSynthesis.speak(msg);

  msg.onend = () => orbIdle();
  console.log("🤖 Bro:", text);
}

// ---------- SPEECH RECOGNITION ----------
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const recognition = new SpeechRecognition();
recognition.lang = "en-IN";
recognition.interimResults = true;   // ✅ IMPORTANT
recognition.continuous = true;

let listening = false;
let unlocked = false;

// ---------- SPEECH BUFFER ----------
let finalTranscript = "";
let isProcessing = false;

// ---------- SECURITY ----------
const SECURITY_QUESTION = "What's up my gang?";
const HOOD_VARIANTS = ["hood", "food", "good", "home", "wood"];

function isCorrectPassword(text) {
  text = text.toLowerCase();
  return (
    text.includes("welcome") &&
    HOOD_VARIANTS.some(w => text.includes(w))
  );
}

// ---------- WHATSAPP STATE ----------
let whatsappStep = null;
let whatsappData = { to: "", message: "", attachment: false };
let pendingAction = null;

// ---------- COLLECT SPEECH ----------
recognition.onresult = (event) => {
  let interim = "";

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const transcript = event.results[i][0].transcript.toLowerCase();
    if (event.results[i].isFinal) {
      finalTranscript += transcript + " ";
    } else {
      interim += transcript;
    }
  }

  status.innerText = "You: " + (finalTranscript || interim);
};

// ---------- PROCESS AFTER USER STOPS ----------
recognition.onend = () => {
  if (!finalTranscript || isProcessing) {
    recognition.start();
    return;
  }

  isProcessing = true;

  const text = finalTranscript.trim();
  finalTranscript = "";

  processUserInput(text);

  setTimeout(() => {
    isProcessing = false;
    recognition.start();
  }, 800);
};

// ---------- MAIN BRAIN ----------
function processUserInput(text) {
  console.log("FINAL INPUT:", text);

  // 🔐 STRICT SECURITY (NO BYPASS)
  if (!unlocked) {
    if (isCorrectPassword(text)) {
      unlocked = true;
      speak("Welcome AP");
    } else {
      speak(SECURITY_QUESTION);
    }
    return;
  }

  // Confirmation step
  if (pendingAction) {
    if (text.includes("yes")) {
      speak("Opening now.");
      pendingAction();
      pendingAction = null;
    } else if (text.includes("no")) {
      speak("Cancelled.");
      pendingAction = null;
    }
    return;
  }

  // WhatsApp flow
  if (whatsappStep) {
    handleWhatsappFlow(text);
    return;
  }

  // Wake word required
  if (!text.includes("bro")) return;

  if (text.includes("whatsapp")) {
    whatsappStep = "to";
    speak("Whom should I send the WhatsApp message to?");
    return;
  }

  if (text.includes("exit") || text.includes("bye")) {
    speak("Bye AP. Talk to you later.");
    unlocked = false;
    listening = false;
    recognition.stop();
    orbIdle();
    return;
  }

  speak("I am listening. Tell me what you want to do.");
}

// ---------- WHATSAPP FLOW ----------
function handleWhatsappFlow(text) {
  if (whatsappStep === "to") {
    whatsappData.to = text.replace(/\D/g, "");
    whatsappStep = "message";
    speak("What message should I send?");
    return;
  }

  if (whatsappStep === "message") {
    whatsappData.message = text;
    whatsappStep = "attachment";
    speak("Do you want to attach any file?");
    return;
  }

  if (whatsappStep === "attachment") {
    pendingAction = () => {
      const url =
        "https://web.whatsapp.com/send?phone=" +
        whatsappData.to +
        "&text=" +
        encodeURIComponent(whatsappData.message);
      window.open(url, "_blank");
    };

    speak("Opening WhatsApp Web. Please review and send.");
    whatsappStep = null;
  }
}

// ---------- MIC ----------
mic.onclick = () => {
  if (!listening) {
    listening = true;
    status.innerText = "Listening...";
    orbListening();
    recognition.start();
  }
};

// Initial state
orbIdle();
