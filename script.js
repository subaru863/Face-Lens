const home = document.getElementById("home");
const cameraPage = document.getElementById("cameraPage");
const resultPage = document.getElementById("resultPage");

const startBtn = document.getElementById("startBtn");
const closeBtn = document.getElementById("closeBtn");
const flipBtn = document.getElementById("flipBtn");
const againBtn = document.getElementById("againBtn");

const video = document.getElementById("video");
const faceBox = document.getElementById("faceBox");

const countdown = document.getElementById("countdown");
const scanStatus = document.getElementById("scanStatus");

const ageResult = document.getElementById("ageResult");
const genderResult = document.getElementById("genderResult");
const expressionResult = document.getElementById("expressionResult");


let stream = null;

let facingMode = "user";

let scanning = false;


/* -----------------------------
   LOAD AI MODELS
----------------------------- */

async function loadModels() {

    scanStatus.textContent = "Loading AI...";

    const MODEL_URL =
        "https://raw.githubusercontent.com/vladmandic/face-api/master/model";

    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

    await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);

    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);

    console.log("AI models loaded");
}


/* -----------------------------
   START CAMERA
----------------------------- */

async function startCamera() {

    try {

        if (stream) {
            stopCamera();
        }

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facingMode,
                width: {
                    ideal: 1280
                },
                height: {
                    ideal: 720
                }
            },
            audio: false
        });

        video.srcObject = stream;

        await video.play();

        scanStatus.textContent = "Camera ready";

        return true;

    } catch (error) {

        console.error(error);

        alert(
            "Camera access failed.\n\n" +
            "Please allow camera permission and try again."
        );

        return false;
    }
}


/* -----------------------------
   STOP CAMERA
----------------------------- */

function stopCamera() {

    if (stream) {

        stream.getTracks().forEach(track => {
            track.stop();
        });

        stream = null;
    }

    video.srcObject = null;
}


/* -----------------------------
   SHOW CAMERA
----------------------------- */

async function openCamera() {

    home.classList.add("hidden");
    resultPage.classList.add("hidden");

    cameraPage.classList.remove("hidden");

    const cameraStarted = await startCamera();

    if (!cameraStarted) {

        cameraPage.classList.add("hidden");
        home.classList.remove("hidden");

        return;
    }

    await loadModels();

    startScan();
}


/* -----------------------------
   SCAN
----------------------------- */

async function startScan() {

    if (scanning) return;

    scanning = true;

    const ageSamples = [];
    const genderSamples = {};
    const expressionSamples = {};

    const scanTime = 4000;

    const startTime = Date.now();

    scanStatus.textContent = "Look at the camera";

    countdown.textContent = "4";

    const interval = setInterval(async () => {

        if (!scanning) {
            clearInterval(interval);
            return;
        }

        const elapsed = Date.now() - startTime;

        const remaining =
            Math.ceil((scanTime - elapsed) / 1000);

        countdown.textContent =
            remaining > 0 ? remaining : "";

        try {

            const detection =
                await faceapi
                    .detectSingleFace(
                        video,
                        new faceapi.TinyFaceDetectorOptions({
                            inputSize: 320,
                            scoreThreshold: 0.5
                        })
                    )
                    .withAgeAndGender()
                    .withFaceExpressions();

            if (!detection) {

                faceBox.style.display = "none";

                scanStatus.textContent =
                    "No face detected";

                return;
            }


            /* -----------------------------
               FACE BOX
            ----------------------------- */

            const box = detection.detection.box;

            const scaleX =
                video.clientWidth / video.videoWidth;

            const scaleY =
                video.clientHeight / video.videoHeight;

            faceBox.style.display = "block";

            faceBox.style.left =
                `${box.x * scaleX}px`;

            faceBox.style.top =
                `${box.y * scaleY}px`;

            faceBox.style.width =
                `${box.width * scaleX}px`;

            faceBox.style.height =
                `${box.height * scaleY}px`;


            /* -----------------------------
               AGE
            ----------------------------- */

            ageSamples.push(detection.age);


            /* -----------------------------
               GENDER
            ----------------------------- */

            const gender =
                detection.gender;

            const genderProbability =
                detection.genderProbability;

            if (!genderSamples[gender]) {
                genderSamples[gender] = 0;
            }

            genderSamples[gender] +=
                genderProbability;


            /* -----------------------------
               EXPRESSIONS
            ----------------------------- */

            const expressions =
                detection.expressions;

            for (const expression in expressions) {

                if (!expressionSamples[expression]) {
                    expressionSamples[expression] = 0;
                }

                expressionSamples[expression] +=
                    expressions[expression];
            }

            scanStatus.textContent =
                "Analyzing...";

        } catch (error) {

            console.error(error);
        }


        /* -----------------------------
           FINISH SCAN
        ----------------------------- */

        if (elapsed >= scanTime) {

            clearInterval(interval);

            finishScan(
                ageSamples,
                genderSamples,
                expressionSamples
            );
        }

    }, 150);
}


/* -----------------------------
   FINISH RESULT
----------------------------- */

function finishScan(
    ageSamples,
    genderSamples,
    expressionSamples
) {

    scanning = false;

    stopCamera();

    faceBox.style.display = "none";

    countdown.textContent = "";

    /* AGE */

    let age = 0;

    if (ageSamples.length > 0) {

        age =
            ageSamples.reduce(
                (sum, value) => sum + value,
                0
            ) / ageSamples.length;
    }

    age = Math.round(age);


    /* GENDER */

    let gender = "Unknown";

    const genders =
        Object.keys(genderSamples);

    if (genders.length > 0) {

        gender =
            genders.reduce((a, b) =>
                genderSamples[a] >
                genderSamples[b]
                    ? a
                    : b
            );
    }

    if (gender === "male") {
        gender = "Male";
    }

    if (gender === "female") {
        gender = "Female";
    }


    /* EXPRESSION */

    let expression = "Neutral";

    const expressions =
        Object.keys(expressionSamples);

    if (expressions.length > 0) {

        expression =
            expressions.reduce((a, b) =>
                expressionSamples[a] >
                expressionSamples[b]
                    ? a
                    : b
            );
    }

    expression =
        expression.charAt(0).toUpperCase() +
        expression.slice(1);


    /* SHOW RESULTS */

    ageResult.textContent =
        age > 0 ? `${age} years` : "Unknown";

    genderResult.textContent =
        gender;

    expressionResult.textContent =
        expression;

    cameraPage.classList.add("hidden");

    resultPage.classList.remove("hidden");
}


/* -----------------------------
   FLIP CAMERA
----------------------------- */

async function flipCamera() {

    facingMode =
        facingMode === "user"
            ? "environment"
            : "user";

    await startCamera();
}


/* -----------------------------
   BUTTON EVENTS
----------------------------- */

startBtn.addEventListener(
    "click",
    openCamera
);


againBtn.addEventListener(
    "click",
    openCamera
);


flipBtn.addEventListener(
    "click",
    flipCamera
);


closeBtn.addEventListener(
    "click",
    () => {

        scanning = false;

        stopCamera();

        cameraPage.classList.add("hidden");

        home.classList.remove("hidden");

        faceBox.style.display = "none";

        countdown.textContent = "";
    }
);


/* -----------------------------
   PAGE CLOSE
----------------------------- */

window.addEventListener(
    "beforeunload",
    stopCamera
);