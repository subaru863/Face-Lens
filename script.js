const camera =
    document.getElementById("camera");

const startButton =
    document.getElementById("startCamera");

const flipButton =
    document.getElementById("flipCamera");

const buttonText =
    document.getElementById("buttonText");

const ageDisplay =
    document.getElementById("age");

const genderDisplay =
    document.getElementById("gender");

const genderConfidence =
    document.getElementById("genderConfidence");

const emotionDisplay =
    document.getElementById("emotion");

const emotionBreakdown =
    document.getElementById("emotionBreakdown");

const emotionSummary =
    document.getElementById("emotionSummary");

const scanStatus =
    document.getElementById("scanStatus");

const cameraMessage =
    document.getElementById("cameraMessage");

const cameraWrapper =
    document.querySelector(".camera-wrapper");

const countdown =
    document.getElementById("countdown");


let modelsLoaded = false;

let scanning = false;

let currentStream = null;

let usingFrontCamera = true;


// ========================================
// LOAD AI MODELS
// ========================================

async function loadAI() {

    if (modelsLoaded) {
        return;
    }

    scanStatus.textContent =
        "LOADING AI";

    const modelURL =
        "https://raw.githubusercontent.com/vladmandic/face-api/master/model/";


    await faceapi.nets.tinyFaceDetector.loadFromUri(
        modelURL
    );


    await faceapi.nets.ageGenderNet.loadFromUri(
        modelURL
    );


    await faceapi.nets.faceExpressionNet.loadFromUri(
        modelURL
    );


    modelsLoaded = true;

    console.log("AI models loaded.");
}


// ========================================
// START CAMERA
// ========================================

async function startCamera() {

    try {

        if (currentStream) {

            currentStream
                .getTracks()
                .forEach(track =>
                    track.stop()
                );
        }


        const facingMode =
            usingFrontCamera
                ? "user"
                : "environment";


        currentStream =
            await navigator.mediaDevices.getUserMedia({

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


        camera.srcObject =
            currentStream;


        await new Promise(resolve => {

            if (camera.readyState >= 1) {

                resolve();

            } else {

                camera.onloadedmetadata =
                    resolve;
            }

        });


        // Mirror front camera only

        if (usingFrontCamera) {

            camera.style.transform =
                "scaleX(-1)";

        } else {

            camera.style.transform =
                "scaleX(1)";
        }


        cameraMessage.style.display =
            "none";


        scanStatus.textContent =
            "READY";


    } catch (error) {

        console.error(error);

        alert(
            "Camera could not be started. Please allow camera permission."
        );

        scanStatus.textContent =
            "CAMERA ERROR";
    }
}


// ========================================
// INITIAL SCAN BUTTON
// ========================================

startButton.addEventListener(
    "click",
    async () => {

        if (scanning) {
            return;
        }


        try {

            startButton.disabled =
                true;


            buttonText.textContent =
                "Preparing...";


            if (!currentStream) {

                await startCamera();

            }


            await loadAI();


            await runCountdown();


            await startScan();


        } catch (error) {

            console.error(error);

            alert(
                "Something went wrong while starting the scan."
            );

        } finally {

            startButton.disabled =
                false;

        }

    }
);


// ========================================
// FLIP CAMERA
// ========================================

flipButton.addEventListener(
    "click",
    async () => {

        if (scanning) {
            return;
        }


        usingFrontCamera =
            !usingFrontCamera;


        flipButton.disabled =
            true;


        await startCamera();


        flipButton.disabled =
            false;

    }
);


// ========================================
// COUNTDOWN
// ========================================

async function runCountdown() {

    for (
        let number = 3;
        number >= 1;
        number--
    ) {

        countdown.textContent =
            number;


        countdown.classList.remove(
            "show"
        );


        // Force animation restart

        void countdown.offsetWidth;


        countdown.classList.add(
            "show"
        );


        await sleep(800);
    }


    countdown.textContent =
        "SCAN";


    countdown.classList.remove(
        "show"
    );


    void countdown.offsetWidth;


    countdown.classList.add(
        "show"
    );


    await sleep(500);

}


// ========================================
// 4 SECOND FACE SCAN
// ========================================

async function startScan() {

    if (scanning) {
        return;
    }


    scanning = true;


    buttonText.textContent =
        "Scanning Face...";


    scanStatus.textContent =
        "SCANNING";


    cameraWrapper.classList.add(
        "scanning"
    );


    ageDisplay.textContent =
        "Analyzing...";


    genderDisplay.textContent =
        "Analyzing...";


    genderConfidence.textContent =
        "Processing AI estimate";


    emotionDisplay.textContent =
        "Analyzing...";


    emotionSummary.textContent =
        "Analyzing expressions";


    emotionBreakdown.innerHTML =
        "";


    // --------------------------------
    // STORAGE
    // --------------------------------

    const ages = [];

    const genders = [];

    const genderProbabilities = [];


    const emotionScores = {

        happy: [],

        sad: [],

        angry: [],

        fearful: [],

        disgusted: [],

        surprised: [],

        neutral: []

    };


    const scanTime =
        4000;


    const startTime =
        Date.now();


    // --------------------------------
    // SCANNING LOOP
    // --------------------------------

    while (
        Date.now() - startTime
        < scanTime
    ) {

        try {

            const result =
                await faceapi

                    .detectSingleFace(
                        camera,
                        new faceapi.TinyFaceDetectorOptions({
                            inputSize: 416,
                            scoreThreshold: 0.5
                        })
                    )

                    .withAgeAndGender()

                    .withFaceExpressions();


            if (result) {

                // AGE

                ages.push(
                    result.age
                );


                // GENDER

                genders.push(
                    result.gender
                );


                genderProbabilities.push(
                    result.genderProbability
                );


                // EXPRESSIONS

                const expressions =
                    result.expressions;


                for (
                    const emotion
                    in emotionScores
                ) {

                    emotionScores[
                        emotion
                    ].push(
                        expressions[
                            emotion
                        ]
                    );

                }

            }


        } catch (error) {

            console.error(
                "Detection error:",
                error
            );

        }


        await sleep(150);
    }


    // --------------------------------
    // FINISH
    // --------------------------------

    cameraWrapper.classList.remove(
        "scanning"
    );


    // =================================
    // NO FACE
    // =================================

    if (ages.length === 0) {

        ageDisplay.textContent =
            "--";


        genderDisplay.textContent =
            "--";


        genderConfidence.textContent =
            "No face detected";


        emotionDisplay.textContent =
            "No face detected";


        emotionSummary.textContent =
            "No face detected";


        emotionBreakdown.innerHTML = `

            <div class="empty-emotions">
                No face was detected during the scan.
                Try moving closer and facing the camera.
            </div>

        `;


        scanStatus.textContent =
            "NO FACE";

        buttonText.textContent =
            "Try Again";


        scanning = false;

        return;
    }


    // =================================
    // AGE RESULT
    // =================================

    const averageAge =
        ages.reduce(
            (sum, age) =>
                sum + age,
            0
        ) / ages.length;


    const finalAge =
        Math.round(
            averageAge
        );


    ageDisplay.textContent =
        finalAge + " years";


    // =================================
    // GENDER RESULT
    // =================================

    const genderCounts = {

        male: 0,

        female: 0

    };


    genders.forEach(
        gender => {

            if (
                gender === "male"
            ) {

                genderCounts.male++;

            } else {

                genderCounts.female++;

            }

        }
    );


    let finalGender =
        "male";


    if (
        genderCounts.female
        >
        genderCounts.male
    ) {

        finalGender =
            "female";
    }


    // Average confidence

    const averageGenderConfidence =
        genderProbabilities.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        genderProbabilities.length;


    const finalGenderConfidence =
        Math.round(
            averageGenderConfidence * 100
        );


    genderDisplay.textContent =
        capitalize(
            finalGender
        );


    genderConfidence.textContent =
        finalGenderConfidence +
        "% model confidence";


    // =================================
    // EMOTION AVERAGES
    // =================================

    const finalEmotions = {};


    for (
        const emotion
        in emotionScores
    ) {

        const values =
            emotionScores[
                emotion
            ];


        const average =
            values.reduce(
                (sum, value) =>
                    sum + value,
                0
            ) /
            values.length;


        finalEmotions[
            emotion
        ] = average;

    }


    // =================================
    // FIND STRONGEST EMOTION
    // =================================

    let finalEmotion =
        "neutral";


    let highestScore =
        0;


    for (
        const emotion
        in finalEmotions
    ) {

        if (
            finalEmotions[
                emotion
            ] > highestScore
        ) {

            highestScore =
                finalEmotions[
                    emotion
                ];


            finalEmotion =
                emotion;

        }

    }


    const finalEmotionPercentage =
        Math.round(
            highestScore * 100
        );


    emotionDisplay.textContent =
        capitalize(
            finalEmotion
        );


    emotionSummary.textContent =
        capitalize(
            finalEmotion
        ) +
        " · " +
        finalEmotionPercentage +
        "%";


    // =================================
    // DISPLAY EMOTIONS
    // =================================

    displayEmotionBreakdown(
        finalEmotions,
        finalEmotion
    );


    scanStatus.textContent =
        "ANALYSIS COMPLETE";


    buttonText.textContent =
        "Scan Again";


    scanning = false;

}


// ========================================
// DISPLAY EMOTION BARS
// ========================================

function displayEmotionBreakdown(
    emotions,
    winningEmotion
) {

    emotionBreakdown.innerHTML =
        "";


    const sorted =
        Object.entries(
            emotions
        ).sort(
            (a, b) =>
                b[1] - a[1]
        );


    sorted.forEach(
        ([emotion, score]) => {

            const percentage =
                Math.round(
                    score * 100
                );


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "emotion-row";


            if (
                emotion ===
                winningEmotion
            ) {

                row.classList.add(
                    "winner"
                );

            }


            const finalBadge =
                emotion ===
                winningEmotion
                    ? `<span class="final-badge">FINAL</span>`
                    : "";


            row.innerHTML = `

                <span class="emotion-name">

                    ${capitalize(
                        emotion
                    )}

                    ${finalBadge}

                </span>


                <div class="emotion-bar">

                    <div
                        class="emotion-fill"
                        style="width: ${percentage}%">
                    </div>

                </div>


                <span class="emotion-percent">

                    ${percentage}%

                </span>

            `;


            emotionBreakdown.appendChild(
                row
            );

        }
    );

}


// ========================================
// SLEEP
// ========================================

function sleep(milliseconds) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );

}


// ========================================
// CAPITALIZE
// ========================================

function capitalize(text) {

    return text
        .charAt(0)
        .toUpperCase()
        +
        text.slice(1);

}