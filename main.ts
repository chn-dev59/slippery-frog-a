// --- 1. INTERFACES ---
interface Platform { x: number; y: number; w: number; h: number; platType: string }
interface LevelData { spawnX: number; spawnY: number; platforms: Platform[] }

// --- 2. CONSTANTS & STATE ---
const GRAVITY = 500
const MAX_CHARGE = 300
const CHARGE_RATE = 55
const MOVE_SPEED = 75
const WALL_BOUNCE = 60

let isCharging = false
let chargeLevel = 0
let currentStage = 0
let totalScore = 100

// Tracking menu states and input density
let inConsentMenu = true
let totalButtonPresses = 0
let wasAPressedLastFrame = false

// Load High Score from memory
let highScore = settings.readNumber("high_score") || 0

// --- 3. THE LEVELS ---
const levels: LevelData[] = [
    { spawnX: 20, spawnY: 40, platforms: [{ x: -10, y: 0, w: 10, h: 180, platType: "gold" }, { x: 0, y: 80, w: 80, h: 100, platType: "normal" }, { x: 80, y: 100, w: 80, h: 80, platType: "normal" }, { x: 160, y: 80, w: 80, h: 100, platType: "normal" }, { x: 240, y: 110, w: 60, h: 70, platType: "normal" }, { x: 300, y: 50, w: 50, h: 130, platType: "normal" }, { x: 350, y: 80, w: 60, h: 100, platType: "goal" }, { x: 410, y: 0, w: 20, h: 180, platType: "gold" }] },
    { spawnX: 10, spawnY: 40, platforms: [{ x: 0, y: 80, w: 50, h: 40, platType: "normal" }, { x: 100, y: 80, w: 50, h: 40, platType: "normal" }, { x: 180, y: 65, w: 60, h: 15, platType: "normal" }, { x: 280, y: 45, w: 60, h: 15, platType: "normal" }, { x: 380, y: 30, w: 50, h: 120, platType: "goal" }] },
    { spawnX: 10, spawnY: 60, platforms: [{ x: 0, y: 90, w: 50, h: 30, platType: "normal" }, { x: 80, y: 45, w: 40, h: 10, platType: "normal" }, { x: 150, y: 100, w: 20, h: 40, platType: "normal" }, { x: 200, y: 90, w: 45, h: 50, platType: "normal" }, { x: 280, y: 65, w: 45, h: 70, platType: "normal" }, { x: 350, y: 25, w: 60, h: 10, platType: "goal" }] },
    { spawnX: 10, spawnY: 60, platforms: [{ x: 0, y: 100, w: 80, h: 20, platType: "normal" }, { x: 120, y: 40, w: 30, h: 10, platType: "normal" }, { x: 120, y: 80, w: 60, h: 10, platType: "normal" }, { x: 220, y: 90, w: 40, h: 10, platType: "normal" }, { x: 300, y: 60, w: 40, h: 80, platType: "normal" }, { x: 380, y: 100, w: 60, h: 20, platType: "normal" }, { x: 480, y: 70, w: 60, h: 10, platType: "goal" }] }
]

// --- 4. SPRITES & ASSETS ---
const frogIdle = img`
    . . . . . . . . . . . . . . . . 
    . . 7 7 7 . . . . . 7 7 7 . . . 
    . 7 7 1 1 7 7 7 7 7 1 1 7 7 . . 
    . 7 7 1 f 7 7 7 7 7 1 f 7 7 . . 
    7 7 7 7 7 7 7 7 7 7 7 7 7 7 7 . 
    7 7 3 3 7 7 7 7 7 7 7 3 3 7 7 . 
    7 7 7 7 7 7 7 7 7 7 7 7 7 7 7 . 
    7 7 7 7 7 6 6 6 6 6 7 7 7 7 7 . 
    . 7 7 7 7 7 7 7 7 7 7 7 7 7 7 . 
    . . 7 7 . . . . . . . 7 7 . . . 
`
const frogCharging = img`
    . . . . . . . . . . . . . . . . 
    . . 4 4 4 . . . . . 4 4 4 . . . 
    . 4 4 1 1 4 4 4 4 4 1 1 4 4 . . 
    . 4 4 1 f 4 4 4 4 4 1 f 4 4 . . 
    4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 . 
    4 4 2 2 4 4 4 4 4 4 4 2 2 4 4 . 
    4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 . 
    . 4 4 4 . . . . . . . 4 4 4 . . 
`
const starImg = img`
    . . . . . . . . . . . . . . . . 
    . . . . . . . 5 . . . . . . . . 
    . . . . . . 5 5 5 . . . . . . . 
    . . . . 5 5 5 5 5 5 5 . . . . . 
    . . . . . 5 5 5 5 5 . . . . . . 
    . . . . 5 5 5 5 5 5 5 . . . . . 
    . . . . . 5 . . . 5 . . . . . . 
`

let player = sprites.create(frogIdle, SpriteKind.Player)
player.ay = GRAVITY
player.z = 100
scene.cameraFollowSprite(player)

player.setFlag(SpriteFlag.Invisible, true)

function loadStage(index: number) {
    isCharging = false;
    chargeLevel = 0;
    player.sayText("");
    for (let s of sprites.allOfKind(SpriteKind.Food)) s.destroy()
    for (let b of sprites.allOfKind(SpriteKind.Enemy)) b.destroy()

    let data = levels[index]
    player.setPosition(data.spawnX, data.spawnY)
    player.vx = 0; player.vy = 0;
    player.setImage(frogIdle)

    // Find the goal platform
    let goalPlat: Platform = null
    for (let p of data.platforms) {
        if (p.platType == "goal") {
            goalPlat = p
            break
        }
    }

    // Spawn a full-height goal safety pillar starting from level 2 (index 1) onwards
    if (goalPlat != null && index > 0) {
        // 20px wide, 180px tall matching the first level's boundary structure sizing
        let goalBumper = image.create(20, 180)
        goalBumper.fill(5) // Main blue fill color

        // Render the golden striped alignment accent line patterns
        for (let i = 0; i < 20; i += 2) {
            goalBumper.drawLine(i, 0, i, 180, 4)
        }
        goalBumper.drawLine(1, 0, 1, 180, 1) // White trim line accent

        let stopper = sprites.create(goalBumper, SpriteKind.Food)
        // Position it right at the back end of the platform, stretching perfectly down the screen layout
        stopper.setPosition(goalPlat.x + goalPlat.w + 10, 90)
        stopper.z = 15
    }

    for (let p of data.platforms) {
        let platImg = image.create(p.w, p.h)
        if (p.platType == "goal") {
            platImg.fill(5)
            platImg.drawLine(0, 0, p.w, 0, 4)
        } else if (p.platType == "gold") {
            platImg.fill(5)
            for (let i = 0; i < p.w; i += 2) platImg.drawLine(i, 0, i, p.h, 4)
            platImg.drawLine(1, 0, 1, p.h, 1)
        } else {
            platImg.fill(11)
            let jaggedHeight = Math.floor(p.h * 0.4)
            for (let x = 0; x < p.w; x++) {
                let currentJag = jaggedHeight + Math.randomRange(-2, 2)
                platImg.drawLine(x, 0, x, Math.clamp(0, p.h, currentJag), 13)
            }
            let fossilCount = Math.max(1, (p.w * p.h) / 180);
            for (let i = 0; i < fossilCount; i++) {
                let fx = Math.randomRange(4, p.w - 4);
                let fy = Math.randomRange(8, p.h - 4);
                platImg.setPixel(fx, fy, 1);
            }
            platImg.fillRect(0, 0, p.w, 3, 7)
            platImg.drawLine(0, 0, p.w, 0, 6)
        }
        let plat = sprites.create(platImg, SpriteKind.Food)
        plat.setPosition(p.x + p.w / 2, p.y + p.h / 2)
        plat.z = 10
        if (p.platType == "goal") {
            let star = sprites.create(starImg, SpriteKind.Enemy)
            star.setPosition(p.x + p.w / 2, p.y - 6)
            star.z = 11
        }
    }
}

// --- PHYSICS & END GAME LOGIC ---
game.onUpdate(function () {
    if (inConsentMenu) {
        if (controller.A.isPressed()) {
            inConsentMenu = false
            player.setFlag(SpriteFlag.Invisible, false)
            loadStage(0)
        } else if (controller.B.isPressed()) {
            game.over(false)
        }
        return
    }

    if (totalScore <= 0) {
        showGameOver(false);
    }

    let isAPressedNow = controller.A.isPressed()
    if (isAPressedNow && !wasAPressedLastFrame) {
        totalButtonPresses++
    }
    wasAPressedLastFrame = isAPressedNow

    let standing = false; let onWall = false
    for (let p of sprites.allOfKind(SpriteKind.Food)) {
        let isGoal = (p.image.getPixel(0, 0) == 5 && p.height < 150)
        if (player.overlapsWith(p)) {
            let oL = player.right - p.left; let oR = p.right - player.left
            let oT = player.bottom - p.top; let realOB = p.bottom - player.top
            let minOverlap = Math.min(Math.min(oL, oR), Math.min(oT, realOB))
            if (minOverlap == oT && player.vy >= 0) { player.bottom = p.top; player.vy = 0; standing = true }
            else if (!isGoal) {
                if (minOverlap == realOB && player.vy < 0) { player.top = p.bottom; player.vy = 0 }
                else if (minOverlap == oL) { player.right = p.left; if (!standing) player.vx = -WALL_BOUNCE; onWall = true }
                else if (minOverlap == oR) { player.left = p.right; if (!standing) player.vx = WALL_BOUNCE; onWall = true }
            }
        }
    }
    for (let s of sprites.allOfKind(SpriteKind.Enemy)) if (player.overlapsWith(s)) nextLevel()
    if (standing || onWall) {
        if (Math.abs(player.vx) < 10) player.vx = 0
        if (controller.A.isPressed()) {
            isCharging = true; player.setImage(frogCharging)
            if (chargeLevel < MAX_CHARGE) chargeLevel += CHARGE_RATE
            player.sayText(Math.floor(Math.min(100, (chargeLevel / MAX_CHARGE) * 100)) + "%")
        } else if (isCharging) {
            player.sayText(""); player.vy = -Math.max(70, Math.min(MAX_CHARGE, chargeLevel));
            player.vx = MOVE_SPEED; isCharging = false; chargeLevel = 0; player.setImage(frogIdle)
        }
    }
    if (player.y > 220) {
        totalScore -= 20;
        loadStage(currentStage)
    }
})

function showGameOver(win: boolean) {
    if (totalScore > highScore) {
        highScore = totalScore;
        settings.writeNumber("high_score", highScore);
    }

    let totalSeconds = Math.max(1, Math.floor(game.runtime() / 1000));
    let actionsPerMinute = Math.floor((totalButtonPresses / totalSeconds) * 60);

    game.showLongText(
        (win ? "VICTORY!" : "GAME OVER") + "\n\n" +
        "Score: " + totalScore + "\n" +
        "High Score: " + highScore + "\n" +
        "Time: " + totalSeconds + "s\n" +
        "BPM: " + actionsPerMinute,
        DialogLayout.Center
    )
    game.over(win);
}

function nextLevel() {
    totalScore += 100;
    music.baDing.play();
    currentStage++;

    if (currentStage < levels.length) {
        loadStage(currentStage);
    } else {
        showGameOver(true);
    }
}

// --- HUD & BACKGROUND ---
game.onPaint(function () {
    if (inConsentMenu) {
        screen.fill(15)
        screen.fillRect(10, 10, 140, 100, 1)
        screen.fillRect(12, 12, 136, 96, 15)

        screen.print("CONSENT FORM", 45, 20, 1)
        screen.print("Do you consent to", 30, 42, 5)
        screen.print("having your gameplay", 20, 52, 5)
        screen.print("info tracked?", 44, 62, 5)

        screen.print("Press (A) to AGREE", 28, 82, 2)
        screen.print("Press (B) to DENY", 31, 94, 4)
        return
    }

    screen.fill(15)
    for (let i = 0; i < 15; i++) {
        let sx = (43 * i) % 160
        let sy = (29 * i) % 80
        screen.setPixel(sx, sy, 1)
    }

    let sunX = 130
    let sunY = 110
    for (let r = 100; r > 30; r -= 4) {
        let color = (r > 60) ? 12 : 3
        for (let a = 0; a < 360; a += 15) {
            let px = sunX + Math.cos(a * Math.PI / 180) * r
            let py = sunY + Math.sin(a * Math.PI / 180) * r
            screen.setPixel(px + Math.randomRange(-3, 3), py + Math.randomRange(-3, 3), color)
        }
    }
    for (let i = 0; i < 8; i++) {
        let angle = i * 45
        let x2 = sunX + Math.cos(angle * Math.PI / 180) * 40
        let y2 = sunY + Math.sin(angle * Math.PI / 180) * 40
        screen.drawLine(sunX, sunY, x2, y2, 4)
    }
    for (let i = 0; i < 12; i++) {
        let angle = i * 30
        let vx = sunX + Math.cos(angle * Math.PI / 180) * 20
        let vy = sunY + Math.sin(angle * Math.PI / 180) * 20
        screen.drawLine(sunX, sunY, vx, vy, 5)
    }
    screen.fillCircle(sunX, sunY, 10, 1)

    let hillColor = 15
    let hillPos = (scene.cameraLeft() * 0.2) % 160
    screen.fillCircle(80 - hillPos, 145, 60, 12)
    screen.fillCircle(80 - hillPos, 150, 60, hillColor)

    // --- HUD (DISPLAY LEVEL AND CURRENT SCORE ONLY) ---
    screen.fillRect(0, 0, 160, 16, 15)
    screen.drawLine(0, 16, 160, 16, 1)
    screen.print("LVL: " + (currentStage + 1), 5, 4, 1)
    screen.print("SCORE: " + totalScore, 85, 4, 5)
})

player.setPosition(-50, -50)
