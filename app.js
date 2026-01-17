/*********************************
 * BRO – STABLE VOICE ASSISTANT
 * INTRO + LISTEN + RESPOND
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

let recognition = null;
let hasStarted = false; // intro control

function startListening() {
  recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.continuous = false;

  orbListening();
  status.innerText = "Listening...";

  recognition.start();

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript.toLowerCase();
    status.innerText = "You: " + text;
    processUserInput(text);
  };

  recognition.onerror = (e) => {
    console.error("Speech error:", e);
    orbIdle();
  };

  recognition.onend = () => {
    setTimeout(() => {
      startListening();
    }, 700);
  };
}

// ---------- MAIN LOGIC ----------
function processUserInput(text) {
  console.log("FINAL INPUT:", text);

  if (text.includes("hello") || text.includes("hi")) {
    speak("Hello AP");
    return;
  }

  if (text.includes("time")) {
    speak("The time is " + new Date().toLocaleTimeString("en-IN"));
    return;
  }

  if (text.includes("your name")) {
    speak("My name is Bro");
    return;
  }

  speak("I heard you. Please ask me something.");
}

// ---------- MIC CLICK (REQUIRED FOR AUDIO) ----------
mic.onclick = () => {
  if (!hasStarted) {
    hasStarted = true;
    speak("Hello, this is Bro. How may I assist you?");
    setTimeout(() => {
      startListening();
    }, 1200);
  } else {
    startListening();
  }
};

// Initial state
orbIdle();
status.innerText = "Tap the mic to start";
