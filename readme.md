View the page at: https://warrenkc.github.io/speech-utilities/

This webpage will allow for speech to text using Azure cognitive services in realtime using an audio input device on their device. https://azure.microsoft.com/en-us/products/ai-services/
Note: the subscription key is stored in your browser's local storage. https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

Screenshot:
![Screenshot](src/images/Screenshot%202025-04-15%20at%209.08.52 AM.png)

Known issues:
* stopContinuousRecognitionAsync causes this error: Error stopping speech recognition:"TypeError: undefined is not an object (evaluating 'f.close')" This doesn't really affect the operation but it is annoying. I will try to fix this in the future.
* On mobile safari, the full screen options do not work correctly.

**Features I want to add:**
* Allow to use on device speech to text if Azure is not available.
* Option to send captions to Zoom for realtime speech translated captions.
* Improve interface.

Would you like to help? I would like some help to add these features. Please contact me at warrenkc@gmail.com if you are interested.
<pre style="font-family: monospace; font-size: 14px;">

 ░▒▓███████▓▒░▒▓███████▓▒░░▒▓████████▓▒░▒▓████████▓▒░▒▓██████▓▒░░▒▓█▓▒░░▒▓█▓▒░      ░▒▓████████▓▒░▒▓██████▓▒░       ░▒▓████████▓▒░▒▓████████▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓████████▓▒░ 
░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░     ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░         ░▒▓█▓▒░  ░▒▓█▓▒░░▒▓█▓▒░         ░▒▓█▓▒░   ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░  ░▒▓█▓▒░     
░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░     ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░         ░▒▓█▓▒░  ░▒▓█▓▒░░▒▓█▓▒░         ░▒▓█▓▒░   ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░  ░▒▓█▓▒░     
 ░▒▓██████▓▒░░▒▓███████▓▒░░▒▓██████▓▒░ ░▒▓██████▓▒░░▒▓█▓▒░      ░▒▓████████▓▒░         ░▒▓█▓▒░  ░▒▓█▓▒░░▒▓█▓▒░         ░▒▓█▓▒░   ░▒▓██████▓▒░  ░▒▓██████▓▒░   ░▒▓█▓▒░     
       ░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░      ░▒▓█▓▒░     ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░         ░▒▓█▓▒░  ░▒▓█▓▒░░▒▓█▓▒░         ░▒▓█▓▒░   ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░  ░▒▓█▓▒░     
       ░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░      ░▒▓█▓▒░     ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░         ░▒▓█▓▒░  ░▒▓█▓▒░░▒▓█▓▒░         ░▒▓█▓▒░   ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░  ░▒▓█▓▒░     
░▒▓███████▓▒░░▒▓█▓▒░      ░▒▓████████▓▒░▒▓████████▓▒░▒▓██████▓▒░░▒▓█▓▒░░▒▓█▓▒░         ░▒▓█▓▒░   ░▒▓██████▓▒░          ░▒▓█▓▒░   ░▒▓████████▓▒░▒▓█▓▒░░▒▓█▓▒░  ░▒▓█▓▒░     
</pre>

# Terminal commands I used:
**This will be a simple example of how to use the Microsoft Cognitive Services Speech SDK with Vite.**
This npm command will create a new Vite project in the current directory. 
```bash
npm create vite@latest .
```
This will install the Microsoft Cognitive Services Speech SDK.
```bash
npm install microsoft-cognitiveservices-speech-sdk
```
This runs the Vite development server.
```bash
npm run dev
npm run dev preview
```
To build the project for production, run this command.
```bash 
npm run build
```

