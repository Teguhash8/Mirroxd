import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassPanel } from "./ui/GlassPanel";

export function AIHub() {
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("Tolong buatkan deskripsi singkat untuk video klip gaming saya.");
  const [response, setResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Load API key from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("mirroxd_ai_api_key");
    if (saved) setApiKey(saved);
  }, []);

  const handleSaveKey = (val: string) => {
    setApiKey(val);
    localStorage.setItem("mirroxd_ai_api_key", val);
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      setResponse("⚠️ Silahkan masukkan API Key terlebih dahulu.");
      return;
    }
    
    setIsProcessing(true);
    setResponse("");

    try {
      // Direct fetch to Gemini API
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await res.json();
      if (data.error) {
        setResponse(`Error: ${data.error.message}`);
      } else {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada respon dari AI.";
        setResponse(text);
      }
    } catch (err: any) {
      setResponse(`Gagal menghubungi API Asli: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Configure AI */}
      <GlassPanel padding="16px">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "var(--color-text-primary)" }}>
          Samur.AI Configuration
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 12 }}>
          Sambungkan ke Endpoint asli (Google Gemini API). Dapatkan key di Google AI Studio.
        </div>
        <input
          type="password"
          placeholder="Paste API Key Anda di sini..."
          value={apiKey}
          onChange={(e) => handleSaveKey(e.target.value)}
          style={{
            width: "100%", padding: "10px", borderRadius: 8,
            border: "1px solid var(--color-border)", background: "var(--color-bg-elevated)",
            color: "var(--color-text-primary)", fontSize: 12, outline: "none",
            boxShadow: "var(--shadow-sm)"
          }}
        />
      </GlassPanel>

      {/* AI Process Panel */}
      <GlassPanel padding="16px">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "var(--color-text-primary)" }}>
          AI Editor Assistant
        </div>
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          style={{
            width: "100%", padding: "10px", borderRadius: 8,
            border: "1px solid var(--color-border)", background: "var(--color-bg)",
            color: "var(--color-text-primary)", fontSize: 12, resize: "none", outline: "none"
          }}
        />
        
        <motion.button
          onClick={handleGenerate}
          disabled={isProcessing}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            marginTop: 12, width: "100%", padding: "10px 16px", borderRadius: "8px",
            border: "none", background: "var(--color-accent)", color: "white",
            fontSize: 13, fontWeight: 600, cursor: isProcessing ? "wait" : "pointer",
            opacity: isProcessing ? 0.7 : 1, display: "flex", justifyContent: "center", gap: 8
          }}
        >
          {isProcessing ? "🧠 Memproses AI..." : "✨ Generate Jawaban"}
        </motion.button>
      </GlassPanel>

      {/* Response Box */}
      {response && (
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
        >
          <GlassPanel variant="accent" padding="16px">
             <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-accent)", marginBottom: 6 }}>
               AI Output:
             </div>
             <div style={{ fontSize: 12, color: "var(--color-text-primary)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
               {response}
             </div>
          </GlassPanel>
        </motion.div>
      )}
    </div>
  );
}
