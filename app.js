/************************************************
 * BRO – WAKE WORD VOICE ASSISTANT (STABLE)
 * Wake word: "bro"
 ************************************************/

const status = document.getElementById("status");
const orb = document.getElementById("orb");

/* ---------- ORB STATES ---------- */
const orbIdle = () => orb.className = "orb idle";
const orbListening = () => orb.className = "orb listening";
const orbSpeaking = () => orb.className = "orb speaking";

/* ---------- SPEAK ---------- */
let speaking = false;
function speak(text, lang = "en-IN", callback) {
  speaking = true;

  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = lang;

  orbSpeaking();
  speechSynthesis.cancel();
  speechSynthesis.speak(msg);

  msg.onend = () => {
    speaking = false;
    orbIdle();
    if (callback) callback();
  };

  console.log("🤖 Bro:", text);
}

/* ---------- SPEECH RECOGNITION ---------- */
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition;
let buffer = "";
let silenceTimer = null;

/* ---------- LANGUAGE ---------- */
function detectLanguage(text) {
  return /hai|kya|ka|kar|bhej|chalu/.test(text) ? "hi-IN" : "en-IN";
}

/* ---------- WAKE WORD ---------- */
function extractCommand(text) {
  const match = text.match(/\bbro\b\s*(.*)/);
  return match ? match[1].trim() : null;
}

/* ---------- START LISTENING ---------- */
function startRecognition() {
  recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = true;
  recognition.continuous = false; // 🔑 VERY IMPORTANT

  buffer = "";
  orbListening();
  status.innerText = "Listening for 'Bro'…";

  recognition.start();

  recognition.onresult = (e) => {
    clearTimeout(silenceTimer);

    for (let i = e.resultIndex; i < e.results.length; i++) {
      buffer += e.results[i][0].transcript.toLowerCase() + " ";
    }

    silenceTimer = setTimeout(() => {
      const text = buffer.trim();
      buffer = "";
      handleSpeech(text);
    }, 800);
  };

  recognition.onerror = () => {
    recognition.stop();
  };

  recognition.onend = () => {
    if (!speaking) {
      setTimeout(startRecognition, 400);
    }
  };
}

/* ---------- MAIN HANDLER ---------- */
function handleSpeech(text) {
  console.log("FINAL:", text);

  const command = extractCommand(text);
  if (!command) {
    console.log("Ignored (no wake word)");
    recognition.stop();
    return;
  }

  const lang = detectLanguage(command);

  /* ---- TIME ---- */
  if (/time|samay/.test(command)) {
    recognition.stop();
    speak(
      new Date().toLocaleTimeString("en-IN"),
      lang,
      startRecognition
    );
    return;
  }

  /* ---- MUSIC ---- */
  if (/play|chalao/.test(command)) {
    recognition.stop();
    speak("Playing music", lang, () => {
      const q = encodeURIComponent(command.replace(/play|chalao/g, ""));
      window.open(
        `https://www.youtube.com/results?search_query=${q}`,
        "_blank"
      );
      startRecognition();
    });
    return;
  }

  /* ---- NEARBY ---- */
  if (/nearby|paas|najdeek/.test(command)) {
    recognition.stop();
    speak("Showing nearby places", lang, () => {
      window.open(
        `https://www.google.com/maps/search/${encodeURIComponent(command)}`,
        "_blank"
      );
      startRecognition();
    });
    return;
  }

  /* ---- FALLBACK ---- */
  recognition.stop();
  speak(
    lang === "hi-IN"
      ? "Samajh nahi aaya"
      : "I didn't understand that",
    lang,
    startRecognition
  );
}

/* ---------- INIT ---------- */
window.onload = () => {
  speak(
    "Hello, this is Bro. Say Bro to give me a command.",
    "en-IN",
    startRecognition
  );
};
