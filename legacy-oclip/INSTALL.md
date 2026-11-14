# Install Oclip Free by coding180

Free. Works on Windows and Mac. About 5 minutes.

## 1. Get the app

Download the app folder and unzip it (right-click the zip, then Extract All on Windows, or double-click it on Mac). Put the folder somewhere easy, like Documents.

## 2. Start it

**Windows:** double-click **Start Clip.bat**.
If Windows says "protected your PC", click **More info**, then **Run anyway**.

**Mac:** right-click **Start Clip.command**, click **Open**, then click **Open** again.
(Only the first time. After that, double-click it.)

A black window opens and sets things up. If it asks to install **Node.js**, say yes, or click the big green button on the page it opens, install it, then start Clip again.

## 3. Use it

Your browser opens Clip by itself. If not, go to **http://localhost:4571**

There is no sign-in.

That's it. Keep the black window open while you use Clip. Close it to stop.

> Right now Clip is in **demo mode**: it makes fake sample clips so you can look around. To clip your own videos, do step 4.

## 4. Clip your own videos (optional)

1. When Clip asks "Install them now? (y/n)", type `y` and press Enter. This installs two free tools (ffmpeg and yt-dlp). On a Mac this needs [Homebrew](https://brew.sh); without it Clip stays in demo mode.
2. Get two free keys:
   - Groq (turns speech into text): https://console.groq.com/keys
   - OpenRouter (finds the best moments): https://openrouter.ai/keys
3. Go to **http://localhost:4571/admin**. Paste your keys there.
4. Paste your two keys, click **Save**, then restart Clip (close the black window and start it again).

Now paste a video link or upload a file on the home page.

## Something went wrong?

| Problem | Fix |
|---|---|
| Page does not open | Make sure the black window is still open, then go to http://localhost:4571 |
| "Port in use" | Clip is already running. Close the other black window. |
| Mac says "cannot be opened" | Right-click the file, click **Open** |
| Still stuck | https://coding180.com/contact |

Only you can see your videos: they stay on your computer.
