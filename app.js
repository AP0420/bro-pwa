/*********************************
 * BRO – SMART VOICE ASSISTANT (PWA)
 *********************************/

const status = document.getElementById("status");
const mic = document.getElementById("mic");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = "en-IN";
recognition.interimResults = false;
recognition.continuous = true;

// ---------- SESSION ----------
let unlocked = sessionStorage.getItem("unlocked") === "true";

// ---------- EMAIL STATE ----------
let emailStep = null;
let emailData = { to: "", subject: "", body: "" };

// ---------- WHATSAPP STATE ----------
let whatsappStep = null;
let whatsappData = { to: "", message: "", attachment: false };

// ---------- UTILITIES ----------
function detectLanguage(text) {
  const hindiWords = ["kya", "kaise", "hai", "nahi", "kar", "bhej", "bolo"];
  if (hindiWords.some(w => text.includes(w))) return "hinglish";
  return "en";
}

function speak(text, lang = "en") {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = lang === "hi" ? "hi-IN" : "en-IN";
  speechSynthesis.cancel();
  speechSynthesis.speak(msg);
  console.log("🤖 Bro:", text);
}

// ---------- INTENT ----------
function getIntent(text) {
  if (text.includes("whatsapp")) return "WHATSAPP";
  if (text.includes("mail") || text.includes("email")) return "EMAIL";
  if (text.includes("time")) return "TIME";
  if (text.includes("bye") || text.includes("exit")) return "EXIT";
  return "UNKNOWN";
}

// ---------- EMAIL FLOW ----------
function handleEmailFlow(text) {
  if (emailStep === "to") {
    emailData.to = text.replace(/\s/g, "");
    emailStep = "subject";
    speak("What should be the subject?");
    return true;
  }
  if (emailStep === "subject") {
    emailData.subject = text;
    emailStep = "body";
    speak("What should I write in the email?");
    return true;
  }
  if (emailStep === "body") {
    emailData.body = text;
    emailStep = null;

    const url =
      "https://mail.google.com/mail/?view=cm&fs=1" +
      "&to=" + encodeURIComponent(emailData.to) +
      "&su=" + encodeURIComponent(emailData.subject) +
      "&body=" + encodeURIComponent(emailData.body);

    speak("I have drafted the email. Please review and send.");
    window.open(url, "_blank");
    emailData = { to: "", subject: "", body: "" };
    return true;
  }
  return false;
}

// ---------- WHATSAPP FLOW ----------
function handleWhatsappFlow(text) {
  if (whatsappStep === "to") {
    whatsappData.to = text.replace(/\s/g, "");
    whatsappStep = "message";
    speak("What message should I send?");
    return true;
  }

  if (whatsappStep === "message") {
    whatsappData.message = text;
    whatsappStep = "attachment";
    speak("Do you want to attach any file? Say yes or no.");
    return true;
  }

  if (whatsappStep === "attachment") {
    whatsappData.attachment = text.includes("yes");

    const url =
      "https://wa.me/" +
      whatsappData.to +
      "?text=" +
      encodeURIComponent(whatsappData.message);

    if (whatsappData.attachment) {
      speak("Opening WhatsApp. Please attach the file manually and send.");
    } else {
      speak("Opening WhatsApp. You can send the message now.");
    }

    window.open(url, "_blank");
    whatsappStep = null;
    whatsappData = { to: "", message: "", attachment: false };
    return true;
  }
  return false;
}

// ---------- MAIN LISTENER ----------
recognition.onresult = (event) => {
  const text = event.results[event.results.length - 1][0].transcript.toLowerCase();
  status.innerText = "You: " + text;

  // Ongoing flows
  if (emailStep && handleEmailFlow(text)) return;
  if (whatsappStep && handleWhatsappFlow(text)) return;

  // Wake word
  if (!text.includes("bro")) return;

  if (!unlocked) {
    speak("What's my gang");
    unlocked = true;
    sessionStorage.setItem("unlocked", "true");
    return;
  }

  const intent = getIntent(text);

  switch (intent) {
    case "EMAIL":
      emailStep = "to";
      speak("Whom should I send the email to?");
      break;

    case "WHATSAPP":
      whatsappStep = "to";
      speak("Whom should I send the WhatsApp message to?");
      break;

    case "TIME":
      speak("The time is " + new Date().toLocaleTimeString("en-IN"));
      break;

    case "EXIT":
      speak("Bye. Talk to you later.");
      sessionStorage.clear();
      unlocked = false;
      recognition.stop();
      break;

    default:
      speak("I am listening. Please tell me what you want to do.");
  }
};

// ---------- AUTO RESTART LISTENING ----------
recognition.onend = () => {
  recognition.start();
};

// ---------- MIC ----------
mic.onclick = () => {
  status.innerText = "Listening...";
  recognition.start();
};
