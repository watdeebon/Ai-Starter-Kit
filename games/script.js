// AI Quiz Game JavaScript with JSONP Support
(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        LIFF_ID: '2007750782-NE3KqA8Y',
        // แทนที่ด้วย URL ของ Google Apps Script ที่ deploy แล้ว
        GAS_URL: 'https://script.google.com/macros/s/AKfycbw2uQQxdXmmiGvYvAHcC8xfo0qr1Ho03nnHQ9PzbIIiGqQ7SnoIFkOkurHM2HIpaoF5jg/exec',
        QUIZ_TIME: 30, // วินาทีต่อข้อ
        SCORE_PER_QUESTION: 10
    };

    // Game State
    let gameState = {
        currentUser: null,
        currentQuestion: 0,
        score: 0,
        timeLeft: CONFIG.QUIZ_TIME,
        timer: null,
        startTime: 0,
        leaderboard: [],
        gameStarted: false
    };

    // Quiz Questions
    const questions = [
        {
            question: "AI ย่อมาจากคำว่าอะไร?",
            answers: ["Artificial Intelligence", "Advanced Intelligence", "Automated Intelligence", "Applied Intelligence"],
            correct: 0
        },
        {
            question: "ข้อใดไม่ใช่ประโยชน์ของ AI ในการศึกษา?",
            answers: ["ปรับการสอนตามผู้เรียนแต่ละคน", "ช่วยสร้างเนื้อหาการสอน", "แทนที่ครูทั้งหมด", "ประเมินผลการเรียนอัตโนมัติ"],
            correct: 2
        },
        {
            question: "ChatGPT ถูกพัฒนาโดยบริษัทใด?",
            answers: ["Google", "Microsoft", "OpenAI", "Meta"],
            correct: 2
        },
        {
            question: "Machine Learning คืออะไร?",
            answers: ["การเรียนรู้ด้วยเครื่องจักร", "การเรียนรู้ของเครื่องคอมพิวเตอร์จากข้อมูล", "การสอนเครื่องจักร", "การใช้เครื่องจักรในการเรียน"],
            correct: 1
        },
        {
            question: "ข้อใดเป็นข้อควรระวังในการใช้ AI ในห้องเรียน?",
            answers: ["ตรวจสอบความถูกต้องของข้อมูล", "ไม่ใส่ข้อมูลส่วนตัวนักเรียน", "ไม่ให้ AI ทำแทนทุกอย่าง", "ทั้งหมดข้างต้น"],
            correct: 3
        },
        {
            question: "เครื่องมือใดเหมาะสำหรับสร้างภาพประกอบการสอนด้วย AI?",
            answers: ["ChatGPT", "Canva AI", "Google Sheets", "PowerPoint"],
            correct: 1
        },
        {
            question: "Deep Learning คืออะไร?",
            answers: ["การเรียนรู้ลึกของมนุษย์", "การเรียนรู้ของ AI ที่เลียนแบบสมองมนุษย์", "การเรียนรู้ในที่ลึก", "การเรียนรู้เป็นเวลานาน"],
            correct: 1
        },
        {
            question: "ข้อใดเป็นตัวอย่างการใช้ AI ในชีวิตประจำวัน?",
            answers: ["Netflix แนะนำหนัง", "Google Maps นำทาง", "Siri ตอบคำถาม", "ทั้งหมดข้างต้น"],
            correct: 3
        },
        {
            question: "การเขียน Prompt ที่ดีควรมีคุณสมบัติใด?",
            answers: ["ชัดเจนและมีรายละเอียด", "สั้นและกะทัดรัด", "ใช้ภาษาอังกฤษเท่านั้น", "ไม่ต้องระบุบริบท"],
            correct: 0
        },
        {
            question: "อนาคตของ AI ในการศึกษาจะเป็นอย่างไร?",
            answers: ["แทนที่ครูทั้งหมด", "เป็นเครื่องมือช่วยครูสอนดีขึ้น", "ทำลายระบบการศึกษา", "ไม่มีผลกระทบใดๆ"],
            correct: 1
        }
    ];

    // JSONP Helper Functions
    function makeJSONPRequest(url, params, callback) {
        const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
        
        // สร้าง URL พร้อม parameters
        const separator = url.includes('?') ? '&' : '?';
        let requestUrl = url + separator + 'callback=' + callbackName;
        
        // เพิ่ม parameters อื่นๆ
        for (const key in params) {
            if (params.hasOwnProperty(key)) {
                requestUrl += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
            }
        }
        
        console.log('JSONP Request URL:', requestUrl); // Debug log
        
        // สร้าง callback function
        window[callbackName] = function(data) {
            console.log('JSONP Response:', data); // Debug log
            callback(data);
            // ลบ script element และ callback function
            if (document.head.contains(script)) {
                document.head.removeChild(script);
            }
            delete window[callbackName];
        };
        
        // สร้าง script element
        const script = document.createElement('script');
        script.src = requestUrl;
        script.onerror = function() {
            console.error('JSONP Error for URL:', requestUrl);
            callback({ status: 'error', message: 'Network error' });
            if (document.head.contains(script)) {
                document.head.removeChild(script);
            }
            delete window[callbackName];
        };
        
        // เพิ่ม timeout
        const timeout = setTimeout(() => {
            console.error('JSONP Timeout for URL:', requestUrl);
            callback({ status: 'error', message: 'Request timeout' });
            if (document.head.contains(script)) {
                document.head.removeChild(script);
            }
            delete window[callbackName];
        }, 10000); // 10 วินาที timeout
        
        // Override callback เพื่อ clear timeout
        const originalCallback = window[callbackName];
        window[callbackName] = function(data) {
            clearTimeout(timeout);
            originalCallback(data);
        };
        
        document.head.appendChild(script);
    }

    // API Functions using JSONP
    function saveScore() {
        if (!gameState.currentUser) {
            console.log('No user logged in');
            return;
        }

        console.log('Saving score for user:', gameState.currentUser.displayName, 'Score:', gameState.score);

        const scoreData = {
            action: 'saveScore',
            userId: gameState.currentUser.userId,
            name: gameState.currentUser.displayName,
            pictureUrl: gameState.currentUser.pictureUrl,
            score: gameState.score.toString(), // แปลงเป็น string
            timestamp: new Date().toISOString()
        };

        console.log('Score data to save:', scoreData);

        makeJSONPRequest(CONFIG.GAS_URL, scoreData, function(response) {
            console.log('Save score response:', response);
            if (response.status === 'success') {
                console.log('Score saved successfully');
            } else {
                console.error('Error saving score:', response.message || 'Unknown error');
            }
        });
    }

    function loadLeaderboard(callback) {
        console.log('Loading leaderboard...');
        
        makeJSONPRequest(CONFIG.GAS_URL, { action: 'getLeaderboard' }, function(response) {
            console.log('Leaderboard response:', response);
            if (response.status === 'success') {
                gameState.leaderboard = response.data || [];
                console.log('Leaderboard loaded:', gameState.leaderboard.length, 'players');
                if (callback) callback(gameState.leaderboard);
            } else {
                console.error('Error loading leaderboard:', response.message || 'Unknown error');
                if (callback) callback([]);
            }
        });
    }

    // เพิ่มฟังก์ชันทดสอบ API
    function testAPI() {
        console.log('Testing API connection...');
        makeJSONPRequest(CONFIG.GAS_URL, { action: 'testAPI' }, function(response) {
            console.log('API Test Response:', response);
            if (response.status === 'success') {
                console.log('✅ API connection successful!');
                alert('API ทำงานปกติ!\n' + response.data.message);
            } else {
                console.error('❌ API connection failed!');
                alert('API มีปัญหา!\n' + response.message);
            }
        });
    }

    // LIFF Functions
    async function initializeLiff() {
        try {
            await liff.init({ liffId: CONFIG.LIFF_ID });
            
            if (liff.isLoggedIn()) {
                const profile = await liff.getProfile();
                gameState.currentUser = {
                    userId: profile.userId,
                    displayName: profile.displayName,
                    pictureUrl: profile.pictureUrl
                };
                
                displayUserInfo();
                showGame();
            } else {
                liff.login();
            }
        } catch (error) {
            console.error('LIFF initialization error:', error);
            showError('ไม่สามารถเชื่อมต่อกับ LINE ได้');
        }
    }

    function displayUserInfo() {
        if (gameState.currentUser) {
            const userInfo = document.getElementById('userInfo');
            const userName = document.getElementById('userName');
            const userAvatar = document.getElementById('userAvatar');
            
            userInfo.style.display = 'flex';
            userName.textContent = gameState.currentUser.displayName;
            userAvatar.src = gameState.currentUser.pictureUrl;
        }
    }

    function showGame() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('game').style.display = 'block';
        document.getElementById('game').classList.add('fade-in');
    }

    function showError(message) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }

    // Game Functions
    function startQuiz() {
        hideAllScreens();
        document.getElementById('quizContainer').style.display = 'block';
        
        gameState.currentQuestion = 0;
        gameState.score = 0;
        gameState.gameStarted = true;
        
        showQuestion();
    }

    function showLeaderboard() {
        hideAllScreens();
        document.getElementById('leaderboardView').style.display = 'block';
        
        // โหลดลีดเดอร์บอร์ด
        loadLeaderboard(function(leaderboard) {
            displayLeaderboardInContainer('standAloneLeaderboardList', leaderboard);
        });
    }

    function backToStart() {
        hideAllScreens();
        document.getElementById('startScreen').style.display = 'block';
    }

    function hideAllScreens() {
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('quizContainer').style.display = 'none';
        document.getElementById('leaderboardView').style.display = 'none';
        document.getElementById('results').style.display = 'none';
    }

    function showQuestion() {
        if (gameState.currentQuestion >= questions.length) {
            endQuiz();
            return;
        }

        const question = questions[gameState.currentQuestion];
        
        document.getElementById('questionNumber').textContent = gameState.currentQuestion + 1;
        document.getElementById('questionText').textContent = question.question;
        
        // Update progress bar
        const progress = ((gameState.currentQuestion) / questions.length) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
        
        // Create answer buttons
        const answersContainer = document.getElementById('answersContainer');
        answersContainer.innerHTML = '';
        
        question.answers.forEach((answer, index) => {
            const answerDiv = document.createElement('div');
            answerDiv.className = 'answer slide-up';
            answerDiv.innerHTML = `<div class="answer-text">${answer}</div>`;
            answerDiv.onclick = () => selectAnswer(index);
            answersContainer.appendChild(answerDiv);
        });
        
        // Reset timer
        gameState.timeLeft = CONFIG.QUIZ_TIME;
        gameState.startTime = Date.now();
        startTimer();
        
        document.getElementById('nextBtn').style.display = 'none';
    }

    function startTimer() {
        gameState.timer = setInterval(() => {
            gameState.timeLeft--;
            const timerElement = document.getElementById('timer');
            timerElement.textContent = gameState.timeLeft;
            
            // เปลี่ยนสีเมื่อเวลาใกล้หมด
            if (gameState.timeLeft <= 10) {
                timerElement.style.background = '#FF4444';
                timerElement.style.animation = 'pulse 1s infinite';
            }
            
            if (gameState.timeLeft <= 0) {
                clearInterval(gameState.timer);
                timeUp();
            }
        }, 1000);
    }

    function selectAnswer(selectedIndex) {
        clearInterval(gameState.timer);
        
        const question = questions[gameState.currentQuestion];
        const answers = document.querySelectorAll('.answer');
        
        // Disable all answers
        answers.forEach((answer, index) => {
            answer.onclick = null;
            if (index === question.correct) {
                answer.classList.add('correct');
            } else if (index === selectedIndex) {
                answer.classList.add('incorrect');
            } else {
                answer.style.opacity = '0.5';
            }
        });
        
        // Calculate score
        if (selectedIndex === question.correct) {
            const timeBonus = Math.floor(gameState.timeLeft / 3); // Bonus for speed
            const questionScore = CONFIG.SCORE_PER_QUESTION + timeBonus;
            gameState.score += questionScore;
            
            // เอฟเฟกต์คะแนน
            showScoreEffect(questionScore);
        }
        
        document.getElementById('nextBtn').style.display = 'block';
    }

    function timeUp() {
        const answers = document.querySelectorAll('.answer');
        const question = questions[gameState.currentQuestion];
        
        answers.forEach((answer, index) => {
            answer.onclick = null;
            if (index === question.correct) {
                answer.classList.add('correct');
            } else {
                answer.style.opacity = '0.5';
            }
        });
        
        document.getElementById('nextBtn').style.display = 'block';
    }

    function nextQuestion() {
        gameState.currentQuestion++;
        showQuestion();
    }

    function endQuiz() {
        hideAllScreens();
        document.getElementById('results').style.display = 'block';
        
        // Display final score
        document.getElementById('finalScore').textContent = gameState.score;
        document.getElementById('scoreMessage').textContent = getScoreMessage(gameState.score);
        
        // Save score and load leaderboard
        saveScore();
        loadLeaderboard(function(leaderboard) {
            displayLeaderboardInContainer('leaderboardList', leaderboard);
        });
    }

    function displayLeaderboardInContainer(containerId, leaderboard) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        if (!leaderboard || leaderboard.length === 0) {
            container.innerHTML = '<div class="error">ยังไม่มีข้อมูลลีดเดอร์บอร์ด</div>';
            return;
        }
        
        leaderboard.slice(0, 10).forEach((player, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item slide-up';
            
            let rankClass = '';
            if (index === 0) rankClass = 'first';
            else if (index === 1) rankClass = 'second';
            else if (index === 2) rankClass = 'third';
            
            item.innerHTML = `
                <div class="rank ${rankClass}">${index + 1}</div>
                <img class="player-avatar" src="${player.pictureUrl}" alt="${player.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGRkQ3MDAiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBzdHlsZT0idHJhbnNmb3JtOiB0cmFuc2xhdGUoOHB4LCA4cHgpOyI+CjxwYXRoIGQ9Ik0xMiAxMkM5Ljc5IDEyIDggMTAuMjEgOCA4UzkuNzkgNCAxMiA0IDE2IDUuNzkgMTYgOCAxNC4yMSAxMiAxMiAxMlpNMTIgMTRDMTYuNDIgMTQgMjAgMTUuNzkgMjAgMThWMjBIMFYxOEMwIDE1Ljc5IDMuNTggMTQgOCAxNEgxMloiIGZpbGw9IiMxYTFhMWEiLz4KPC9zdmc+Cjwvc3ZnPgo='">
                <div class="player-info">
                    <div class="player-name">${player.name}</div>
                    <div style="font-size: 0.9rem; color: #999;">
                        ${new Date(player.timestamp).toLocaleDateString('th-TH')}
                    </div>
                </div>
                <div class="player-score">${player.score}</div>
            `;
            
            // Highlight current user
            if (gameState.currentUser && player.userId === gameState.currentUser.userId) {
                item.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
                item.style.color = '#1a1a1a';
                item.style.border = '2px solid #FF8C00';
            }
            
            container.appendChild(item);
        });
    }

    function showScoreEffect(score) {
        // สร้างเอฟเฟกต์แสดงคะแนน
        const effect = document.createElement('div');
        effect.textContent = `+${score}`;
        effect.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #FFD700;
            font-size: 2rem;
            font-weight: bold;
            pointer-events: none;
            z-index: 1000;
            animation: scoreEffect 1s ease-out forwards;
        `;
        
        document.body.appendChild(effect);
        
        // เพิ่ม CSS animation
        if (!document.querySelector('#scoreEffectStyle')) {
            const style = document.createElement('style');
            style.id = 'scoreEffectStyle';
            style.textContent = `
                @keyframes scoreEffect {
                    0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5) translateY(-50px); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            document.body.removeChild(effect);
        }, 1000);
    }

    function getScoreMessage(score) {
        if (score >= 80) return 'ยอดเยี่ยม! คุณเป็นผู้เชี่ยวชาญ AI 🏆';
        else if (score >= 60) return 'ดีมาก! คุณมีความรู้ AI ในระดับดี 👍';
        else if (score >= 40) return 'ไม่เลว! ลองศึกษา AI เพิ่มเติมนะ 📚';
        else return 'ยังต้องเรียนรู้เพิ่มเติม ไม่เป็นไร! 💪';
    }

    function restartQuiz() {
        // Reset game state
        gameState.currentQuestion = 0;
        gameState.score = 0;
        gameState.timeLeft = CONFIG.QUIZ_TIME;
        gameState.gameStarted = false;
        
        // Show start screen
        hideAllScreens();
        document.getElementById('startScreen').style.display = 'block';
        
        // Reset progress bar
        document.getElementById('progressFill').style.width = '0%';
        
        // Reset timer display
        document.getElementById('timer').style.background = '#FF4444';
        document.getElementById('timer').style.animation = 'none';
    }

    // Share Functions
    async function shareScore() {
        if (!liff.isApiAvailable('shareTargetPicker')) {
            alert('การแชร์ไม่สามารถใช้งานได้ในสภาพแวดล้อมนี้');
            return;
        }

        try {
            await liff.shareTargetPicker([
                {
                    type: 'flex',
                    altText: `🤖 AI Quiz ผลคะแนน: ${gameState.score}/100`,
                    contents: createScoreFlexMessage()
                }
            ]);
        } catch (error) {
            console.error('Error sharing score:', error);
            alert('เกิดข้อผิดพลาดในการแชร์');
        }
    }

    async function shareLeaderboard() {
        if (!liff.isApiAvailable('shareTargetPicker')) {
            alert('การแชร์ไม่สามารถใช้งานได้ในสภาพแวดล้อมนี้');
            return;
        }

        try {
            await liff.shareTargetPicker([
                {
                    type: 'flex',
                    altText: '🏆 AI Quiz Leaderboard',
                    contents: createLeaderboardFlexMessage()
                }
            ]);
        } catch (error) {
            console.error('Error sharing leaderboard:', error);
            alert('เกิดข้อผิดพลาดในการแชร์');
        }
    }

    function createScoreFlexMessage() {
        return {
            type: 'bubble',
            size: 'kilo',
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            {
                                type: 'image',
                                url: 'https://raw.githubusercontent.com/watdeebon/LineBot/refs/heads/main/logo-BotWDB.png',
                                size: 'xs',
                                flex: 0
                            },
                            {
                                type: 'text',
                                text: 'AI Quiz Challenge',
                                weight: 'bold',
                                size: 'md',
                                color: '#1a1a1a',
                                margin: 'sm',
                                flex: 4
                            }
                        ]
                    },
                    {
                        type: 'separator',
                        margin: 'md'
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'md',
                        contents: [
                            {
                                type: 'text',
                                text: `${gameState.currentUser.displayName}`,
                                size: 'sm',
                                color: '#666666',
                                align: 'center'
                            },
                            {
                                type: 'text',
                                text: `${gameState.score}`,
                                size: 'xxl',
                                weight: 'bold',
                                color: '#FFD700',
                                align: 'center'
                            },
                            {
                                type: 'text',
                                text: 'คะแนน',
                                size: 'sm',
                                color: '#666666',
                                align: 'center'
                            }
                        ]
                    },
                    {
                        type: 'separator',
                        margin: 'md'
                    },
                    {
                        type: 'button',
                        action: {
                            type: 'uri',
                            label: '🎮 เล่นเกม',
                            uri: 'https://liff.line.me/' + CONFIG.LIFF_ID
                        },
                        style: 'primary',
                        color: '#FFD700'
                    }
                ]
            }
        };
    }

    function createLeaderboardFlexMessage() {
        const topPlayers = gameState.leaderboard.slice(0, 3);
        
        return {
            type: 'bubble',
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            {
                                type: 'image',
                                url: 'https://raw.githubusercontent.com/watdeebon/LineBot/refs/heads/main/logo-BotWDB.png',
                                size: 'xs',
                                flex: 0
                            },
                            {
                                type: 'text',
                                text: 'AI Quiz Leaderboard',
                                weight: 'bold',
                                size: 'md',
                                color: '#1a1a1a',
                                margin: 'sm',
                                flex: 4
                            }
                        ]
                    },
                    {
                        type: 'separator',
                        margin: 'md'
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'md',
                        contents: topPlayers.map((player, index) => {
                            const medals = ['🥇', '🥈', '🥉'];
                            return {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: medals[index],
                                        size: 'md',
                                        flex: 0
                                    },
                                    {
                                        type: 'text',
                                        text: player.name,
                                        size: 'sm',
                                        flex: 3,
                                        margin: 'sm'
                                    },
                                    {
                                        type: 'text',
                                        text: `${player.score}`,
                                        size: 'sm',
                                        weight: 'bold',
                                        color: '#FFD700',
                                        flex: 1,
                                        align: 'end'
                                    }
                                ],
                                margin: 'sm'
                            };
                        })
                    },
                    {
                        type: 'separator',
                        margin: 'md'
                    },
                    {
                        type: 'button',
                        action: {
                            type: 'uri',
                            label: '🚀 เข้าร่วมการแข่งขัน',
                            uri: 'https://liff.line.me/' + CONFIG.LIFF_ID
                        },
                        style: 'primary',
                        color: '#FFD700'
                    }
                ]
            }
        };
    }

    // Button Ripple Effect
    function addRippleEffect(button, event) {
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // Global Functions (accessible from HTML)
    window.startQuiz = startQuiz;
    window.showLeaderboard = showLeaderboard;
    window.backToStart = backToStart;
    window.nextQuestion = nextQuestion;
    window.selectAnswer = selectAnswer;
    window.restartQuiz = restartQuiz;
    window.shareScore = shareScore;
    window.shareLeaderboard = shareLeaderboard;
    window.testAPI = testAPI; // เพิ่มฟังก์ชันทดสอบ

    // Initialize when page loads
    document.addEventListener('DOMContentLoaded', function() {
        // Add ripple effect to all buttons
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('click', function(e) {
                addRippleEffect(this, e);
            });
        });

        // Initialize LIFF
        initializeLiff();

        // Add keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (gameState.gameStarted && gameState.currentQuestion < questions.length) {
                // เลข 1-4 สำหรับเลือกคำตอบ
                if (e.key >= '1' && e.key <= '4') {
                    const index = parseInt(e.key) - 1;
                    const answers = document.querySelectorAll('.answer');
                    if (answers[index] && answers[index].onclick) {
                        answers[index].click();
                    }
                }
                // Enter สำหรับข้อต่อไป
                else if (e.key === 'Enter') {
                    const nextBtn = document.getElementById('nextBtn');
                    if (nextBtn.style.display !== 'none') {
                        nextBtn.click();
                    }
                }
            }
        });
    });

})();
