# Classical Chinese OCR (hy-ocr)

A web app for extracting text from scanned images of classical Chinese literature using Google Gemini AI.

## Features

- **Upload** scanned images (JPG, PNG) via drag-and-drop or file picker
- **Batch upload** up to 15 files at once with parallel processing
- **OCR** powered by Google Gemini (`gemini-3-flash-preview`) with a prompt tuned for classical Chinese
- **Side-by-side review** — original image with clickable bounding boxes alongside editable text blocks
- **Edit** misrecognized characters inline, with visual indicators for edited blocks
- **Download** corrected text as a `.txt` file, or copy to clipboard

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Google Gemini API (`@google/generative-ai`)

## Getting Started

Follow the steps below in order. You only need to do this once.

### Step 1: Get a Google Gemini API Key (free)

This app uses Google's Gemini AI to read text from images. You need an API key to connect to it. Here's how to get one:

1. Open your web browser and go to **[Google AI Studio](https://aistudio.google.com/apikey)**
2. If you're not signed in, click **Sign in** and log in with your Google account (any Gmail account works)
3. Once signed in, you should see a page titled **"API keys"**
4. Click the **"Create API key"** button
5. If it asks you to select a Google Cloud project, just click **"Create API key in new project"** — Google will set one up for you automatically
6. A long string of letters and numbers will appear (it looks something like `AIzaSyB...`). This is your API key
7. Click the **copy icon** next to the key to copy it to your clipboard
8. **Keep this key private** — don't share it publicly or commit it to git

> **Note:** The free tier of Google AI Studio is generous and should be more than enough for personal use. You won't need to enter a credit card.

### Step 2: Install the app

Open a terminal (on Mac: open the **Terminal** app; on Windows: open **PowerShell**) and run:

```bash
# Go to the project folder (adjust the path to where you downloaded it)
cd hy-ocr

# Download and install nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash

# in lieu of restarting the shell
\. "$HOME/.nvm/nvm.sh"

# Download and install Node.js:
nvm install 24

# Verify the Node.js version:
node -v # Should print "v24.14.0".

# Verify npm version:
npm -v # Should print "11.9.0".

# Install dependencies
npm install
```

### Step 3: Add your API key to the app

Still in the terminal, run:

```bash
cp .env.example .env.local
```

Now open the file `.env.local` in any text editor (Notepad, TextEdit, VS Code, etc.) and replace `your_api_key_here` with the API key you copied in Step 1. It should look like this:

```
GOOGLE_GEMINI_API_KEY=AIzaSyB1234567890abcdefg
```

Save and close the file.

### Step 4: Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You're ready to go!

## Environment Variables

| Variable | Description |
|---|---|
| `GOOGLE_GEMINI_API_KEY` | Your Google AI Studio API key (see Step 1 above) |
