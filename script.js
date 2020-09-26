const gameWindow = document.getElementById('game')
const ctx = gameWindow.getContext('2d')
const PI = Math.PI
const TAU = 2 * PI
let circles = []
let scoreBubbles = []
let screenWidth = window.innerWidth
let screenHeight = window.innerHeight
let lastFrame = 0
let lastCircleSpawn = 0
let pointerX, pointerY
let screenMin = Math.min(screenHeight, screenWidth)
let score = 0
let level = 1
let fails = 0
let circleCount = 0
let spawnFrequency = 2000
let frameCount = 0
let countdown = 3
let gameState = 'COUNTDOWN'

gameWindow.width = window.innerWidth
gameWindow.height = window.innerHeight

class ScoreBubble {
    constructor(x, y, value, colors, size) {
        this.x = x
        this.y = y
        this.value = value.toString()
        this.colors = colors
        this.lifetime = 0.5
        this.expired = false
        this.size = size / 2
        this.colorFrame = 0
    }

    update(delta) {
        this.lifetime -= delta
        if (this.lifetime < 0) {
            this.expired = true
        }
        this.size *= 1.01
        this.color = this.colors[this.colorFrame % this.colors.length]
        this.colorFrame++
    }

    draw() {
        ctx.save()
        ctx.font = `${this.size}px 'Impact'`
        ctx.fillStyle = this.color
        let w = ctx.measureText(this.value).width
        ctx.fillText(this.value, this.x - w / 2, this.y + this.size / 4)
        ctx.restore()
    }
}

class Circle {
    constructor() {
        this.radius = random(screenMin * 0.15, screenMin * 0.2)
        this.firstRadius = this.radius
        this.weight = random(screenMin * 0.01, screenMin * 0.025)
        this.pieces = random(5,15)
        this.colors = []
        for (let i = 0; i < this.pieces; i++) {
            this.colors.push(`rgb(${random(100, 255)}, ${random(10, 255)}, ${random(10, 255)})`)
        }
        this.direction = Math.random() < 0.5 ? 1 : - 1
        this.rotationSpeed = random(3, 12)
        this.vx = this.vy = 0
        this.shrinkSpeed = Math.min(this.radius, random(this.radius * 0.3 + 0.05 * level, this.radius * 0.4 + 0.05 * level))
        if (level > 4 && Math.random() < 0.1 + 0.05 * (level - 5)) {
            this.vx = random(screenMin * 0.15, screenMin * 0.25) * (Math.random() < 0.5 ? this.direction : -this.direction)
            this.vy = random(screenMin * 0.15, screenMin * 0.25) * (Math.random() < 0.5 ? this.direction : -this.direction)
        }
        this.dead = false
        this.spawn()
    }

    spawn() {
        let buff = screenMin * 0.2
        this.x = random(buff, screenWidth - buff)
        this.y = random(buff, screenHeight - buff)
        for (let i = 0; i < circles.length;i++) {
            if ((this.x - circles[i].x) * (this.x - circles[i].x) + (this.y - circles[i].y) * (this.y - circles[i].y) <
            (this.radius + circles[i].radius) * (this.radius + circles[i].radius)) {
                this.spawn()
                break
            }
        }
    }   

    draw() {
        ctx.save()
        ctx.lineWidth = this.weight
        for (let i = 0; i < this.pieces; i++) {
            ctx.strokeStyle = this.colors[i]
            ctx.beginPath()
            ctx.arc(this.x, this.y, this.radius, i * TAU / this.pieces + this.direction * frameCount / this.rotationSpeed, (i + 1) * TAU / this.pieces + + this.direction * frameCount / this.rotationSpeed,)
            ctx.stroke()
        }
        ctx.restore()
    }

    update(delta) {
        this.radius -= this.shrinkSpeed * delta
        if (this.radius < 0) {
            this.radius = 0
            this.dead = true
        }
        this.x += this.vx * delta
        this.y += this.vy * delta
        if (this.x < this.radius || this.x > screenWidth - this.radius) {
            this.vx *= -1
        }  
        if (this.y < this.radius || this.y > screenHeight - this.radius) {
            this.vy *= -1
        }
        this.weight *= (1 + 0.025 * Math.sin(frameCount / 10))
    }
}

function cls() {
    ctx.save()
    ctx.fillStyle = 'rgb(0,0,0)'
    ctx.fillRect(0, 0, screenWidth, screenHeight)
    ctx.restore()
}

function random(r1, r2) {
    if (!r2 || r1 === r2) {
        return Math.floor(Math.random() * r1)
    }
    else {
        let min = Math.min(r1, r2)
        let max = Math.max(r1, r2)
        return Math.floor(min + Math.random() * (max - min))
    }
}

function checkHit(e) {
    for (circle of circles) {
        if((e.pageX - circle.x) * (e.pageX - circle.x) + (e.pageY - circle.y) * (e.pageY - circle.y) < 
            circle.radius * circle.radius) {
            circle.dead = true
            let pen = circle.radius / circle.firstRadius
            score += Math.ceil(50 * pen)
            if (++circleCount % (10 * level) === 0) {
                level++
                circleCount = 0
                spawnFrequency -= 250
                if (spawnFrequency < 250) {
                    spawnFrequency = 250
                }
            }

            let sb = new ScoreBubble(circle.x, circle.y, Math.ceil(50 * pen), circle.colors, circle.radius)
            scoreBubbles.push(sb)
        }
    }
}

function gameLoop(timestamp) {
    let delta = (timestamp - lastFrame) / 1000
    lastFrame = timestamp
    frameCount++
    cls()
    if (gameState === 'COUNTDOWN') {
        ctx.fillStyle = 'rgb(255, 255, 255)'
        ctx.font = `${screenMin * 0.2}px 'Impact'`
        let c = Math.ceil(countdown)
        let w = ctx.measureText(c).width
        ctx.fillText(c, screenWidth / 2 - w, screenHeight / 2)
        countdown -=delta
        if (countdown <= 0) {
            gameState = 'PLAY'
            let circle = new Circle()
            circles.push(circle)
            lastCircleSpawn = timestamp
        }
    }
    if (gameState === 'PLAY') {
        ctx.fillStyle = 'rgb(255, 255, 255)'
        ctx.font = `${screenMin * 0.04}px 'Impact'`
        ctx.fillText(`Score: ${score}`, 20, screenMin * 0.07)
        ctx.fillText(`Fails: ${fails}`, 20, screenMin * 0.14)
        ctx.fillText(`Level: ${level}`, 20, screenMin * 0.21)
    
        circles = circles.filter(circle => circle.dead === false)
        circles.forEach(c => {
            c.update(delta)
            if (c.radius === 0) {
                circles.splice(circles.indexOf(c), 1)
                fails++
            }
            c.draw()
        })
    
        scoreBubbles = scoreBubbles.filter(sb => sb.expired === false)
        scoreBubbles.forEach( sb => {
            sb.update(delta)
            sb.draw()
        })
    
    
        if (timestamp - lastCircleSpawn > spawnFrequency && circles.length < 7) {      
            let circle = new Circle()
            circles.push(circle)
            lastCircleSpawn = timestamp
        }    
    }
   
    window.requestAnimationFrame(gameLoop)
}




window.requestAnimationFrame(gameLoop)

window.addEventListener('pointerdown', e => checkHit(e))
window.addEventListener('resize', () => {
    gameWindow.width = screenWidth = window.innerWidth
    gameWindow.height = screenHeight = window.innerHeight
    screenMin = Math.min(screenHeight, screenWidth)
})
