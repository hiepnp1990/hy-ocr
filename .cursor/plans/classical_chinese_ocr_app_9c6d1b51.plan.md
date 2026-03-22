---
name: Classical Chinese OCR App
overview: Build a Next.js web app at /Users/hiepnp/build/hy-ocr that lets users upload scanned images of classical Chinese literature, perform OCR via Google Gemini (gemini-3-flash-preview), review/edit results side-by-side with bounding boxes, and download corrected text.
todos:
  - id: init-project
    content: Create /Users/hiepnp/build/hy-ocr/, init git repo, install vercel-labs/agent-skills
    status: completed
  - id: scaffold-nextjs
    content: Scaffold Next.js 15 app with TypeScript, Tailwind, and shadcn/ui
    status: completed
  - id: core-types
    content: Create lib/types.ts and lib/gemini.ts (Gemini client + OCR prompt)
    status: completed
  - id: api-route
    content: Build app/api/ocr/route.ts - POST endpoint sending image to Gemini
    status: completed
  - id: image-upload
    content: Build image-upload.tsx - drag-and-drop upload component
    status: completed
  - id: bbox-overlay
    content: Build bounding-box-overlay.tsx - SVG overlay rendering detected text regions
    status: completed
  - id: ocr-workspace
    content: Build ocr-workspace.tsx - side-by-side image + editable text workspace
    status: completed
  - id: text-editor
    content: Build text-editor.tsx - editable text blocks linked to bounding boxes
    status: completed
  - id: download
    content: Build download-button.tsx - export corrected text as .txt
    status: completed
  - id: main-page
    content: Wire everything together in app/page.tsx
    status: completed
  - id: polish
    content: "Final polish: env template, README, test the full flow"
    status: completed
isProject: false
---

# Classical Chinese OCR Web App

## Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **OCR Backend**: Google Gemini API (`gemini-3-flash-preview`) via `@google/generative-ai` npm package
- **State**: React state (no external store needed for this scope)
- **Skills**: `vercel-labs/agent-skills` (web-design-guidelines, vercel-react-best-practices, vercel-composition-patterns)

## Project Structure

```
/Users/hiepnp/build/hy-ocr/
├── app/
│   ├── layout.tsx              # Root layout with font + metadata
│   ├── page.tsx                # Main app page (upload + OCR workspace)
│   ├── api/
│   │   └── ocr/
│   │       └── route.ts        # POST endpoint: send image to Gemini, return OCR results with bounding boxes
│   └── globals.css
├── components/
│   ├── image-upload.tsx         # Drag-and-drop image upload (JPG/PNG)
│   ├── ocr-workspace.tsx        # Side-by-side: original image + OCR text overlay
│   ├── bounding-box-overlay.tsx # Canvas/SVG overlay rendering bounding boxes on the image
│   ├── text-editor.tsx          # Editable text panel with per-box editing
│   └── download-button.tsx      # Export corrected text as .txt
├── lib/
│   ├── gemini.ts               # Gemini API client setup + OCR prompt engineering
│   └── types.ts                # Shared types (OCRResult, BoundingBox, etc.)
├── .env.local                  # GOOGLE_GEMINI_API_KEY
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

## Architecture / Data Flow

```mermaid
flowchart LR
    Upload["Image Upload\n(JPG/PNG)"] --> API["API Route\n/api/ocr"]
    API --> Gemini["Gemini 3 Flash\ngemini-3-flash-preview"]
    Gemini --> Response["Structured JSON\n{text, boundingBoxes}"]
    Response --> Workspace["OCR Workspace"]
    Workspace --> ImagePanel["Original Image\n+ BBox Overlay"]
    Workspace --> TextPanel["Editable Text\nPer Bounding Box"]
    TextPanel --> Download["Download .txt"]
```



## Key Implementation Details

### 1. Gemini OCR API Route (`app/api/ocr/route.ts`)

- Accepts POST with base64-encoded image
- Sends image to Gemini with a structured prompt requesting JSON output:
  - Each detected text region returns: `{ text, bbox: { x, y, width, height } }` (proportional 0.000–1.000 of image dimensions, 3 decimal places)
  - Prompt specifically tuned for classical/traditional Chinese characters
- Returns structured JSON response to the client

### 2. Bounding Box Overlay (`components/bounding-box-overlay.tsx`)

- Renders an SVG/canvas overlay on top of the original image
- Each bounding box is clickable and highlights the corresponding text in the editor
- Boxes are color-coded (default vs. selected vs. edited)
- Coordinates are proportional (0.000–1.000) — multiplied by displayed image dimensions for pixel positioning

### 3. Side-by-Side Workspace (`components/ocr-workspace.tsx`)

- Left panel: original image with bounding box overlay (zoomable, pannable)
- Right panel: list of detected text blocks, each editable via an inline input
- Clicking a box on the image scrolls to and highlights the corresponding text block
- Clicking a text block highlights the corresponding bounding box on the image

### 4. Text Editing and Download

- Each text block is an editable `<textarea>` or shadcn `Input`
- Changes are tracked in React state
- "Download as .txt" button concatenates all (possibly edited) text blocks and triggers a file download
- Option to copy all text to clipboard

## Setup Steps

1. Create project folder at `/Users/hiepnp/build/hy-ocr/`, init git repo
2. Install skills: `npx skills add vercel-labs/agent-skills -g -y`
3. Scaffold Next.js app with TypeScript + Tailwind
4. Initialize shadcn/ui
5. Install `@google/generative-ai` for Gemini API
6. Build the components and API route
7. Create `.env.local` template for `GOOGLE_GEMINI_API_KEY`

