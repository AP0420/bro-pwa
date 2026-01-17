/*********************************
 * BRO – WORK ASSISTANT (STABLE)
 *********************************/

const status = document.getElementById("status");
const mic = document.getElementById("mic");
const orb = document.getElementById("orb");

// ---------- ORB STATES ----------
function orbIdle() { orb.className = "orb idle"; }
function orbListening() { orb.className = "orb listening"; }
function orbSpeaking() { orb.className = "orb speaking"; }

// ---------- SPEAK ----------
let isSpeaking = false;

function speak(text) {
  if (isSpeaking) return; // ⛔ prevent overlap
  isSpeaking = true;

  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "en-IN";

  orbSpeaking();
  speechSynthesis.cancel();
  speechSynthesis.speak(msg);

  msg.onend = () => {
    isSpeaking = false;
    orbIdle();
  };

  console.log("🤖 Bro:", text);
}

// ---------- SPEECH RECOGNITION ----------
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let hasStarted = false;
let hasGreeted = false;
let isHandlingCommand = false;

function startListening() {
  if (isHandlingCommand || isSpeaking) return;

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

  recognition.onerror = () => {
    orbIdle();
  };

  recognition.onend = () => {
    setTimeout(() => {
      startListening();
    }, 1200);
  };
}

// ---------- INTENT DETECTION ----------
function isStartWorkIntent(text) {
  const keywords = [
    "start",
    "starting",
    "begin",
    "work",
    "working",
    "office",
    "job",
    "studying",
    "study"
  ];

  return keywords.some(word => text.includes(word));
}

// ---------- MAIN BRAIN ----------
function processUserInput(text) {
  if (isHandlingCommand || isSpeaking) return;

  console.log("FINAL INPUT:", text);

  // Only react to "bro"
  if (!text.includes("bro")) return;

  // 🧠 START WORK INTENT (ROBUST)
  if (isStartWorkIntent(text)) {
    isHandlingCommand = true;

    speak("Alright AP, opening your work setup.");

    setTimeout(() => {
      window.open(
        "http://outlook.office.com/mail/inbox/id/AAQkADY1ODE5YTg5LWE0ZWItNDczMy05OGNjLTk5YzkxNzMzNDJmNAAQAEUrUSYfY2dJq6PVcGU9qu8%3D",
        "_blank"
      );
      window.open("https://web.whatsapp.com/", "_blank");
      window.open("https://console.acefone.in/livecalls", "_blank");
      window.open("https://crmadmin.oneandro.com/user-management", "_blank");
      window.open(
        "https://desk.zoho.in/agent/oneandro/oneandro-support/tickets/new",
        "_blank"
      );

      isHandlingCommand = false;
    }, 1500);

    return;
  }

  // Simple responses (NO GREETING LOOP)
  if (text.includes("hello") || text.includes("hi")) {
    speak("Hello AP");
    return;
  }

  if (text.includes("time")) {
    speak("The time is " + new Date().toLocaleTimeString("en-IN"));
    return;
  }

  // Silent ignore instead of spam
  console.log("No actionable intent detected");
}

// ---------- MIC ----------
mic.onclick = () => {
  if (!hasStarted) {
    hasStarted = true;

    if (!hasGreeted) {
      hasGreeted = true;
      speak("Hello, this is Bro. How may I assist you?");
      setTimeout(startListening, 1500);
    }
  } else {
    startListening();
  }
};

// ---------- INIT ----------
orbIdle();
status.innerText = "Tap the mic to start";
