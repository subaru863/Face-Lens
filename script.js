const camera = document.getElementById("camera");
const startButton = document.getElementById("startCamera");

const ageDisplay = document.getElementById("age");
const emotionDisplay = document.getElementById("emotion");

const buttonText = document.getElementById("buttonText");
const scanStatus = document.getElementById("scanStatus");
const cameraMessage = document.getElementById("cameraMessage");
const cameraBox = document.querySelector(".camera-box");

const emotionBreakdown =
    document.getElementById("emotionBreakdown");

let modelsLoaded = false;
let scanning = false;


// ==============================
// LOAD AI
// ==============================

async function loadAI() {

    if (modelsLoaded) return;

    scanStatus.textContent = "LOADING AI";

    const modelURL =
        "https://raw.githubusercontent.com/vladmandic/face-api/master/model/";

    await faceapi.nets.tinyFaceDetector.loadFromUri(modelURL);

    await faceapi.nets.ageGenderNet.loadFromUri(modelURL);

    await faceapi.nets.faceExpressionNet.loadFromUri(modelURL);

    modelsLoaded = true;
}


// ==============================
// START CAMERA / SCAN
// ==============================

startButton.addEventListener("click", async () => {

    try {

        if (!camera.srcObject) {

            const stream =
                await navigator.mediaDevices.getUserMedia({
                    video: true
                });

            camera.srcObject = stream;

            await new Promise(resolve => {
                camera.onloadedmetadata = resolve;
            });
        }

        startButton.disabled = true;

        buttonText.textContent =
            "Preparing Scan...";

        cameraMessage.style.display = "none";

        await loadAI();

        startScan();

    } catch (error) {

        console.error(error);

        alert(
            "Something went wrong. Check your camera permission."
        );

        startButton.disabled = false;

        buttonText.textContent =
            "Start Scan";

        scanStatus.textContent =
            "READY";
    }
});


// ==============================
// 4 SECOND SCAN
// ==============================

async function startScan() {

    if (scanning) return;

    scanning = true;

    const ages = [];

    const emotionScores = {

        happy: [],
        sad: [],
        angry: [],
        fearful: [],
        disgusted: [],
        surprised: [],
        neutral: []

    };

    const scanTime = 4000;

    const startTime = Date.now();

    buttonText.textContent =
        "Scanning Face...";

    scanStatus.textContent =
        "SCANNING";

    cameraBox.classList.add("scanning");

    ageDisplay.textContent =
        "Analyzing...";

    emotionDisplay.textContent =
        "Analyzing...";

    emotionBreakdown.innerHTML = "";


    // ==============================
    // SCAN LOOP
    // ==============================

    while (Date.now() - startTime < scanTime) {

        const result = await faceapi
            .detectSingleFace(
                camera,
                new faceapi.TinyFaceDetectorOptions()
            )
            .withAgeAndGender()
            .withFaceExpressions();

        if (result) {

            ages.push(result.age);

            const expressions =
                result.expressions;

            for (const emotion in emotionScores) {

                emotionScores[emotion].push(
                    expressions[emotion]
                );

            }
        }

        await new Promise(resolve =>
            setTimeout(resolve, 150)
        );
    }


    // ==============================
    // NO FACE
    // ==============================

    if (ages.length === 0) {

        ageDisplay.textContent = "--";

        emotionDisplay.textContent =
            "No face detected";

        emotionBreakdown.innerHTML = "";

        scanStatus.textContent =
            "NO FACE";

    } else {

        // ==========================
        // AGE
        // ==========================

        const averageAge =
            ages.reduce(
                (sum, age) => sum + age,
                0
            ) / ages.length;

        const finalAge =
            Math.round(averageAge);

        ageDisplay.textContent =
            finalAge + " years";


        // ==========================
        // AVERAGE EMOTIONS
        // ==========================

        const finalEmotions = {};

        for (const emotion in emotionScores) {

            const values =
                emotionScores[emotion];

            const average =
                values.reduce(
                    (sum, value) => sum + value,
                    0
                ) / values.length;

            finalEmotions[emotion] =
                average;
        }


        // ==========================
        // FIND HIGHEST
        // ==========================

        let finalEmotion = "neutral";
        let highestScore = 0;

        for (const emotion in finalEmotions) {

            if (
                finalEmotions[emotion] >
                highestScore
            ) {

                highestScore =
                    finalEmotions[emotion];

                finalEmotion =
                    emotion;
            }
        }


        emotionDisplay.textContent =
            capitalize(finalEmotion);


        // ==========================
        // DISPLAY ALL EMOTIONS
        // ==========================

        displayEmotionBreakdown(
            finalEmotions
        );

        scanStatus.textContent =
            "ANALYSIS COMPLETE";
    }


    cameraBox.classList.remove("scanning");

    startButton.disabled = false;

    buttonText.textContent =
        "Scan Again";

    scanning = false;
}


// ==============================
// EMOTION BREAKDOWN
// ==============================

function displayEmotionBreakdown(emotions) {

    emotionBreakdown.innerHTML = "";

    const sorted =
        Object.entries(emotions)
            .sort((a, b) => b[1] - a[1]);


    for (const [emotion, score] of sorted) {

        const percentage =
            Math.round(score * 100);


        const row =
            document.createElement("div");

        row.className =
            "emotion-row";


        row.innerHTML = `

            <span class="emotion-name">
                ${capitalize(emotion)}
            </span>

            <div class="emotion-bar">

                <div
                    class="emotion-fill"
                    style="width: ${percentage}%"
                ></div>

            </div>

            <span class="emotion-percent">
                ${percentage}%
            </span>

        `;


        emotionBreakdown.appendChild(row);
    }
}


// ==============================
// CAPITALIZE
// ==============================

function capitalize(text) {

    return text.charAt(0).toUpperCase()
        + text.slice(1);
}