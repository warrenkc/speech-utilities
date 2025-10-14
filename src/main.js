import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

// script.js


document.addEventListener('DOMContentLoaded', function () {
    const visualizerCanvas = document.getElementById('audioVisualizer');
    const vctx = visualizerCanvas.getContext('2d');
    let audioAnalyser, audioStream, freqData;

    const backgroundVideo = document.getElementById('backgroundVideo');
    const enableVideoBackground = document.getElementById('enableVideoBackground');
    const subscriptionKeyInput = document.getElementById('subscriptionKey');
    const btnShowSubscriptionKey = document.getElementById('btnShowSubscriptionKey');
    const regionInput = document.getElementById('region');
    const regionOptions = document.getElementById("regionOptions");
    const languageOptions = document.getElementById("languageOptions");
    const translationOptions = document.getElementById("translationOptions");
    const outputLanguageOptions = document.getElementById("outputLanguageOptions");
    const microphoneOptions = document.getElementById("microphoneOptions");
    const enableZoomCaptions = document.getElementById("enableZoomCaptions");
    const zoomApiUrlInput = document.getElementById("zoomApiUrl");
    const sequenceInput = document.getElementById("sequenceInput");
    const resetSequenceButton = document.getElementById("resetSequence");
    const microphoneSwitch = document.getElementById('microphoneSwitch');
    const outputTextarea = document.getElementById('outputText');
    const outputTextInProgress = document.getElementById('outputTextInProgress');
    const outputTextFinal = document.getElementById('outputTextFinal');
    const statusDisplay = document.getElementById('status');
    const fullScreenOutputModal = document.getElementById('fullScreenOutputModal');
    const fullScreenOutputText = document.getElementById('fullScreenOutputText');
    const clearOutputBtn = document.getElementById('clearOutputBtn');
    const timerDisplay = document.getElementById('timerDisplay');
    const resetTimerBtn = document.getElementById('resetTimerBtn');
    let recognizer;
    let audioConfig;
    let captionSequence = 0;
    let sequenceInitialized = false; // Track if sequence has been initialized from Zoom API
    let timerStartTime = null;
    let timerInterval = null;
    let accumulatedTime = 0; // Total accumulated time in milliseconds

    // Load settings from local storage
    enableVideoBackground.checked = localStorage.getItem('enableVideoBackground') === 'true';
    subscriptionKeyInput.value = localStorage.getItem('subscriptionKey') || "";
    regionOptions.value = localStorage.getItem('region') || "eastasia"; // Default region
    languageOptions.value = localStorage.getItem('language') || "en-US"; // Default language
    translationOptions.value = localStorage.getItem('translationOption') || "noTranslation"; // Default translation
    outputLanguageOptions.value = localStorage.getItem('outputLanguageOption') || "en-US"; // Default output language
    enableZoomCaptions.checked = localStorage.getItem('enableZoomCaptions') === 'true';
    zoomApiUrlInput.value = localStorage.getItem('zoomApiUrl') || "";
    captionSequence = parseInt(localStorage.getItem('captionSequence') || '0');
    accumulatedTime = parseInt(localStorage.getItem('accumulatedTime') || '0');
    sequenceInput.value = captionSequence;
    updateTimerDisplay(); // Show accumulated time if any exists

    if (enableVideoBackground.checked) {
        // toggle d-none and d-block classes
        backgroundVideo.classList.remove("d-none");
    }
    else {
        backgroundVideo.classList.add("d-none");
    }
    // Set the background video based on the checkbox
    setBackgroundVideo();

    loadInputDevices(); // Load input devices


    const storedMicrophone = localStorage.getItem('microphone');
    if (storedMicrophone && Array.from(microphoneOptions.options).some(option => option.value === storedMicrophone)) {
        microphoneOptions.value = storedMicrophone;
    } else {
        microphoneOptions.value = "default"; // Default microphone
    }
    enableVideoBackground.addEventListener('change', saveEnableVideoBackground); // Save video background setting on change
    subscriptionKeyInput.addEventListener('input', saveKey); // Save key on input. This means that the key is saved as soon as it is entered.
    btnShowSubscriptionKey.addEventListener('click', () => {
        subscriptionKeyInput.type = subscriptionKeyInput.type === 'password' ? 'text' : 'password';
        btnShowSubscriptionKey.textContent = subscriptionKeyInput.type === 'password' ? 'Show Key' : 'Hide Key';
    });
    regionOptions.addEventListener('change', saveRegion); // Save region on input. This means that the region is saved as soon as it is entered.
    languageOptions.addEventListener('change', saveLanguage); // Save language on input. This means that the language is saved as soon as it is entered.
    translationOptions.addEventListener('change', saveTranslationOption); // Save translation on input. This means that the translation is saved as soon as it is entered.
    outputLanguageOptions.addEventListener('change', saveOutputLanguageOption); // Save translation on input. This means that the translation is saved as soon as it is entered.
    microphoneOptions.addEventListener('change', saveMicrophone); // Save microphone on input. This means that the microphone is saved as soon as it is entered.
    enableZoomCaptions.addEventListener('change', saveZoomCaptionsSettings);
    zoomApiUrlInput.addEventListener('input', saveZoomCaptionsSettings);
    sequenceInput.addEventListener('input', saveCaptionSequence);
    sequenceInput.addEventListener('blur', validateCaptionSequence);
    resetSequenceButton.addEventListener('click', resetSequenceCounter);
    resetTimerBtn.addEventListener('click', resetAccumulatedTimer);

    // Full screen modal event listeners
    fullScreenOutputModal.addEventListener('show.bs.modal', syncOutputToModal);
    clearOutputBtn.addEventListener('click', clearAllOutput);

    // Add fullscreen functionality to the fullscreen button
    const fullScreenButton = document.querySelector('button[data-bs-target="#fullScreenOutputModal"]');
    if (fullScreenButton) {
        fullScreenButton.addEventListener('click', enterFullScreen);
    }


    // Add exit fullscreen functionality to the close button
    const closeButton = document.querySelector('#fullScreenOutputModal button[data-bs-dismiss="modal"]');
    if (closeButton) {
        closeButton.addEventListener('click', exitFullScreen);
    }



    // Add escape key listener to exit fullscreen
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && document.fullscreenElement) {
            exitFullScreen();
        }
    });

    microphoneSwitch.addEventListener('change', function () {
        if (microphoneSwitch.checked) {
            startSpeechToText();
        } else {
            stopSpeechToText();
        }
    });

    // Save settings to local storage
    function saveEnableVideoBackground() {
        localStorage.enableVideoBackground = enableVideoBackground.checked;
        console.debug("Enable video background: ", enableVideoBackground.checked);
        setBackgroundVideo(); // Update background video visibility
    }
    function saveKey() {
        localStorage.subscriptionKey = subscriptionKeyInput.value;
    }
    function saveRegion() {
        console.debug("Region: ", regionOptions.value);
        localStorage.region = regionOptions.value;
    }
    function saveLanguage() {
        console.debug("Language: ", languageOptions.value);
        localStorage.language = languageOptions.value;
    }

    function saveOutputLanguageOption() {
        localStorage.outputLanguageOption = outputLanguageOptions.value;
    }

    function saveMicrophone() {
        console.debug("Microphone: ", microphoneOptions.value);
        localStorage.microphone = microphoneOptions.value;
    }
    function saveTranslationOption() {
        localStorage.translationOption = translationOptions.value;
    }

    function saveZoomCaptionsSettings() {
        localStorage.enableZoomCaptions = enableZoomCaptions.checked;
        localStorage.zoomApiUrl = zoomApiUrlInput.value;
    }

    function saveCaptionSequence() {
        const value = parseInt(sequenceInput.value);
        if (!isNaN(value) && value >= 0) {
            captionSequence = value;
            localStorage.captionSequence = captionSequence;
            console.log("Caption sequence set to:", captionSequence);
        }
    }

    function validateCaptionSequence() {
        const value = parseInt(sequenceInput.value);
        if (isNaN(value) || value < 0) {
            // Reset to current valid value if invalid input
            sequenceInput.value = captionSequence;
            alert("Please enter a valid number (0 or greater) for the caption sequence.");
        } else {
            captionSequence = value;
            localStorage.captionSequence = captionSequence;
            sequenceInput.value = captionSequence;
        }
    }

    function resetSequenceCounter() {
        captionSequence = 0;
        sequenceInitialized = false; // Reset initialization flag
        localStorage.captionSequence = captionSequence;
        sequenceInput.value = captionSequence;
        console.log("Caption sequence counter reset to 0");
    }

    function resetAccumulatedTimer() {
        if (confirm("Are you sure you want to reset the accumulated billable time?")) {
            accumulatedTime = 0;
            localStorage.accumulatedTime = accumulatedTime;
            updateTimerDisplay();
            console.log("Accumulated timer reset to 0");
        }
    }

    // Full screen modal functions
    function syncOutputToModal() {
        // Sync the content from main textarea to modal textarea
        fullScreenOutputText.value = outputTextarea.value;
    }

    function updateModalOutput() {
        // Update modal textarea if modal is open
        if (fullScreenOutputModal.classList.contains('show')) {
            fullScreenOutputText.value = outputTextarea.value;
            fullScreenOutputText.scrollTop = fullScreenOutputText.scrollHeight;
        }
    }

    function clearAllOutput() {
        // Clear all output textareas
        outputTextarea.value = '';
        outputTextInProgress.value = '';
        fullScreenOutputText.value = '';
    }

    function enterFullScreen() {
        // Request fullscreen on the document element
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) { // Firefox
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) { // Chrome, Safari and Opera
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) { // IE/Edge
            document.documentElement.msRequestFullscreen();
        }
    }

    function exitFullScreen() {
        // Exit fullscreen if currently in fullscreen mode
        if (document.fullscreenElement || document.mozFullScreenElement ||
            document.webkitFullscreenElement || document.msFullscreenElement) {

            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) { // Firefox
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { // IE/Edge
                document.msExitFullscreen();
            }
        }
    }

    // Timer functions
    function startTimer() {
        timerStartTime = Date.now();
        timerDisplay.style.display = 'block';
        resetTimerBtn.style.display = 'inline-block';
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer(); // Update immediately
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        // Add current session time to accumulated time
        if (timerStartTime) {
            const sessionTime = Date.now() - timerStartTime;
            accumulatedTime += sessionTime;
            localStorage.accumulatedTime = accumulatedTime;
        }

        timerStartTime = null;
        updateTimerDisplay(); // Update display with accumulated time
    }

    function updateTimer() {
        if (timerStartTime) {
            const currentSessionTime = Date.now() - timerStartTime;
            const totalTime = accumulatedTime + currentSessionTime;
            displayTime(totalTime);
        }
    }

    function updateTimerDisplay() {
        // Show accumulated time even when not actively recording
        if (accumulatedTime > 0) {
            timerDisplay.style.display = 'block';
            resetTimerBtn.style.display = 'inline-block';
            displayTime(accumulatedTime);
        } else if (!timerStartTime) {
            timerDisplay.style.display = 'none';
            resetTimerBtn.style.display = 'none';
        }
    }

    function displayTime(totalMilliseconds) {
        const seconds = Math.floor(totalMilliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const displayHours = String(hours).padStart(2, '0');
        const displayMinutes = String(minutes % 60).padStart(2, '0');
        const displaySeconds = String(seconds % 60).padStart(2, '0');

        timerDisplay.textContent = `Billable Time: ${displayHours}:${displayMinutes}:${displaySeconds}`;
    }

    

    async function sendCaptionToZoom(text) {
        if (!enableZoomCaptions.checked || !zoomApiUrlInput.value.trim()) {
            return false;
        }

        const zoomApiUrl = zoomApiUrlInput.value.trim();
        const language = translationOptions.value === "azureTranslation"
            ? getZoomLanguageCode(outputLanguageOptions.value)
            : getZoomLanguageCode(languageOptions.value);

        try {
            // Add space at the end to prevent Zoom from concatenating captions
            const captionText = text.trim() + ' ';

            // Build URL with parameters
            let fullZoomUrl = `${zoomApiUrl}&lang=${language}&seq=${captionSequence}`;

            const options = {
                method: 'POST',
                mode: 'no-cors',
                body: captionText,
                headers: {
                    'Content-Type': 'plain/text',
                    'Content-Length': captionText.length
                }
            };

            const response = await fetch(fullZoomUrl, options);

            // With no-cors mode, we can't read response details, so assume success
            captionSequence++;
            localStorage.captionSequence = captionSequence;
            sequenceInput.value = captionSequence;
            console.log(`Caption sent to Zoom (seq: ${captionSequence - 1}): ${captionText}`);
            return true;

        } catch (error) {
            console.error('Error sending caption to Zoom:', error);
            return false;
        }
    }

    // Convert Azure language codes to Zoom-compatible codes
    function getZoomLanguageCode(azureLanguage) {
        const languageMap = {
            'en-US': 'en-US',
            'id-ID': 'id',
            'es-ES': 'es',
            'ja-JP': 'ja',
            'zh-TW': 'zh-CN',
            'zh-Hant': 'zh-CN',
            'en': 'en-US',
            'id': 'id',
            'es': 'es',
            'ja': 'ja'
        };
        return languageMap[azureLanguage] || 'en-US';
    }

    // Status update functions
    function updateMainStatus(mainStatus, zoomStatus = null) {
        let statusText = `Status: ${mainStatus}`;
        if (enableZoomCaptions.checked && zoomStatus) {
            statusText += ` | Zoom: ${zoomStatus}`;
        }
        statusDisplay.textContent = statusText;
    }

    function updateZoomStatus(zoomStatus) {
        const currentStatus = statusDisplay.textContent;
        const mainStatus = currentStatus.split(' | ')[0];
        updateMainStatus(mainStatus.replace('Status: ', ''), zoomStatus);
    }

    function setBackgroundVideo() {
        if (enableVideoBackground.checked) {
            // toggle d-none and d-block classes
            backgroundVideo.classList.remove("d-none");
        }
        else {
            backgroundVideo.classList.add("d-none");
        }
    }

    function loadInputDevices() {
        microphoneOptions.innerHTML = ""; // Clear existing options
        navigator.mediaDevices.enumerateDevices()
            .then(devices => {
                let audioInputDevices = devices.filter(device => device.kind === 'audioinput');
                console.log("Audio input devices: ", audioInputDevices);
                audioInputDevices.forEach(device => {
                    let option = document.createElement('option');
                    option.value = device.deviceId;
                    option.text = device.label || `Microphone ${microphoneOptions.length + 1}`;
                    microphoneOptions.appendChild(option);
                });
            })
            .catch(error => {
                console.error("Error getting input devices: ", error);
            });
    }

    async function startSpeechToText() {

        microphoneSwitch.disabled = true; // Prevent toggling while starting
        outputTextarea.value = ""; // Clear previous output
        outputTextInProgress.value = ""; // Clear in-progress text
        // Clear modal textarea as well
        fullScreenOutputText.value = "";
        updateMainStatus("Initializing");

        const subscriptionKey = subscriptionKeyInput.value.trim();
        const region = regionOptions.value.trim();

        if (!subscriptionKey || !region) {
            alert("Please enter your Azure Subscription Key and Region.");
            microphoneSwitch.checked = false;
            microphoneSwitch.disabled = false;
            updateMainStatus("Ready");
            return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream = stream;
        setupAudioVisualizer(stream);

        // Validate Zoom settings if enabled
        if (enableZoomCaptions.checked && !zoomApiUrlInput.value.trim()) {
            alert("Please enter a Zoom Caption API URL or disable Zoom captions.");
            microphoneSwitch.checked = false;
            microphoneSwitch.disabled = false;
            updateMainStatus("Ready");
            return;
        }

        try {
            // Use SpeechTranslationConfig for translation, SpeechConfig otherwise
            let speechConfig;
            if (translationOptions.value === "azureTranslation") {
                speechConfig = sdk.SpeechTranslationConfig.fromSubscription(subscriptionKey, region);
                speechConfig.addTargetLanguage(outputLanguageOptions.value);
            } else {
                speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, region);
            }

            speechConfig.speechRecognitionLanguage = languageOptions.value;
            audioConfig = sdk.AudioConfig.fromMicrophoneInput(microphoneOptions.value);

            // Use TranslationRecognizer for translation, SpeechRecognizer otherwise

            if (translationOptions.value === "azureTranslation") {

                recognizer = new sdk.TranslationRecognizer(speechConfig, audioConfig);
            } else {
                recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
            }
            console.log("recognizer: ", recognizer);

            updateMainStatus("Listening", enableZoomCaptions.checked ? "Ready" : null);
            microphoneSwitch.disabled = false; // Re-enable the switch now that it's started
            startTimer(); // Start the billable time timer

            recognizer.recognizing = (s, event) => {
                // Intermediate result (while speaking) - applies to both translation and non-translation
                if (translationOptions.value === "azureTranslation") {
                    console.log("Recognizing - azureTranslation", event);
                    // The following line is wrong.
                    //outputTextInProgress.value = event.result.translations.get(outputLanguageOptions.value); // Show translated text
                    if (event.result.translations) {
                        outputTextInProgress.value = event.result.translations.get(outputLanguageOptions.value) || "";
                    }
                } else {
                    outputTextInProgress.value = event.result.text;
                }
                // Update modal if it's open (only for complete output, not in-progress)
            };

            recognizer.recognized = async (s, event) => {
                let captionText = "";

                if (translationOptions.value === "azureTranslation") {
                    console.log("Recognized - azureTranslation", event);
                    console.log("event.result.reason: ", event.result.reason);
                    if (event.result.reason == sdk.ResultReason.TranslatedSpeech) {
                        // Access the translation
                        console.log("event.result.translations: ", event.result.translations);
                        const translation = event.result.translations.get(outputLanguageOptions.value);
                        captionText = translation;
                        outputTextarea.value += translation + "\r\n";
                        // Scroll to bottom
                        outputTextarea.scrollTop = outputTextarea.scrollHeight;
                        // Update modal if it's open
                        updateModalOutput();
                    } else if (event.result.reason == sdk.ResultReason.RecognizedSpeech) {
                        captionText = event.result.text;
                        outputTextarea.value += event.result.text + " (No translation available)\r\n";
                        // Scroll to bottom
                        outputTextarea.scrollTop = outputTextarea.scrollHeight;
                        // Update modal if it's open
                        updateModalOutput();
                    }
                } else { //Original no translation code
                    if (event.result.reason == sdk.ResultReason.RecognizedSpeech) {
                        captionText = event.result.text;
                        outputTextarea.value += event.result.text + "\r\n";
                        // Scroll to bottom
                        outputTextarea.scrollTop = outputTextarea.scrollHeight;
                        // Update modal if it's open
                        updateModalOutput();
                    } else if (event.result.reason == sdk.ResultReason.NoMatch) {
                        outputTextarea.value += "No speech could be recognized...\r\n";
                        // Update modal if it's open
                        updateModalOutput();
                    }
                }

                // Clear the in-progress text after recognition is complete
                outputTextInProgress.value = "";

                // Send caption to Zoom if text was recognized and Zoom captions are enabled
                if (captionText && captionText.trim()) {
                    const success = await sendCaptionToZoom(captionText);
                    if (success) {
                        updateZoomStatus("Caption sent");
                    } else if (enableZoomCaptions.checked) {
                        updateZoomStatus("Caption failed");
                    }
                }
            };

            recognizer.sessionStopped = (s, event) => {
                console.log("\n    Session stopped event.");
                microphoneSwitch.checked = false; // Reset switch state
                stopSpeechToText(); // Automatically stop after session ends
            };

            recognizer.canceled = (s, event) => {
                console.log(`Recognition canceled. Reason: ${event.reason}`);
                if (event.reason == sdk.CancellationReason.Error) {
                    updateMainStatus(`ERROR: ${event.errorDetails}`);
                }
                microphoneSwitch.checked = false; // Reset switch state
                stopSpeechToText(); // Stop on cancellation as well
            };

            recognizer.startContinuousRecognitionAsync();

        } catch (error) {
            console.error("Error initializing speech recognition:", error);
            updateMainStatus(`Error: ${error.message}`);
            microphoneSwitch.checked = false;
            microphoneSwitch.disabled = false;
            stopTimer(); // Stop timer in case of initialization error
        }
    }

    function stopSpeechToText() {
        microphoneSwitch.disabled = true; // Prevent toggling while stopping
        updateMainStatus("Stopping");
        stopTimer(); // Stop the billable time timer

        if (recognizer && recognizer.stopContinuousRecognitionAsync) {
            recognizer.stopContinuousRecognitionAsync(
                () => {
                    recognizer.close();
                    recognizer = undefined;
                    audioConfig = undefined;
                    updateMainStatus("Ready");
                    microphoneSwitch.disabled = false;
                },
                error => {
                    console.error("Error stopping speech recognition:", error);
                    updateMainStatus("Ready"); // Still set to ready state after error
                    microphoneSwitch.disabled = false;
                }
            );
        } else {
            updateMainStatus("Ready"); // If recognizer wasn't started
            microphoneSwitch.disabled = false;
        }
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }
    }

    function setupAudioVisualizer(stream) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        audioAnalyser = audioCtx.createAnalyser();
        audioAnalyser.fftSize = 64;
        const bufferLength = audioAnalyser.frequencyBinCount;
        freqData = new Uint8Array(bufferLength);

        source.connect(audioAnalyser);
        drawAudioVisualizer();
    }

    function drawAudioVisualizer() {
        requestAnimationFrame(drawAudioVisualizer);

        audioAnalyser.getByteFrequencyData(freqData);

        vctx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
        const barWidth = visualizerCanvas.width / freqData.length;

        for (let i = 0; i < freqData.length; i++) {
            const val = freqData[i];
            const height = (val / 255) * visualizerCanvas.height;
            vctx.fillStyle = `rgb(${val}, ${255 - val}, 180)`;
            vctx.fillRect(i * barWidth, visualizerCanvas.height - height, barWidth - 1, height);
        }
    }

});