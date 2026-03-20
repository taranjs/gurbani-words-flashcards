# ☬ Gurbani Learning Flash Cards

A free, mobile-first web app for children to learn Gurbani words through printable flash cards.
No server required — works fully offline by opening `index.html` in a browser.

---

## 📁 Folder Structure

```
your-folder/
├── index.html       ← Main app page
├── style.css        ← All styling (mobile + print)
├── app.js           ← App logic (load, render, shuffle, flip)
├── words.json       ← Flash card data
└── images/
    ├── sun.jpg
    ├── lotus.jpg
    ├── water.jpg
    └── ...
```

---

## 🚀 How to Run

### Option A — Local server (recommended)
Using Python (built in to most computers):
```bash
# Python 3
python3 -m http.server 8080

# Then open in browser:
http://localhost:8080
```

### Option B — VS Code Live Server
Install the "Live Server" extension, right-click `index.html` → **Open with Live Server**.

### Option C — Double-click `index.html`
Works in most browsers. Some browsers block `fetch()` for local files — if cards don't load, use Option A.

---

## 📝 Adding Your Own Cards

Edit `words.json` — each card is one object:

```json
[
  {
    "word_gurmukhi": "ਸੂਰਜ",
    "meaning": "Sun",
    "description": "The sun gives light and warmth to the whole world.",
    "image": "sun.jpg"
  }
]
```

| Field            | Required | Description                          |
|------------------|----------|--------------------------------------|
| `word_gurmukhi`  | ✅        | The Gurmukhi word                    |
| `meaning`        | ✅        | English meaning                      |
| `description`    | ✅        | Short explanation (shown on back)    |
| `image`          | Optional | Filename inside the `images/` folder |

Place image files inside the `images/` folder. Supported formats: JPG, PNG, WebP, SVG.

---

## 🖨️ Printing

1. Click **🖨️ Print Cards** in the app
2. In the print dialog:
   - Set paper to **A4** or **Letter**
   - Set margins to **Default** or **Minimum**
   - Enable **Background graphics** for colour
3. Click Print

Cards will print **2 per row**, keeping the 3×4 inch ratio.

### Save as PDF
Click **💾 Save PDF** → choose "Save as PDF" in the print dialog.

---

## ✨ Features

| Feature             | How to use                                   |
|---------------------|----------------------------------------------|
| **Flip card**       | Tap or click any card                        |
| **Shuffle**         | Click 🔀 Shuffle button                     |
| **Hide meanings**   | Click 👁️ Hide Meanings to test yourself     |
| **Print**           | Click 🖨️ Print Cards                        |
| **Save as PDF**     | Click 💾 Save PDF                           |
| **Offline use**     | Works with no internet after first load      |

---

## 🎨 Design

- **Fonts:** Baloo 2 (display) + Hind (body) via Google Fonts
- **Colors:** Saffron, Navy, Gold — inspired by Sikh art
- **Cards:** 3:4 ratio, smooth CSS flip animation
- **Mobile-first:** Works on phones, tablets, and desktop

---

## 🙏 Credits

Made with love for the Sangat. Free to use, share, and print at home.

ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖਾਲਸਾ, ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫ਼ਤਹਿ
