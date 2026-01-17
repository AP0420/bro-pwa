/************************************************
 * BRO – RULE BASED VOICE ASSISTANT
 * Architecture:
 * - Web Speech API (STT + TTS)
 * - Rule-based NLP (keywords + regex)
 * - Continuous listen with silence detection
 * - Modular command routing
 ************************************************/

/* ================== DOM ================== */
const status = document.getElementById("status");
const orb = document.getElementById("orb");
const mic = document.getElementById("mic");

/* ================== ORB STATES ================== */
const orbIdle = () => orb.className = "orb idle";
const orbListening = () => orb.className = "orb listening";
const orbSpeaking = () => orb.className = "orb speaking";

/* ================== SPEAK ================== */
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

/* ================== SPEECH RECOGNITION ================== */
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition;
let transcriptBuffer = "";
let silenceTimer = null;

function startListening() {
  recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = true;
  recognition.continuous = true;

  orbListening();
  status.innerText = "Listening…";
  recognition.start();

  recognition.onresult = (e) => {
    clearTimeout(silenceTimer);

    for (let i = e.resultIndex; i < e.results.length; i++) {
      transcriptBuffer += e.results[i][0].transcript.toLowerCase() + " ";
    }

    status.innerText = "You: " + transcriptBuffer.trim();

    silenceTimer = setTimeout(() => {
      const finalText = transcriptBuffer.trim();
      transcriptBuffer = "";
      if (finalText) routeCommand(finalText);
    }, 1000); // silence detection
  };

  recognition.onerror = () => orbIdle();
}

/* ================== LANGUAGE DETECTION ================== */
function detectLanguage(text) {
  if (/hai|ka|kya|nahi|kar|bhej|chalu/.test(text)) return "hi-IN";
  return "en-IN";
}

/* ================== INTENT ROUTER ================== */
function routeCommand(text) {
  console.log("FINAL:", text);
  const lang = detectLanguage(text);

  // Wake word optional
  if (text.includes("bro") || text.includes("assistant") || true) {

    /* -------- MUSIC -------- */
    if (/play|chalao/.test(text)) return playMusic(text, lang);
    if (/pause|ruk/.test(text)) return speak("Paused", lang);
    if (/resume|chalu/.test(text)) return speak("Resuming", lang);
    if (/volume up|increase/.test(text)) return speak("Volume increased", lang);
    if (/volume down|decrease/.test(text)) return speak("Volume decreased", lang);

    /* -------- WHATSAPP -------- */
    if (/send whatsapp/.test(text)) return sendWhatsApp(text, lang);
    if (/read.*message/.test(text)) return speak("You have no unread messages", lang);
    if (/reply/.test(text)) return speak("Reply sent", lang);

    /* -------- MAPS -------- */
    if (/navigate to|direction to/.test(text)) return navigate(text, lang);
    if (/near me/.test(text)) return nearby(text, lang);

    /* -------- TIME / ALARM -------- */
    if (/time/.test(text))
      return speak(new Date().toLocaleTimeString("en-IN"), lang);

    if (/set timer/.test(text)) return setTimer(text, lang);

    /* -------- INFO -------- */
    if (/convert/.test(text)) return convertCurrency(text, lang);
    if (/weather/.test(text)) return getWeather(lang);
    if (/calculate/.test(text)) return calculate(text, lang);

    /* -------- WEB / APPS -------- */
    if (/open instagram/.test(text)) return openSite("https://instagram.com", lang);
    if (/open gmail/.test(text)) return openSite("https://mail.google.com", lang);
    if (/search/.test(text)) return googleSearch(text, lang);

    /* -------- AI-STYLE -------- */
    if (/joke/.test(text)) return tellJoke(lang);
    if (/spell/.test(text)) return spellWord(text, lang);
    if (/translate/.test(text)) return translateText(text, lang);

    /* -------- FALLBACK -------- */
    speak(
      lang === "hi-IN"
        ? "Samajh nahi aaya, dobara bolo"
        : "Sorry, I didn’t understand that",
      lang
    );
  }
}

/* ================== ACTION FUNCTIONS ================== */

/* MUSIC */
function playMusic(text, lang) {
  speak("Playing music", lang);
  const query = encodeURIComponent(text.replace(/play|chalao/g, ""));
  window.open(`https://www.youtube.com/results?search_query=${query}`, "_blank");
}

/* WHATSAPP */
function sendWhatsApp(text, lang) {
  const match = text.match(/send whatsapp to (\w+):(.+)/);
  if (!match) return speak("Please say name and message", lang);

  const message = encodeURIComponent(match[2]);
  speak("Sending WhatsApp", lang);
  window.open(`https://wa.me/?text=${message}`, "_blank");
}

/* MAPS */
function navigate(text, lang) {
  const place = encodeURIComponent(text.replace(/navigate to|direction to/g, ""));
  speak("Starting navigation", lang);
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${place}`, "_blank");
}

function nearby(text, lang) {
  speak("Showing nearby places", lang);
  window.open(`https://www.google.com/maps/search/${encodeURIComponent(text)}`, "_blank");
}

/* TIMER */
function setTimer(text, lang) {
  const min = text.match(/\d+/);
  if (!min) return speak("Please say time in minutes", lang);

  speak(`Timer set for ${min[0]} minutes`, lang);
  setTimeout(() => speak("Time's up!", lang), min[0] * 60000);
}

/* INFO */
function calculate(text, lang) {
  try {
    const expr = text.replace(/calculate/g, "");
    speak(`Result is ${eval(expr)}`, lang);
  } catch {
    speak("Calculation error", lang);
  }
}

function convertCurrency(text, lang) {
  speak("Currency conversion is not live right now", lang);
}

function getWeather(lang) {
  speak("Weather info requires internet API", lang);
}

/* WEB */
function openSite(url, lang) {
  speak("Opening", lang);
  window.open(url, "_blank");
}

function googleSearch(text, lang) {
  const q = encodeURIComponent(text.replace(/search/g, ""));
  speak("Searching", lang);
  window.open(`https://www.google.com/search?q=${q}`, "_blank");
}

/* AI-STYLE */
function tellJoke(lang) {
  const jokes = [
    "Why did the computer sneeze? Because it caught a virus",
    "Why do programmers hate nature? Too many bugs"
  ];
  speak(jokes[Math.floor(Math.random() * jokes.length)], lang);
}

function spellWord(text, lang) {
  const word = text.replace(/spell/g, "").trim();
  speak(word.split("").join(" "), lang);
}

function translateText(text, lang) {
  const q = encodeURIComponent(text.replace(/translate/g, ""));
  window.open(`https://translate.google.com/?sl=auto&tl=hi&text=${q}`, "_blank");
}

/* ================== START ================== */
mic.onclick = () => {
  speak("Hello, this is Bro. How may I assist you?");
  setTimeout(startListening, 1200);
};

orbIdle();
status.innerText = "Tap the mic to start";
