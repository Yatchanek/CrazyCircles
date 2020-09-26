const gameWindow = document.getElementById('game')
const ctx = gameWindow.getContext('2d')
const PI = Math.PI
const TAU = 2 * PI
let entities = []
let scoreBubbles = []
let screenWidth = window.innerWidth
let screenHeight = window.innerHeight
let lastFrame = 0
let lastEntitySpawn = 0
let pointerX, pointerY
let screenMin = Math.min(screenHeight, screenWidth)
let score = highScore = 0
let level = 1
let fails = 0
let missedCircles = 0
let circleCount = 0
let spawnFrequency = 2000
let frameCount = 0
let countdown = 3
let nextState = gameState = 'COUNTDOWN'

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
        ctx.font = `${this.size}px 'Bernard MT Condensed', Impact`
        ctx.fillStyle = this.color
        ctx.textBaseline = 'middle'
        let w = ctx.measureText(this.value).width
        ctx.fillText(this.value, this.x - w / 2, this.y)
        ctx.restore()
    }
}


class Circle {
    constructor(x, y, type = 'circle') {
        this.x = x
        this.y = y
        this.radius = random(screenMin * 0.15, screenMin * 0.2)
        this.initialRadius = this.radius
        this.weight = random(screenMin * 0.01, screenMin * 0.025)
        
        this.direction = Math.random() < 0.5 ? 1 : - 1
        this.rotationSpeed = random(3, 12)
        this.vx = this.vy = 0
        this.shrinkSpeed = Math.min(this.radius, random(this.radius * 0.3 + 0.05 * level, this.radius * 0.4 + 0.05 * level))
        
        if (level > 4 && Math.random() < 0.1 + 0.05 * (level - 5)) {
            this.vx = random(screenMin * 0.15, screenMin * 0.25) * (Math.random() < 0.5 ? this.direction : -this.direction)
            this.vy = random(screenMin * 0.15, screenMin * 0.25) * (Math.random() < 0.5 ? this.direction : -this.direction)
        }
        
        this.dead = false

        this.pieces = random(5,15)
        this.colors = []
        for (let i = 0; i < this.pieces; i++) {
            this.colors.push(`rgb(${random(100, 255)}, ${random(10, 255)}, ${random(10, 255)})`)
        }
        this.type = type
        if (this.type === 'bonus') {
            this.shrinkSpeed *= 2
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
        if (this.type === 'bonus') {
            ctx.beginPath()
            ctx.arc(this.x, this.y, this.radius, 0, TAU)
            ctx.fillStyle = `rgba(${200 + 55 * Math.sin(frameCount / 10)}, 0, 0, ${0.7 + 0.3 * Math.sin(frameCount / 10)})`
            ctx.fill()
        }

        ctx.restore()
    }

    update(delta) {
        this.radius -= this.shrinkSpeed * delta
        if (this.radius < 0) {
            this.radius = 0
            this.dead = true
            if (this.type === 'circle') {
                missedCircles++
                score -= 50
                let sb = new ScoreBubble(this.x, this.y, -50, this.colors, this.initialRadius * 0.8)
                scoreBubbles.push(sb)
            }
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



class Polygon extends Circle {
    constructor(x, y) {
        super(x, y)
        this.weight = random(screenMin * 0.005, screenMin * 0.015)
        this.rotationSpeed = random(7,15)
        this.pieces = random(4 + Math.floor(level / 4), 6 + Math.floor(level / 2))
        this.colors = []
        for (let i = 0; i < this.pieces; i++) {
            this.colors.push(`rgb(${random(100, 255)}, ${random(10, 255)}, ${random(10, 255)})`)
        }
        this.type = 'polygon'
    }

    update(delta) {
        super.update(delta)
    }

    draw() {
        ctx.save()
        ctx.lineWidth = this.weight
        ctx.beginPath()
        for (let i = 0; i < this.pieces; i++) {
            ctx.strokeStyle = this.colors[i]
            ctx.moveTo(this.x + this.radius * Math.cos(i * TAU / this.pieces + this.direction * frameCount / this.rotationSpeed), this.y + this.radius * Math.sin(i * TAU / this.pieces + this.direction * frameCount / this.rotationSpeed) )
            ctx.lineTo(this.x + this.radius * Math.cos((i + 1) * TAU / this.pieces + this.direction * frameCount / this.rotationSpeed), this.y + this.radius * Math.sin((i + 1) * TAU / this.pieces + this.direction * frameCount / this.rotationSpeed))           
        }
        ctx.stroke()
        ctx.restore()
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

    if (gameState === 'GAMEOVER') {
        nextState = 'COUNTDOWN'
        spawnEntity(false)
        lastEntitySpawn = performance.now()

    }

    else {
        for (entity of entities) {
            if((e.pageX - entity.x) * (e.pageX - entity.x) + (e.pageY - entity.y) * (e.pageY - entity.y) < 
                entity.radius * entity.radius) {
                entity.dead = true
                let points = Math.ceil(50 * entity.radius / entity.initialRadius)
                if (entity.type === 'circle') {
                    score += points
                    if (++circleCount % (10 * level) === 0) {
                        level++
                        circleCount = 0
                        spawnFrequency *= (0.9 - 0.02 * (level - 2))
                        if (spawnFrequency < 350) {
                            spawnFrequency = 350
                        }
                    }
                } else if (entity.type === 'bonus') {
                    points *= 1.5
                    let which = Math.random()
                    if (which < 0.5) {
                        fails > 0 ? fails-- : missedCircles--
                    } else {
                        missedCircles > 0 ? missedCircles-- : fails--
                    }

                } else {
                    points *= -3
                    score += points
                    fails++
                }
    
                let sb = new ScoreBubble(entity.x, entity.y, points, entity.colors, entity.radius)
                scoreBubbles.push(sb)
                break
            }
        }
    }   

}

function spawnEntity(allowPolygon) {
    let buff = screenMin * 0.2
    let entity, type
    if (allowPolygon) {
        type = Math.random() > 0.04 + 0.015 * level ? 'circle' : 'polygon'
    }
    else type = 'circle'
    
    if ((missedCircles > 0 || fails > 0) && Math.random() < 0.02) {
        type = 'bonus'
    } 

    let canPlace = true
    do {
        let x = random(buff, screenWidth - buff)
        let y = random(buff, screenHeight - buff)
        type === 'circle' || type === 'bonus' ? entity = new Circle(x, y, type) : entity = new Polygon(x, y)
        for (let i = 0; i < entities.length; i++) {
            if ((entity.x - entities[i].x) * (entity.x - entities[i].x) + (entity.y - entities[i].y) * (entity.y - entities[i].y) <
            (entity.radius + entities[i].radius) * (entity.radius + entities[i].radius)) {
                canPlace = false
                break
            }
            canPlace = true
        }
        
    } while(canPlace === false)
    
    entities.push(entity)
}

function gameLoop(timestamp) {
    let delta = (timestamp - lastFrame) / 1000
    lastFrame = timestamp
    frameCount++
    cls()

    if (gameState === 'GAMEOVER') {
        entities = []
        scoreBubbles = []
        if (score > highScore) {
            highScore = score
            localStorage.setItem('CrazyCirclesHighScore', highScore)
        }
        score = 0
        fails = 0
        missedCircles = 0
        spawnFrequency = 2000
        countdown = 3

        ctx.fillStyle = 'rgb(255, 255, 255)'
        ctx.font = `${screenMin * 0.2}pt 'Bernard MT Condensed', Impact`
        ctx.textBaseline = 'middle'

        let txt = 'GAME OVER'
        let fraction = 0.25
        let w
        do {
            ctx.font = `${screenMin * fraction}pt 'Bernard MT Condensed', Impact`
            w = ctx.measureText(txt).width
            fraction *= 0.9
        } while (w > screenMin * 0.9)

        ctx.fillText(txt, (screenWidth - w) / 2, screenHeight / 2)
    }

    if (gameState === 'COUNTDOWN') {
        ctx.fillStyle = 'rgb(255, 255, 255)'
        ctx.font = `${screenMin * 0.2}pt 'Bernard MT Condensed', Impact`
        ctx.textBaseline = 'middle'
        let txt = Math.ceil(countdown)
        let w = ctx.measureText(txt).width
        ctx.fillText(txt, (screenWidth - w) / 2, screenHeight / 2)
        ctx.font = `${screenMin * 0.05}pt 'Bernard MT Condensed', Impact`
        txt = 'Circles are good, polygons are bad!'
        w = ctx.measureText(txt).width
        ctx.fillText(txt, (screenWidth - w) / 2, screenHeight * 0.8)
        countdown -=delta
        if (countdown <= 0) {
            nextState = 'PLAY'
            spawnEntity(false)
            lastEntitySpawn = timestamp
            }
    }
    if (gameState === 'PLAY') {
        ctx.fillStyle = 'rgb(255, 255, 255)'
        ctx.font = `${screenMin * 0.04}px 'Bernard MT Condensed', Impact`
        ctx.fillText(`High Score: ${highScore}`, 20, screenMin * 0.03)
        ctx.fillText(`Score: ${score}`, 20, screenMin * 0.085)
        ctx.fillStyle = `rgb(255, ${255 - 85 * fails}, ${255 - 85 * fails})`
        ctx.fillText(`Fails: ${fails}`, 20, screenMin * 0.145)
        ctx.fillStyle = `rgb(255, ${255 - 25 * missedCircles}, ${255 - 25 * missedCircles})`
        ctx.fillText(`Missed: ${missedCircles}`, 20, screenMin * 0.2)
        ctx.fillStyle = 'rgb(255, 255, 255)'
        ctx.fillText(`Level: ${level}`, 20, screenMin * 0.255)
    
        entities = entities.filter(entity => entity.dead === false)
        entities.forEach(c => {
            c.update(delta)
            c.draw()
        })
    
        scoreBubbles = scoreBubbles.filter(sb => sb.expired === false)
        scoreBubbles.forEach( sb => {
            sb.update(delta)
            sb.draw()
        })
        
        if (fails > 3 || missedCircles > 10) {
            nextState = 'GAMEOVER'
        }
    
        if (timestamp - lastEntitySpawn > spawnFrequency && entities.length < 7) {      
            spawnEntity(true)
            lastEntitySpawn = timestamp
        }    
    }
    gameState = nextState
    window.requestAnimationFrame(gameLoop)
}

//Main Program :)
if (localStorage.hasOwnProperty('CrazyCirclesHighScore')) {
    highScore = localStorage.getItem('CrazyCirclesHighScore')
}

window.requestAnimationFrame(gameLoop)

window.addEventListener('pointerdown', e => checkHit(e))
window.addEventListener('resize', () => {
    gameWindow.width = screenWidth = window.innerWidth
    gameWindow.height = screenHeight = window.innerHeight
    screenMin = Math.min(screenHeight, screenWidth)
})
// audioElement.addEventListener('ended', () => {
//     audioElement.play()
// })