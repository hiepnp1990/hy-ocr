# Classical Chinese OCR (hy-ocr)

A web app for extracting text from scanned images of classical Chinese literature using Google Gemini AI.

## Features

- **Upload** scanned images (JPG, PNG) via drag-and-drop or file picker
- **OCR** powered by Google Gemini (`gemini-3-flash-preview`) with a prompt tuned for classical Chinese
- **Side-by-side review** — original image with clickable bounding boxes alongside editable text blocks
- **Edit** misrecognized characters inline, with visual indicators for edited blocks
- **Download** corrected text as a `.txt` file, or copy to clipboard

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Google Gemini API (`@google/generative-ai`)

## Getting Started

```bash
# Install dependencies
npm install

# Set up your Gemini API key
cp .env.example .env.local
# Edit .env.local and add your key from https://aistudio.google.com/apikey

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `GOOGLE_GEMINI_API_KEY` | Your Google AI Studio API key |
