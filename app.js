/************************************************
 * BRO – WAKE WORD BASED VOICE ASSISTANT
 * Wake word: "bro"
 ************************************************/

const status = document.getElementById("status");
const orb = document.getElementById("orb");

/* ========== ORB STATES ========== */
const orbIdle = () => orb.className = "orb idle";
const orbListening = () => orb.className = "orb listening";
const orbSpeaking = () => orb.className = "orb speaking";

/* ========== SPEAK ========== */
let speaking = false;
function speak(text, lang = "en-IN") {
  if (speaking) return;

  speaking = true;
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = lang;

  orbSpeaking();
  speechSynthesis.cancel();
  speechSynthesis.speak(msg);

  msg.onend = () => {
    speaking = false;
    orbIdle();
  };

  console.log("🤖 Bro:", text);
}

/* ========== SPEECH RECOGNITION ========== */
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const recognition = new SpeechRecognition();
recognition.lang = "en-IN";
recognition.interimResults = true;
recognition.continuous = true;

let buffer = "";
let silenceTimer = null;

/* ========== LANGUAGE DETECTION ========== */
function detectLanguage(text) {
  return /hai|kya|ka|kar|bhej|chalu/.test(text) ? "hi-IN" : "en-IN";
}

/* ========== WAKE WORD CHECK ========== */
function extractCommand(text) {
  const match = text.match(/\bbro\b(.*)/);
  if (!match) return null;        // ❌ no wake word
  return match[1].trim();         // ✅ command after "bro"
}

/* ========== COMMAND ROUTER ========== */
function routeCommand(command, lang) {
  if (!command) return;

  /* MUSIC */
  if (/play|chalao/.test(command)) {
    speak("Playing music", lang);
    const q = encodeURIComponent(command.replace(/play|chalao/g, ""));
    window.open(
      `https://www.youtube.com/results?search_query=${q}`,
      "_blank"
    );
    return;
  }

  /* WEATHER */
  if (/weather|mausam/.test(command)) {
    speak("Weather information requires internet service", lang);
    return;
  }

  /* NEARBY */
  if (/nearby|paas|najdeek/.test(command)) {
    speak("Showing nearby places", lang);
    window.open(
      `https://www.google.com/maps/search/${encodeURIComponent(command)}`,
      "_blank"
    );
    return;
  }

  /* TIME */
  if (/time|samay/.test(command)) {
    speak(new Date().toLocaleTimeString("en-IN"), lang);
    return;
  }

  /* FALLBACK */
  speak(
    lang === "hi-IN"
      ? "Samajh nahi aaya"
      : "I didn't understand that",
    lang
  );
}

/* ========== LISTENING LOGIC ========== */
recognition.onresult = (e) => {
  clearTimeout(silenceTimer);

  for (let i = e.resultIndex; i < e.results.length; i++) {
    buffer += e.results[i][0].transcript.toLowerCase() + " ";
  }

  status.innerText = buffer.trim();

  silenceTimer = setTimeout(() => {
    const text = buffer.trim();
    buffer = "";

    const lang = detectLanguage(text);
    const command = extractCommand(text);

    if (!command) {
      console.log("Ignored (no wake word)");
      return;
    }

    routeCommand(command, lang);
  }, 1000);
};

/* ========== START ON LOAD ========== */
window.onload = () => {
  speak("Hello, this is Bro. Say Bro to give me a command.");
  setTimeout(() => {
    recognition.start();
    orbListening();
    status.innerText = "Listening for wake word: Bro";
  }, 1200);
};
