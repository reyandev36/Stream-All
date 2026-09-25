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

## Phase 3: Cloudflare Zero Trust Tunnel

*To keep your Server PC completely isolated, you will do the dashboard steps on your Main PC! Cloudflare is 100% free, has no bandwidth limits, and streams video perfectly.*

1. **On your Main PC**, log into your free Cloudflare account (ensure your custom domain's DNS is managed by Cloudflare).
2. Go to `one.dash.cloudflare.com` (Zero Trust Dashboard).
3. Navigate to **Networks > Tunnels** and click **Create a tunnel**.
4. Select **Cloudflared** and name it (e.g., "StreamServer").
5. Under "Choose your environment", select **Windows**.
6. Cloudflare will give you a single command box with a secret token (it looks like `cloudflared.exe service install eyJh...`). Copy this command.
7. **On your Server PC**, open **PowerShell as Administrator** and paste that exact command. This silently installs the tunnel as a background service without you ever needing to log into an email or browser on the Server PC!
8. **Back on your Main PC**, the dashboard will show a "Connected" status. Click Next.
9. In the **Public Hostnames** tab:
   - **Subdomain:** `api`
   - **Domain:** Select your domain (e.g., `yourdomain.com`).
   - **Service Type:** `HTTP`
   - **URL:** `localhost:5000`
10. Click **Save hostname**.

*(Your backend API is now permanently accessible at `https://api.yourdomain.com` and automatically boots on startup!)*

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
