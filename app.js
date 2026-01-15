/*********************************
 * BRO – SIRI STYLE VOICE ASSISTANT
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

// ---------- SPEECH ----------
function speak(text) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "en-IN";

  orbSpeaking();
  speechSynthesis.cancel();
  speechSynthesis.speak(msg);

  msg.onend = () => {
    orbIdle();
  };

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
let unlocked = sessionStorage.getItem("unlocked") === "true";

// ---------- INTENT ----------
function getIntent(text) {
  if (text.includes("time")) return "TIME";
  if (text.includes("whatsapp")) return "WHATSAPP";
  if (text.includes("mail") || text.includes("email")) return "EMAIL";
  if (text.includes("bye") || text.includes("exit")) return "EXIT";
  return "UNKNOWN";
}

// ---------- MAIN LISTENER ----------
recognition.onresult = (event) => {
  const text =
    event.results[event.results.length - 1][0].transcript.toLowerCase();

  status.innerText = "You: " + text;

  if (!text.includes("bro")) return;

  if (!unlocked) {
    speak("What's my gang");
    unlocked = true;
    sessionStorage.setItem("unlocked", "true");
    return;
  }

  const intent = getIntent(text);

  switch (intent) {
    case "TIME":
      speak("The time is " + new Date().toLocaleTimeString("en-IN"));
      break;

    case "WHATSAPP":
      speak("WhatsApp feature is ready. Tell me the details.");
      break;

    case "EMAIL":
      speak("Email feature is ready. Tell me the details.");
      break;

    case "EXIT":
      speak("Bye. Talk to you later.");
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
