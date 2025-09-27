import React, { useEffect, useState, useRef } from "react";

// BirthdayCustomizerApp.jsx
// Single-file React component. TailwindCSS assumed to be available in the host project.
// Default export a React component that implements a mobile-friendly customizable birthday page
// Features:
// 1. Upload photo, set name & age
// 2. Custom message
// 3. 3 minigames: Blow Candle (mic or tap), Guess Card, Pop Balloons
// 4. Save in localStorage and generate shareable link (encoded in URL hash)

// Utilities: encode/decode state to/from URL
const encodeState = (state) => {
  try {
    const s = JSON.stringify(state);
    return btoa(unescape(encodeURIComponent(s)));
  } catch (e) {
    return "";
  }
};
const decodeState = (hash) => {
  try {
    if (!hash) return null;
    const clean = hash.replace(/^#?data=/, "");
    const json = decodeURIComponent(escape(atob(clean)));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};

export default function BirthdayCustomizerApp() {
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [name, setName] = useState("Teman");
  const [age, setAge] = useState(18);
  const [message, setMessage] = useState("Selamat ulang tahun!");

  const [savedLinks, setSavedLinks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("birthday_saved_links") || "[]");
    } catch (e) {
      return [];
    }
  });

  // load from URL if present
  useEffect(() => {
    const st = decodeState(window.location.hash);
    if (st) {
      if (st.photoDataUrl) setPhotoDataUrl(st.photoDataUrl);
      if (st.name) setName(st.name);
      if (st.age) setAge(st.age);
      if (st.message) setMessage(st.message);
    }
  }, []);

  // handle image upload
  const handlePhoto = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhotoDataUrl(e.target.result);
    reader.readAsDataURL(file);
  };

  // generate shareable link
  const generateLink = () => {
    const state = { photoDataUrl, name, age, message };
    const encoded = encodeState(state);
    const url = window.location.origin + window.location.pathname + `#data=${encoded}`;
    return url;
  };

  const copyLink = async () => {
    try {
      const url = generateLink();
      await navigator.clipboard.writeText(url);
      alert("Link tersalin ke clipboard!");
    } catch (e) {
      prompt("Salin manual link berikut:", generateLink());
    }
  };

  const saveLinkLocally = () => {
    const url = generateLink();
    const entry = { id: Date.now(), name: name || "Untitled", url, created: new Date().toISOString() };
    const arr = [entry, ...savedLinks].slice(0, 20);
    setSavedLinks(arr);
    localStorage.setItem("birthday_saved_links", JSON.stringify(arr));
    alert("Tersimpan di device kamu. Kamu bisa buka menu 'Saved' untuk melihatnya.");
  };

  const loadSavedEntry = (entry) => {
    try {
      const st = decodeState(entry.url.split("#data=")[1] ? `#data=${entry.url.split("#data=")[1]}` : window.location.hash);
      if (st) {
        if (st.photoDataUrl) setPhotoDataUrl(st.photoDataUrl);
        if (st.name) setName(st.name);
        if (st.age) setAge(st.age);
        if (st.message) setMessage(st.message);
        // replace hash so sharing works
        window.location.hash = `data=${encodeState(st)}`;
      } else {
        alert("Gagal memuat data.");
      }
    } catch (e) {
      alert("Gagal memuat saved entry.");
    }
  };

  // --- Minigames components ---

  // 1) Blow Candle: use microphone amplitude detection if allowed, fallback: press & hold
  function BlowCandle({ onWin }) {
    const [lit, setLit] = useState(true);
    const [listening, setListening] = useState(false);
    const audioRef = useRef(null);
    const analyserRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
      return () => {
        stopMic();
      };
    }, []);

    const startMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = { analyser, ctx, stream };
        setListening(true);
        listenVolume();
      } catch (e) {
        alert("Tidak bisa mengakses mikrofon. Gunakan tekan-lama untuk meniup.");
      }
    };
    const stopMic = () => {
      if (analyserRef.current) {
        try {
          analyserRef.current.stream.getTracks().forEach((t) => t.stop());
          analyserRef.current.ctx.close();
        } catch (e) {}
        analyserRef.current = null;
      }
      setListening(false);
      cancelAnimationFrame(rafRef.current);
    };
    const listenVolume = () => {
      const { analyser } = analyserRef.current;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const check = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        // console.log(avg);
        if (avg > 30) {
          // detected loud
          blow();
          stopMic();
          return;
        }
        rafRef.current = requestAnimationFrame(check);
      };
      rafRef.current = requestAnimationFrame(check);
    };

    const blow = () => {
      setLit(false);
      setTimeout(() => {
        onWin && onWin();
        setLit(true);
      }, 1200);
    };

    return (
      <div className="p-3 bg-white/80 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-2">Minigame: Tiup Lilin</h3>
        <div className="flex flex-col items-center gap-3">
          <div className="w-40 h-40 rounded-xl bg-gradient-to-br from-pink-200 to-yellow-100 flex items-center justify-center relative">
            {photoDataUrl ? (
              <img src={photoDataUrl} alt="photo" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <div className="text-sm text-gray-600">(Foto preview)</div>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-end gap-2">
              <div className="flex flex-col items-center">
                <div className={`text-3xl ${lit ? 'opacity-100' : 'opacity-30'}`}>🕯️</div>
                <div className={`text-4xl ${lit ? '' : 'opacity-30'}`}>🔥</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {!listening ? (
              <button className="px-3 py-2 rounded bg-indigo-500 text-white" onClick={startMic}>
                Gunakan Mikrofon (opsional)
              </button>
            ) : (
              <button className="px-3 py-2 rounded bg-red-400 text-white" onClick={stopMic}>
                Stop Mic
              </button>
            )}
            <button
              className="px-3 py-2 rounded bg-emerald-500 text-white"
              onPointerDown={() => setLit(false)}
              onPointerUp={() => {
                onWin && onWin();
                setTimeout(() => setLit(true), 800);
              }}
            >
              Tekan & Tahan untuk meniup
            </button>
          </div>
          <div className="text-sm text-gray-500">(Jika mic tidak tersedia, gunakan tombol tekan & tahan)</div>
        </div>
      </div>
    );
  }

  // 2) Guess Card
  function GuessCard({ onWin }) {
    const [cards, setCards] = useState(["❓", "❓", "❓"]);
    const [winningIndex, setWinningIndex] = useState(null);
    const [revealed, setRevealed] = useState(false);

    const shuffle = () => {
      const idx = Math.floor(Math.random() * 3);
      setWinningIndex(idx);
      setCards(["🂠", "🂠", "🂠"]);
      setRevealed(false);
    };
    useEffect(() => shuffle(), []);

    const pick = (i) => {
      setCards((c) => c.map((_, idx) => (idx === i ? "🂡" : "🂠")));
      setRevealed(true);
      setTimeout(() => {
        setCards((c) => c.map((_, idx) => (idx === winningIndex ? "🎉" : "❌")));
        if (i === winningIndex) {
          onWin && onWin();
        }
      }, 700);
    };

    return (
      <div className="p-3 bg-white/80 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-2">Minigame: Tebak Kartu</h3>
        <div className="flex justify-center gap-3">
          {cards.map((c, i) => (
            <button
              key={i}
              onClick={() => !revealed && pick(i)}
              className="w-20 h-28 rounded-lg shadow-md flex items-center justify-center text-2xl bg-white"
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button className="px-3 py-2 bg-sky-500 text-white rounded" onClick={shuffle}>
            Acak Lagi
          </button>
        </div>
      </div>
    );
  }

  // 3) Pop Balloons
  function PopBalloons({ onWin }) {
    const [balloons, setBalloons] = useState([]);
    const [popped, setPopped] = useState(0);
    const goal = 6;

    useEffect(() => {
      reset();
    }, []);

    const reset = () => {
      setPopped(0);
      const arr = Array.from({ length: 8 }).map((_, i) => ({ id: i, left: Math.random() * 80 + 10, popped: false, delay: Math.random() * 1200 }));
      setBalloons(arr);
    };

    const pop = (id) => {
      setBalloons((b) => b.map((x) => (x.id === id ? { ...x, popped: true } : x)));
      setPopped((p) => {
        const np = p + 1;
        if (np >= goal) {
          setTimeout(() => onWin && onWin(), 400);
        }
        return np;
      });
    };

    return (
      <div className="p-3 bg-white/80 rounded-lg shadow-md relative overflow-hidden h-64">
        <h3 className="text-lg font-semibold mb-2">Minigame: Pencet Balon</h3>
        <div className="absolute inset-0">
          {balloons.map((b) => (
            <div
              key={b.id}
              onClick={() => !b.popped && pop(b.id)}
              style={{ left: `${b.left}%`, bottom: `${b.popped ? -40 : -10}px`, transition: 'transform 400ms, bottom 4s linear', transform: b.popped ? 'scale(0)' : 'scale(1)' }}
              className={`absolute w-12 h-16 flex items-end justify-center cursor-pointer select-none`}
            >
              {!b.popped ? (
                <div className="text-3xl">🎈</div>
              ) : (
                <div className="text-2xl">💥</div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-40 text-center">Popped: {popped}/{goal}</div>
        <div className="flex gap-2 mt-2">
          <button className="px-3 py-2 bg-rose-500 text-white rounded" onClick={reset}>
            Mulai Ulang
          </button>
        </div>
      </div>
    );
  }

  // small toast for wins
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  const handleWin = (text = "Kamu menang!") => {
    setToast(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-pink-50 p-4 sm:p-6 md:p-12">
      <div className="max-w-xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Pembuat Undangan Ulang Tahun</h1>
          <div className="text-sm text-gray-500">Mobile-friendly · Android OK</div>
        </header>

        <section className="bg-white/90 p-4 rounded-lg shadow mb-4">
          <h2 className="font-semibold mb-2">Customisasi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Foto</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhoto(e.target.files && e.target.files[0])}
                className="block w-full text-sm mt-1"
              />
              {photoDataUrl && <img src={photoDataUrl} alt="preview" className="mt-2 w-full h-32 object-cover rounded" />}
            </div>

            <div>
              <label className="text-sm">Nama</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="block w-full mt-1 p-2 rounded border" />
              <label className="text-sm mt-2 block">Umur</label>
              <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} className="block w-full mt-1 p-2 rounded border" />
            </div>
          </div>

          <div className="mt-3">
            <label className="text-sm">Ucapan</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full mt-1 p-2 rounded border" rows={3}></textarea>
          </div>
        </section>

        <section className="mb-4">
          <h2 className="font-semibold mb-2">Preview</h2>
          <div className="bg-white/90 p-4 rounded-lg shadow">
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                {photoDataUrl ? <img src={photoDataUrl} alt="p" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">Foto</div>}
              </div>
              <div>
                <div className="text-lg font-bold">{name}</div>
                <div className="text-sm text-gray-600">Umur: {age}</div>
              </div>
            </div>
            <div className="mt-3 p-3 rounded bg-gradient-to-r from-yellow-50 to-pink-50">{message}</div>
          </div>
        </section>

        <section className="mb-4">
          <h2 className="font-semibold mb-2">Minigames</h2>
          <div className="grid grid-cols-1 gap-3">
            <BlowCandle onWin={() => handleWin("Lilin padam! 🎉")} />
            <GuessCard onWin={() => handleWin("Tebakan tepat! 🎉")} />
            <PopBalloons onWin={() => handleWin("Balon meletus cukup banyak! 🎉")} />
          </div>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold mb-2">Simpan & Bagikan</h2>
          <div className="flex gap-2 flex-wrap">
            <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={() => {
              const url = generateLink();
              window.location.hash = `data=${encodeState({ photoDataUrl, name, age, message })}`;
              alert('Link dibuat dan dimasukkan ke address bar. Kamu juga bisa tekan "Salin Link" untuk menyalin.');
            }}>
              Buat Link
            </button>
            <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={copyLink}>
              Salin Link
            </button>
            <button className="px-3 py-2 bg-amber-500 text-white rounded" onClick={saveLinkLocally}>
              Simpan ke Device
            </button>
          </div>

          <div className="mt-3">
            <h3 className="text-sm font-medium">Saved</h3>
            <div className="mt-2 space-y-2 max-h-40 overflow-auto">
              {savedLinks.length === 0 && <div className="text-sm text-gray-500">Belum ada saved link.</div>}
              {savedLinks.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-white p-2 rounded">
                  <div>
                    <div className="text-sm font-semibold">{s.name}</div>
                    <div className="text-xs text-gray-500">{new Date(s.created).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { navigator.clipboard.writeText(s.url); alert('Link tersalin'); }} className="px-2 py-1 rounded bg-sky-500 text-white text-xs">Copy</button>
                    <button onClick={() => loadSavedEntry(s)} className="px-2 py-1 rounded bg-emerald-500 text-white text-xs">Load</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-500 py-4">Made with ❤️ — Open & client-side. Tidak perlu server. Cocok dipakai di browser Android.</footer>

        {toast && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-8 bg-black text-white px-4 py-2 rounded">{toast}</div>
        )}
      </div>
    </div>
  );
}
