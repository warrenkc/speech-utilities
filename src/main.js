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
    const groqAPIKeyInput = document.getElementById('groqAPIKeyInput');
    const llmPromptInput = document.getElementById('llmPromptInput');
    const insertDefaultPromptBtn = document.getElementById('insertDefaultPromptBtn');
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const outputTextarea = document.getElementById('outputText');
    const outputTextInProgress = document.getElementById('outputTextInProgress');
    const outputTextFinal = document.getElementById('outputTextFinal');
    const statusDisplay = document.getElementById('status');
    let recognizer;
    let audioConfig;

    // Load settings from local storage
    enableVideoBackground.checked = localStorage.getItem('enableVideoBackground') === 'true';
    subscriptionKeyInput.value = localStorage.getItem('subscriptionKey') || "";
    regionOptions.value = localStorage.getItem('region') || "eastasia"; // Default region
    languageOptions.value = localStorage.getItem('language') || "en-US"; // Default language
    translationOptions.value = localStorage.getItem('translationOption') || "noTranslation"; // Default translation
    outputLanguageOptions.value = localStorage.getItem('outputLanguageOption') || "en-US"; // Default output language
    groqAPIKeyInput.value = localStorage.getItem('groqAPIKey') || "";
    llmPromptInput.value = localStorage.getItem('llmPrompt') || "";

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

    groqAPIKeyInput.addEventListener('input', saveGroqAPIKey); // Save key on input. This means that the key is saved as soon as it is entered.    
    llmPromptInput.addEventListener('input', saveLLMPrompt); // Save key on input. This means that the key is saved as soon as it is entered.
    insertDefaultPromptBtn.addEventListener('click', () => {
        llmPromptInput.value = "Please translate the following text into English fixing any mistakes etc. (with no extra information or explanation)";
        saveLLMPrompt();
    });
    startButton.addEventListener('click', startSpeechToText);
    stopButton.addEventListener('click', stopSpeechToText);

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
    function saveGroqAPIKey() {
        localStorage.groqAPIKey = groqAPIKeyInput.value;
    }
    function saveLLMPrompt() {
        localStorage.llmPrompt = llmPromptInput.value;
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
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream = stream;
        setupAudioVisualizer(stream);
        startButton.disabled = true;
        stopButton.disabled = false;
        outputTextarea.value = ""; // Clear previous output
        statusDisplay.textContent = "Initializing...";

        const subscriptionKey = subscriptionKeyInput.value.trim();
        const region = regionOptions.value.trim();

        if (!subscriptionKey || !region) {
            alert("Please enter your Azure Subscription Key and Region.");
            startButton.disabled = false;
            stopButton.disabled = true;
            statusDisplay.textContent = "Status: Ready";
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

            statusDisplay.textContent = "Status: Listening...";

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
            };

            recognizer.recognized = (s, event) => {

                if (translationOptions.value === "azureTranslation") {
                    console.log("Recognized - azureTranslation", event);
                    console.log("event.result.reason: ", event.result.reason);
                    if (event.result.reason == sdk.ResultReason.TranslatedSpeech) {
                        // Access the translation
                        console.log("event.result.translations: ", event.result.translations);
                        const translation = event.result.translations.get(outputLanguageOptions.value);
                        outputTextarea.value += translation + "\r\n";
                        // Scroll to bottom
                        outputTextarea.scrollTop = outputTextarea.scrollHeight;
                    } else if (event.result.reason == sdk.ResultReason.RecognizedSpeech) {
                        outputTextarea.value += event.result.text + " (No translation available)\r\n";
                        // Scroll to bottom
                        outputTextarea.scrollTop = outputTextarea.scrollHeight;
                    }
                } else { //Original no translation code
                    if (event.result.reason == sdk.ResultReason.RecognizedSpeech) {
                        outputTextarea.value += event.result.text + "\r\n";
                        // Scroll to bottom
                        outputTextarea.scrollTop = outputTextarea.scrollHeight;
                        if (translationOptions.value === "groqTranslation") {
                            // Call Groq API and get response and append to final output.
                            callGroqAPI(event.result.text).then(data => {
                                if (data && data.choices && data.choices[0] && data.choices[0].message) {
                                    let result = data.choices[0].message.content;
                                    // Remove <think> tags. Example: <think>好的，我现在需要处理这个</think>
                                    let cleanedStr = result.replace(/<think>[\s\S]*?<\/think>\s*/, '');
                                    console.log(cleanedStr);

                                    outputTextFinal.value += cleanedStr + "\r\n";
                                    // Scroll to bottom
                                    outputTextFinal.scrollTop = outputTextFinal.scrollHeight;
                                }
                            });
                        }


                    } else if (event.result.reason == sdk.ResultReason.NoMatch) {
                        outputTextarea.value += "No speech could be recognized...\r\n";
                    }
                }
            };

            recognizer.sessionStopped = (s, event) => {
                console.log("\n    Session stopped event.");
                stopSpeechToText(); // Automatically stop after session ends
            };

            recognizer.canceled = (s, event) => {
                console.log(`Recognition canceled. Reason: ${event.reason}`);
                if (event.reason == sdk.CancellationReason.Error) {
                    statusDisplay.textContent = `Status: ERROR: ${event.errorDetails}`;
                }
                stopSpeechToText(); // Stop on cancellation as well
            };

            recognizer.startContinuousRecognitionAsync();

        } catch (error) {
            console.error("Error initializing speech recognition:", error);
            statusDisplay.textContent = `Status: Error: ${error.message}`;
            startButton.disabled = false;
            stopButton.disabled = true;
        }
    }

    function stopSpeechToText() {
        startButton.disabled = false;
        stopButton.disabled = true;
        statusDisplay.textContent = "Status: Stopping...";

        if (recognizer && recognizer.stopContinuousRecognitionAsync) {
            recognizer.stopContinuousRecognitionAsync(
                () => {
                    recognizer.close();
                    recognizer = undefined;
                    audioConfig = undefined;
                    statusDisplay.textContent = "Status: Ready";
                },
                error => {
                    console.error("Error stopping speech recognition:", error);
                    statusDisplay.textContent = `Status: Error stopping: ${error.message}`;
                    statusDisplay.textContent = "Status: Ready"; // Still set to ready state after error
                }
            );
        } else {
            statusDisplay.textContent = "Status: Ready"; // If recognizer wasn't started
        }
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }
    }
    /*
    I used speech to text to produce the Mandarin Chinese text below. This is from a talk in Taiwan by a Japanese elder speaking Mandarin Chinese. Please fix any mistakes in the transcription because the speaker has a Japanese accent and the speech to text makes mistakes in the transcription. Please make it coherent and flow naturally. Remember this is from a meeting of Jehovah's Witnesses and the topics are often about being a Christian and following Bible principles.
  Please output just the results in English with no extra information or explanation. Thanks!
    */

    // Code to use Groq API. 
    async function callGroqAPI(message) {
        const groqAPIKey = groqAPIKeyInput.value.trim();
        if (!groqAPIKey) {
            alert("Please enter your Groq API Key.");
            return;
        }
        if (llmPromptInput.value.trim() === "") {
            alert("Please enter your LLM Prompt if you want to use Groq API.");
            return;
        }

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + groqAPIKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    'messages': [
                        { 'role': 'system', 'content': llmPromptInput.value },
                        { 'role': 'user', 'content': message }
                    ],
                    'model': 'gemma2-9b-it',
                    'temperature': 0.6
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(data);
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }

    const btnOutputTextFullScreen = document.getElementById('btnOutputTextFullScreen');
    const btnOutputTextFinalFullScreen = document.getElementById('btnOutputTextFinalFullScreen');

    function isMobileDevice() {
        return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    if (isMobileDevice() === false) {

        function requestFullscreen(element) {
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            }
        }

        function handleFullscreenChange() {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                outputTextarea.classList.remove('fullscreen-textarea');
                outputTextarea.classList.add('main-textarea-inputs');
                outputTextFinal.classList.remove('fullscreen-textarea');
                outputTextFinal.classList.add('main-textarea-inputs');
            }
        }

        btnOutputTextFullScreen.addEventListener('click', () => {
            requestFullscreen(outputTextarea);
            outputTextarea.classList.add('fullscreen-textarea');
            outputTextarea.classList.remove('main-textarea-inputs');
        });

        btnOutputTextFinalFullScreen.addEventListener('click', () => {
            requestFullscreen(outputTextFinal);
            outputTextFinal.classList.add('fullscreen-textarea');
            outputTextFinal.classList.remove('main-textarea-inputs');
        });

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    }
    else {
        // Just hide the buttons on mobile devices until I can figure out better layout etc... for mobile devices.
        btnOutputTextFullScreen.classList.add('d-none');
        btnOutputTextFinalFullScreen.classList.add('d-none');
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