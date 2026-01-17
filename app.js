/*********************************
 * BRO – STABLE BASE VERSION
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

  msg.onend = () => {
    orbIdle();
  };

  console.log("🤖 Bro:", text);
}

// ---------- SPEECH RECOGNITION ----------
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition;

function startListening() {
  recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = false;   // 🔑 IMPORTANT
  recognition.continuous = false;       // 🔑 IMPORTANT

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
    // Restart automatically after response
    setTimeout(() => {
      if (recognition) startListening();
    }, 800);
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

  speak("I heard you. Say hello, time, or ask my name.");
}

// ---------- MIC ----------
mic.onclick = () => {
  startListening();
};

// Initial
orbIdle();
