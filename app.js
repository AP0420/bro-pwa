/*********************************
 * BRO – SIRI STYLE VOICE ASSISTANT
 * STRICT SECURITY + WHATSAPP WEB
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
recognition.interimResults = false;
recognition.continuous = true;

let listening = false;
let unlocked = false; // 🔒 STRICT: always false initially

// ---------- SECURITY ----------
const SECURITY_QUESTION = "What's up my gang?";
const SECURITY_PASSWORD = "welcome to hood";

// ---------- WHATSAPP STATE ----------
let whatsappStep = null;
let whatsappData = { to: "", message: "", attachment: false };
let pendingAction = null;

// ---------- INTENT ----------
function getIntent(text) {
  if (text.includes("whatsapp")) return "WHATSAPP";
  if (text === "yes") return "YES";
  if (text === "no") return "NO";
  if (text.includes("bye") || text.includes("exit")) return "EXIT";
  return "UNKNOWN";
}

// ---------- WHATSAPP FLOW ----------
function handleWhatsappFlow(text) {
  if (whatsappStep === "to") {
    whatsappData.to = text.replace(/\D/g, "");
    whatsappStep = "message";
    speak("What message should I send?");
    return true;
  }

  if (whatsappStep === "message") {
    whatsappData.message = text;
    whatsappStep = "attachment";
    speak("Do you want to attach any file?");
    return true;
  }

  if (whatsappStep === "attachment") {
    whatsappData.attachment = text.includes("yes");

    pendingAction = () => {
      const message = encodeURIComponent(whatsappData.message);
      const url =
        "https://web.whatsapp.com/send?phone=" +
        whatsappData.to +
        "&text=" +
        message;

      window.open(url, "_blank");
    };

    speak("Opening WhatsApp Web. Please review and send the message.");
    whatsappStep = null;
    return true;
  }

  return false;
}

// ---------- MAIN LISTENER ----------
recognition.onresult = (event) => {
  const text =
    event.results[event.results.length - 1][0].transcript.toLowerCase();
  status.innerText = "You: " + text;

  // 🔒 STRICT SECURITY MODE
  if (!unlocked) {
    if (text.includes(SECURITY_PASSWORD)) {
      unlocked = true;
      speak("Welcome AP");
    } else {
      speak(SECURITY_QUESTION);
    }
    return; // 🚫 NOTHING ELSE RUNS
  }

  // Confirmation step
  if (pendingAction) {
    const intent = getIntent(text);
    if (intent === "YES") {
      speak("Okay, opening now.");
      pendingAction();
      pendingAction = null;
    } else if (intent === "NO") {
      speak("Cancelled.");
      pendingAction = null;
    }
    return;
  }

  // Active WhatsApp flow
  if (whatsappStep && handleWhatsappFlow(text)) return;

  // Wake word required AFTER unlock
  if (!text.includes("bro")) return;

  const intent = getIntent(text);

  switch (intent) {
    case "WHATSAPP":
      whatsappStep = "to";
      speak("Whom should I send the WhatsApp message to?");
      break;

    case "EXIT":
      speak("Bye AP. Talk to you later.");
      unlocked = false;
      recognition.stop();
      listening = false;
      orbIdle();
      break;

    default:
      speak("I am listening. Tell me what you want to do.");
  }
};

// ---------- AUTO RESTART ----------
recognition.onend = () => {
  if (listening) recognition.start();
};

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
