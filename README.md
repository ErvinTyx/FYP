

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ErvinTyx/FYP.git 
cd figma-make-local-runner
```

### 2. Download Code from Figma Make

1. Export your code from Figma Make
2. Decompress the downloaded files
3. Copy the `src` folder into the root of this project, replacing the existing `src` folder.

**Important**: Make sure to replace or merge with the existing files in the `src` folder. The current `src` folder contains a demo application that you should replace with your Figma Make code.

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is occupied).
