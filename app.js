/*********************************
 * BRO – STABLE VOICE ASSISTANT
 * SILENCE-DETECTION BASED RESPONSE
 *********************************/

const status = document.getElementById("status");
const mic = document.getElementById("mic");
const orb = document.getElementById("orb");

// ---------- ORB STATES ----------
function orbIdle() { orb.className = "orb idle"; }
function orbListening() { orb.className = "orb listening"; }
function orbSpeaking() { orb.className = "orb speaking"; }

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
recognition.interimResults = true;
recognition.continuous = true;

let listening = false;
let unlocked = false;

// ---------- SPEECH BUFFER ----------
let transcriptBuffer = "";
let silenceTimer = null;

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

// ---------- WHATSAPP ----------
let whatsappStep = null;
let whatsappData = { to: "", message: "" };
let pendingAction = null;

// ---------- SPEECH INPUT ----------
recognition.onresult = (event) => {
  clearTimeout(silenceTimer);

  for (let i = event.resultIndex; i < event.results.length; i++) {
    transcriptBuffer += event.results[i][0].transcript.toLowerCase() + " ";
  }

  status.innerText = "You: " + transcriptBuffer.trim();

  // 🔕 silence detection (user stopped speaking)
  silenceTimer = setTimeout(() => {
    const finalText = transcriptBuffer.trim();
    transcriptBuffer = "";

    if (finalText) {
      processUserInput(finalText);
    }
  }, 1000); // 1 second silence
};

// ---------- MAIN BRAIN ----------
function processUserInput(text) {
  console.log("FINAL INPUT:", text);

  // 🔐 SECURITY (STRICT)
  if (!unlocked) {
    if (isCorrectPassword(text)) {
      unlocked = true;
      speak("Welcome AP");
    } else {
      speak(SECURITY_QUESTION);
    }
    return;
  }

  // Confirmation
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

  // Wake word
  if (!text.includes("bro")) return;

  if (text.includes("whatsapp")) {
    whatsappStep = "to";
    speak("Whom should I send the WhatsApp message to?");
    return;
  }

  if (text.includes("bye") || text.includes("exit")) {
    speak("Bye AP. Talk to you later.");
    unlocked = false;
    recognition.stop();
    listening = false;
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
    pendingAction = () => {
      const url =
        "https://web.whatsapp.com/send?phone=" +
        whatsappData.to +
        "&text=" +
        encodeURIComponent(whatsappData.message);
      window.open(url, "_blank");
    };
    whatsappStep = null;
    speak("Opening WhatsApp Web. Please review and send.");
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

// Initial
orbIdle();
