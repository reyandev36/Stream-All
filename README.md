# Stream All - Personal Video Streaming Architecture

Stream All is a decoupled, professional-grade personal video streaming application. It allows you to host massive video files locally on your own "Server PC" while accessing a beautifully designed, modern interface from anywhere in the world via a custom domain (hosted on Vercel).

## Architecture Overview

This setup involves two computers:
1. **Main PC (Your Daily Driver):** This is where your GitHub and Vercel accounts live. You deploy the frontend website from here. You also use this PC to watch the videos.
2. **Server PC (Your Video Vault):** This is your dedicated machine with lots of storage. It runs the Node.js backend silently in the background. It uses HTTP Range Requests to stream videos chunk-by-chunk (just like Netflix) so there is zero buffering, no matter the file size.

---

## Phase 1: Main PC Setup (GitHub & Vercel)

*Perform these steps on your Main PC.*

1. **Upload to GitHub:** Push this **entire** `Stream All` project folder (containing both the `frontend` and `backend` folders) to a single repository on your GitHub account. This acts as a complete backup of your whole project.
2. **Deploy to Vercel:**
   - Go to [Vercel](https://vercel.com/) and click **Add New Project**.
   - Import your newly created GitHub repository.
   - **Crucial Step:** In the deployment settings, find **Root Directory**, click edit, and select the `frontend` folder.
   - Click **Deploy** (we will add the Environment Variable in Phase 4).

---

## Phase 2: Server PC Setup (Backend & Auto-Boot)

*Perform these steps on your Server PC.*

To make your Server PC act like a true, silent host, we will use **PM2**. This ensures the server starts automatically in the background every time the PC turns on, without you having to open any terminal windows.

1. **Download the Code:** On your Server PC, you can simply download your GitHub repository as a ZIP (or use `git clone`), and extract it to wherever you want your server files to live.
2. **Install Node.js:** Ensure [Node.js](https://nodejs.org/) is installed.
3. **Install Dependencies:** Open a terminal inside the downloaded project folder and run:
   ```bash
   cd backend
   npm install
   npx prisma db push
   cd ..
   ```
4. **Setup PM2 Auto-Boot:** Open **PowerShell as Administrator** and run:
   ```bash
   npm install -g pm2
   npm install -g pm2-windows-startup
   pm2-startup install
   ```
5. **Start the Server Silently:** Navigate to your project folder in that terminal and run:
   ```bash
   pm2 start backend/index.js --name "StreamServer"
   pm2 save
   ```
   *(Your backend is now running silently on `http://localhost:5000` and will survive reboots!)*

---

## Phase 3: ngrok Free Permanent Tunnel (Server PC)

*ngrok gives you one free permanent URL (e.g. `wrongly-shine-embody.ngrok-free.dev`) that never expires — no domain purchase needed!*

**Step 1 — Create a free ngrok account** on your Main PC at [ngrok.com](https://ngrok.com).
- After signing in, go to **Cloud Edge > Domains** and note your free permanent domain.
- Go to **Your Authtoken** in the left sidebar and copy your token.

**Step 2 — Download ngrok on your Server PC**
- Download ngrok for Windows from [ngrok.com/download](https://ngrok.com/download).
- Extract the `ngrok.exe` file to `C:\ngrok\`.

**Step 3 — Create the ngrok config file**

Create a file at `C:\ngrok\ngrok.yml` using **Notepad** with this content (use **spaces, NOT tabs** for indentation — 2 spaces per level):
```yaml
version: "3"
agent:
  authtoken: YOUR_AUTHTOKEN_HERE
tunnels:
  stream:
    proto: http
    addr: 5000
    domain: your-free-domain.ngrok-free.dev
```

> **Important:** When saving in Notepad, change "Save as type" to **All Files** so it doesn't save as `ngrok.yml.txt`.

**Step 4 — Copy the tunnel starter script**

Copy the `tunnel.js` file from this project's root folder to `C:\ngrok\tunnel.js`. This file tells PM2 how to start ngrok properly.

> **Important:** Do NOT use a `.bat` file with PM2 — PM2 tries to run `.bat` files as Node.js and it will crash. The `tunnel.js` wrapper script is the correct approach.

**Step 5 — Start the tunnel with PM2**

Open PowerShell (anywhere) and run:
```powershell
pm2 start "C:\ngrok\tunnel.js" --name "StreamTunnel"
```

Wait 5 seconds, then verify both processes are online:
```powershell
pm2 status
```

You should see both `StreamServer` and `StreamTunnel` showing `online`. ✅

**Step 6 — Save so it auto-starts on reboot:**
```powershell
pm2 save
```

**Step 7 — Test it works** by opening this URL in any browser:
```
https://your-free-domain.ngrok-free.dev/api/status
```
If you see `{"setupNeeded":true}` or `{"setupNeeded":false}`, everything is connected! 🎉

---

## Phase 4: Linking it Together

*Perform these steps on your Main PC.*

1. Go to your Vercel Dashboard and open your project.
2. Navigate to **Settings > Environment Variables**.
3. Add a new variable:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://abc-xyz.ngrok-free.app` *(your exact free ngrok domain from Phase 3)*
4. Go to the **Deployments** tab and redeploy your project for the variable to take effect.

---

## Usage Guide

### First-Time Setup
1. Visit your Vercel URL on any device (e.g., `https://my-stream.vercel.app`).
2. You will automatically be taken to the **Initial Setup** screen. Create your Master Admin username and password.

### Uploading Content (Blazing Fast)
Because video files are massive, you should upload them from the Server PC itself to bypass any cloud upload limits and maximize speed.
1. Sit at your **Server PC** (or remote into it).
2. Open a web browser and go directly to your Vercel URL.
3. Log in with your Admin account.
4. Click **Upload** in the top right corner.
5. **Create a Category Item:** Make a new Course, Series, or Movie.
6. **Upload Video:** Select the massive video file (`.mp4`, `.mkv`) and an optional subtitle file (`.srt`, `.vtt`) from your hard drive, and click Upload. Because you are on the host network, it will process almost instantly directly to the Server PC's hard drive!

### Creating Viewer Accounts
Only users you explicitly authorize can watch your content.
1. On the Admin Upload page, scroll down to the **Create Viewer Account** section.
2. Enter a username and password and click Create.
3. You can view, manage, and delete these accounts in the "Existing Viewer Accounts" list just below it.
4. Hand these credentials to your friends or family. They can now log in at your Vercel URL from anywhere in the world and stream securely!
