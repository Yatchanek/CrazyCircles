const gameWindow = document.getElementById('game')
const ctx = gameWindow.getContext('2d')
const PI = Math.PI
const TAU = 2 * PI
const circles = []
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

gameWindow.width = window.innerWidth
gameWindow.height = window.innerHeight


class Circle {
    constructor() {
        this.spawn()
        this.weight = random(screenMin * 0.01, screenMin * 0.02)
        this.shrinkSpeed = random(70, 120)
        this.color1 = `rgb(${random(25, 255)}, ${random(25, 255)}, ${random(25, 255)})`
        this.color2 = `rgb(${random(25, 255)}, ${random(25, 255)}, ${random(25, 255)})`
        this.color3 = `rgb(${random(25, 255)}, ${random(25, 255)}, ${random(25, 255)})`
        this.color4 = `rgb(${random(25, 255)}, ${random(25, 255)}, ${random(25, 255)})`
        this.direction = Math.random() < 0.5 ? 1 : - 1
    }

    spawn() {
        let buff = screenMin * 0.2
        this.radius = random(screenMin * 0.15, buff)
        this.x = random(buff, screenWidth - buff)
        this.y = random(buff, screenHeight - buff)
        for (let i = 0; i < circles.length;i++) {
            if ((this.x - circles[i].x) * (this.x - circles[i].x) + (this.y - circles[i].y) * (this.y - circles[i].y) <
            (this.radius + circles[i].radius) * (this.radius + circles[i].radius)) {
                this.spawn()
                break
            }
        }
        this.firstRadius = this.radius
    }   

    draw() {
        ctx.save()
        ctx.lineWidth = this.weight
        ctx.strokeStyle = this.color1
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.radius, 0 + this.direction * frameCount / 5, PI / 2 + this.direction * frameCount / 5)
        ctx.stroke()
        ctx.beginPath()
        ctx.strokeStyle = this.color2
        ctx.arc(this.x, this.y, this.radius, PI / 2 + this.direction * frameCount / 5, PI + this.direction * frameCount / 5)
        ctx.stroke()
        ctx.beginPath()
        ctx.strokeStyle = this.color3
        ctx.arc(this.x, this.y, this.radius, PI + this.direction * frameCount / 5, PI * 1.5 + this.direction * frameCount / 5)
        ctx.stroke()
        ctx.beginPath()
        ctx.strokeStyle = this.color4
        ctx.arc(this.x, this.y, this.radius, PI * 1.5 + this.direction * frameCount / 5, TAU + this.direction * frameCount / 5)
        ctx.stroke()
        ctx.restore()
    }

    update(delta) {
        this.radius -= this.shrinkSpeed * delta
        if (this.radius < 0) {
            this.radius = 0
        }  
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
            circles.splice(circles.indexOf(circle), 1)
            let pen = circle.radius / circle.firstRadius
            score += Math.ceil(50 * pen)
            if (++circleCount % (10 * level) === 0) {
                level++
                circleCount = 0
                spawnFrequency -= 250
                if (spawnFrequency < 500) {
                    spawnFrequency = 400
                }
            }
        }
    }
}

function gameLoop(timestamp) {
    let delta = (timestamp - lastFrame) / 1000
    lastFrame = timestamp
    frameCount++
    cls()
    ctx.fillStyle = 'rgb(255, 255, 255)'
    ctx.font = `bold ${screenMin * 0.04}px Arial`
    ctx.fillText(`Score: ${score}`, 20, screenMin * 0.07)
    ctx.fillText(`Fails: ${fails}`, 20, screenMin * 0.14)
    ctx.fillText(`Level: ${level}`, 20, screenMin * 0.21)
    circles.forEach(c => {
        c.update(delta)
        if (c.radius === 0) {
            circles.splice(circles.indexOf(c), 1)
            fails++
        }
        c.draw()
    })

    if (timestamp - lastCircleSpawn > spawnFrequency && circles.length < 10) {
      
        let circle = new Circle()

        circles.push(circle)
        lastCircleSpawn = timestamp
    }


    window.requestAnimationFrame(gameLoop)
}

let circle = new Circle()
circles.push(circle)


window.requestAnimationFrame(gameLoop)

window.addEventListener('pointerdown', e => checkHit(e))
window.addEventListener('resize', () => {
    gameWindow.width = screenWidth = window.innerWidth
    gameWindow.height = screenHeight = window.innerHeight
    screenMin = Math.min(screenHeight, screenWidth)
})