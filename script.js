const gameWindow = document.getElementById('game')
const ctx = gameWindow.getContext('2d')
const PI = Math.PI
const TAU = 2 * PI
const titleText = 'CRAZY CIRCLES'
const startText = 'START GAME'
const tips = [
    'Tip: Catch circles quickly to earn combos!',
    'Tip: RED bonus circles reduce your fails.',
    'Tip: GREEN bonus circles reduce your misses.',
    "Tip: Bonus circles appear only when you've messed up.",
    'Tip: You can hit a polygon up to 3 times.',
    'Tip: You can miss a circle up to 10 times.',
    "Tip: Missed bonus circles don't count as misses!",
    'Tip: You get negative points for catching a polygon!',
]
const music = []
const muteIcon = new Image()
muteIcon.src = 'assets/mute.png'
const speakerIcon = new Image()
speakerIcon.src = 'assets/speaker.png'
let shapes = []
let scoreBubbles = []
let explosions = []
let screenWidth = window.innerWidth
let screenHeight = window.innerHeight
let screenMin = Math.min(screenHeight, screenWidth)
let lastFrame = 0
let lastShapeSpawn = 0
let currentTip = ''
let score = highScore = 0
let level = 1
let fails = 0
let combo = 0
let maxCombo = 0
let missedCircles = 0
let circleCount = 0
let spawnFrequency = 1500
let polygonFrequency = 0.04
let frameCount = 0
let countdown = 3
let nextState = gameState = 'TITLESCREEN'
let titleTextSize = startTextSize = 0
let titleTextWidth = startTextWidth = 0
let muted = false
let track = 0

gameWindow.width = window.innerWidth
gameWindow.height = window.innerHeight

//Shows score after a circle or polygon is destroyed
class ScoreBubble {
    constructor(x, y, value, colors, size, combo) {
        this.x = x
        this.y = y
        this.value = value.toString()
        this.colors = colors
        this.lifetime = 0.5
        this.expired = false
        this.size = size / 2
        this.colorFrame = 0
        this.combo = combo
    }

    update(delta) {
        this.lifetime -= delta
        if (this.lifetime < 0) {
            this.expired = true
        }
        this.size *= 1.01
        this.color = this.colors[this.colorFrame % this.colors.length]
        if (frameCount % 5 === 0) this.colorFrame++
    }

    draw() {
        ctx.save()
        ctx.font = `${this.size}px 'Bernard MT Condensed', Impact`
        ctx.fillStyle = this.color
        ctx.textBaseline = 'middle'
        let w = ctx.measureText(this.value).width
        ctx.fillText(this.value, this.x - w / 2, this.y)
        if (this.combo) {
            ctx.font = `${this.size / 3}px 'Bernard MT Condensed', Impact`
            w = ctx.measureText('Combo!').width
            ctx.fillText('Combo!', this.x - w /2, this.y + this.size * 0.6)
        }
        ctx.restore()
    }
}


//The main class with 3 variants - circle, bonus circle and polygon
class Shape {
    constructor(x, y, type) {
        this.x = x
        this.y = y
        this.type = type
        this.radius = random(screenMin * 0.15, screenMin * 0.2)
        this.initialRadius = this.radius
        this.direction = Math.random() < 0.5 ? 1 : - 1
        this.vx = this.vy = 0
        this.shrinkSpeed = Math.min(this.radius, random(this.radius * 0.3 + 0.05 * level, this.radius * 0.4 + 0.05 * level))
        this.lifetime = 1
        this.colorTweak = 0

        //Chance to become a moving shape from level 5
        if (level > 4 && Math.random() < 0.1 + 0.05 * (level - 5)) {
            this.vx = random(screenMin * 0.15, screenMin * 0.2 + 0.015 * level) * (Math.random() < 0.5 ? this.direction : -this.direction)
            this.vy = random(screenMin * 0.15, screenMin * 0.2 + 0.015 * level) * (Math.random() < 0.5 ? this.direction : -this.direction)
        }
        
        //Dead - clicked and no longer clickabe; Expired - finished animation and redy to be deleted
        this.dead = false
        this.expired = false

        if (this.type === 'circle' || this.type === 'bonus') {
            this.pieces = random(6,15)
            this.weight = random(screenMin * 0.01, screenMin * 0.025)
            this.rotationSpeed = random(6, 12)
        }
        else {
            this.pieces = random(4 + Math.floor(level / 4), 6 + Math.floor(level / 2))
            this.weight = random(screenMin * 0.005, screenMin * 0.015)
            this.rotationSpeed = random(8, 17)
        }
        
        //Give every shape some random colors
        this.colors = []
        for (let i = 0; i < this.pieces; i++) {
            this.colors.push(`rgb(${random(100, 255)}, ${random(10, 255)}, ${random(10, 255)})`)
           }

        if (this.type === 'bonus') {
            this.shrinkSpeed *= 2.5
        }
    }

    draw() {
        //Drawing each part of circle/polygon with different color
        //Using this.lifetime variable for animation when clicked
        ctx.save()
        let ratio = this.radius / this.initialRadius
        if (ratio > 0.8) {
            ctx.lineWidth = this.weight * (1 + (10 * ratio - 8))    
        } 
        else {
            ctx.lineWidth = this.weight
        }

        switch(this.type) {
            case 'circle':
            case 'bonus-red':
            case 'bonus-green':             
                for (let i = 0; i < this.pieces; i++) {
                    ctx.strokeStyle = this.colors[i]
                    ctx.beginPath()
                    ctx.arc(this.x, this.y, this.radius, i * TAU / this.pieces + this.direction * frameCount / this.rotationSpeed, 
                            (i + this.lifetime) * TAU / this.pieces + this.direction * frameCount / this.rotationSpeed)                  
                    ctx.stroke()
                       
                    if(this.type === 'bonus-red' || this.type === 'bonus-green') {
                        ctx.beginPath()
                        ctx.arc(this.x, this.y, this.radius, 0, TAU)
                        ctx.fillStyle = this.type === 'bonus-red' ? `rgba(${255 * this.lifetime}, 0, 0, ${this.lifetime})` 
                                        : `rgba(0, ${255 * this.lifetime}, 0, ${this.lifetime})`
                        ctx.fill()  
                    }
                
            } 
            break

            case 'polygon':
                    for (let i = 0; i < this.pieces; i++) {
                        ctx.beginPath()
                        ctx.strokeStyle = this.colors[i]
                        ctx.moveTo(this.x + this.radius * Math.cos(i * TAU / this.pieces + this.direction * frameCount / this.rotationSpeed), this.y + this.radius * Math.sin(i * TAU / this.pieces + this.direction * frameCount / this.rotationSpeed) )
                        ctx.lineTo(this.x + this.radius * Math.cos((i + this.lifetime) * TAU / this.pieces + this.direction * frameCount / this.rotationSpeed), this.y + this.radius * Math.sin((i + this.lifetime) * TAU / this.pieces + this.direction * frameCount / this.rotationSpeed))           
                        ctx.stroke()
                    }
            break
        }
        
        ctx.restore()
    }

    update(delta) {
        //When clicked -> dead, start countdown to expiry
        if (this.dead) {
            this.lifetime -= 2 * delta
            if(this.lifetime <= 0) {
                this.lifetime = 0
                this.expired = true
                
            }
        } else {
            //Otherwise, continue shrinking and expire if radius <= 0
            this.radius -= this.shrinkSpeed * delta

            if (this.radius < 0) {
                this.radius = 0
                this.dead = true
                this.expired = true
                if (gameState === 'PLAY' && this.type === 'circle') {
                    missedCircles++
                    combo = 0
                    score -= 50
                    let sb = new ScoreBubble(this.x, this.y, -50, this.colors, this.initialRadius * 0.8)
                    scoreBubbles.push(sb)
                }
            }
    
            //Move and bounce from edges
            this.x += this.vx * delta
            this.y += this.vy * delta
            if (this.x < this.radius || this.x > screenWidth - this.radius) {
                this.vx *= -1
            }  
            if (this.y < this.radius || this.y > screenHeight - this.radius) {
                this.vy *= -1
            }

            //Alternate line width a bit
            this.weight *= (1 + 0.02 * Math.sin(frameCount / 10))
        }       
    }
}


function setup() {
    //Load high scorer from local storage
    if (localStorage.hasOwnProperty('CrazyCirclesHighScore')) {
        highScore = localStorage.getItem('CrazyCirclesHighScore')
    }

    //Set width for text on title screen
    titleTextSize = screenWidth * 0.2
    ctx.font = `${titleTextSize}px 'Bernard MT Condensed', Impact`
    titleTextWidth = ctx.measureText(titleText).width
    while (titleTextWidth > screenWidth * 0.8) {
        titleTextSize *= 0.9
        ctx.font = `${titleTextSize}px 'Bernard MT Condensed', Impact`
        titleTextWidth = ctx.measureText(titleText).width  
    }   
   

    startTextSize = screenWidth * 0.1
    ctx.font = `${startTextSize}px 'Bernard MT Condensed', Impact`
    startTextWidth = ctx.measureText(startText).width
    while (startTextWidth > screenWidth * 0.5) {
        startTextSize *= 0.9
        ctx.font = `${startTextSize}px 'Bernard MT Condensed', Impact`
        startTextWidth = ctx.measureText(startText).width
    }

    for (let i = 0; i < 3; i++) {
        let clip = new Audio(`assets/${i}.mp3`)
        music.push(clip)
    }
}

function cls() {
    ctx.save()
    ctx.fillStyle = 'rgb(0,0,0)'
    ctx.fillRect(0, 0, screenWidth, screenHeight)
    ctx.restore()
}

//Generate random number from range
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

//Handle click events
function handleClick(e) {
    //On title screen, check if start button is clicked. If yes, clear the shapes spawned while on title screen.
    if (gameState === 'TITLESCREEN') {
        if(e.pageX > (screenWidth - startTextWidth) / 2 && e.pageX < (screenWidth + startTextWidth) / 2 
            && e.pageY > screenHeight * 0.8 - startTextSize / 2 && e.pageY < screenHeight * 0.8 + startTextSize / 2) {
                nextState = 'COUNTDOWN'
                shapes = []
                currentTip = tips[random(tips.length)]
            }      
    }

    //On Game Over screen, click to proceed to title screen
    else if (gameState === 'GAMEOVER') {
        nextState = 'TITLESCREEN'
    }

    else {
        for (shape of shapes) {
            //Check if a non-dead shape is clicked
            if((!shape.dead && (e.pageX - shape.x) * (e.pageX - shape.x) + (e.pageY - shape.y) * (e.pageY - shape.y) < 
                shape.radius * shape.radius)) {
                shape.dead = true
                let ratio = shape.radius / shape.initialRadius                               

                let points = Math.ceil(50 * ratio)  

                if (shape.type === 'circle') {  
                    if (ratio > 0.8) {
                        combo++
                        if (combo > maxCombo) {
                            maxCombo = combo
                        }
                    } else {
                        combo = 0
                    }
                    points *= 1 + combo * 0.05
                    
                    if (++circleCount % (10 * level) === 0) {
                        level++
                        circleCount = 0
                        spawnFrequency *= (0.9 - 0.02 * (level - 2))
                        if (spawnFrequency < 350) {
                            spawnFrequency = 350
                        }
                        polygonFrequency += 0.015
                        if (polygonFrequency > 0.2) {
                            polygonFrequency = 0.2
                        }
                    }

                } else if (shape.type === 'bonus-green') { //Bonus circle will reduce your fail count or missed count
                    points *= 1.5 + combo * 0.05
                    missedCircles--
                    
                } else if (shape.type === 'bonus-red') {
                    points *=1.5 + combo * 0.05
                    fails--

                } else {
                    //Negative points for clicking a polygon
                    points *= -3 + combo * 0.05
                    
                    fails++
                    combo = 0
                }

                points = Math.ceil(points)
                score += points

                if (points >= 100 || points <= -100) {
                    points += '!'
                }

                //Spawn a score bubble
                let sb = new ScoreBubble(shape.x, shape.y, points, shape.colors, shape.radius, combo)
                scoreBubbles.push(sb)
                break
            }
        }

        //Clicked mute/unmute button
        if (e.pageX >= screenHeight * 0.02 && e.pageX <= screenHeight * 0.045 && e.pageY >= screenHeight * 0.95 && e.pageY <= screenHeight * 0.975 ) {
            if (muted) {
                music[track].play()
                muted = false
            }
            else {
                music[track].pause()
                muted = true
            }
        }
    }   
}

function spawnShape(allowPolygon) {
    let type
    if (allowPolygon) {
        type = Math.random() > polygonFrequency ? 'circle' : 'polygon'
    }
    else type = 'circle'
    
    if ((missedCircles > 0 || fails > 0) && Math.random() < 0.02) {
        if (fails === 0 && missedCircles > 0) {
            type = 'bonus-green'
        }
        else if (missedCircles === 0 && fails > 0) {
            type = 'bonus-red'
        }
        else {
            Math.random() < 0.5 ? type = 'bonus-green' : type = 'bonus-red'
        }
    } 

    //A routine to ensure that new shape is not placed intersecting with another one
    let canPlace = true
    let buff = screenMin * 0.2
    let x = random(buff, screenWidth - buff)
    let y = random(buff, screenHeight - buff)
    let shape = new Shape(x, y, type)
    do {
        for (let i = 0; i < shapes.length; i++) {
            if ((shape.x - shapes[i].x) * (shape.x - shapes[i].x) + (shape.y - shapes[i].y) * (shape.y - shapes[i].y) <
            (shape.radius + shapes[i].radius) * (shape.radius + shapes[i].radius)) {
                canPlace = false
                shape.x = random(buff, screenWidth - buff)
                shape.y = random(buff, screenHeight - buff)
                break
            }
            canPlace = true
        }
        
    } while(canPlace === false)
    
    shapes.push(shape)
}

function gameLoop(timestamp) {
    let delta = (timestamp - lastFrame) / 1000
    lastFrame = timestamp
    frameCount++ //Framecount variable used in animations
    cls()

    if (gameState === 'TITLESCREEN') {
        //Spawn some circles for decoration
        if (timestamp - lastShapeSpawn > spawnFrequency && shapes.length < 7) {    
            spawnShape(false)
            lastShapeSpawn = timestamp
        }   
        
        //Remove expired ones, update and draw
        shapes = shapes.filter(shape => shape.dead === false)
        shapes.forEach(c => {
            c.update(delta)
            c.draw()
        })

        //Title and start game button
        ctx.font = `${titleTextSize}px 'Bernard MT Condensed', Impact`
        let w = ctx.measureText(titleText).width
        ctx.textBaseline = 'middle'
        ctx.fillStyle = `rgb(${155 + 100 * Math.sin(frameCount / 60)}, ${155 + 100 * Math.cos(frameCount / 50)}, ${155 + 100 * Math.sin(frameCount / 70)})`
        ctx.fillText(titleText, (screenWidth - titleTextWidth) / 2 + screenMin * 0.05 * Math.cos(frameCount / 90), screenHeight * 0.2 + screenMin * 0.05 * Math.sin(frameCount / 90))
        ctx.fillStyle = `rgb(255, 255, 255)`
        ctx.font = `${startTextSize}px 'Bernard MT Condensed', Impact`
        ctx.fillText(startText, (screenWidth - startTextWidth) / 2, screenHeight * 0.8)

    }

    if (gameState === 'GAMEOVER') {
        //Update high score
        if (score > highScore) {
            highScore = score
            localStorage.setItem('CrazyCirclesHighScore', highScore)
        }

        //Reset counters and shapes
        shapes = []
        scoreBubbles = []
        score = 0
        fails = 0
        missedCircles = 0
        spawnFrequency = 2000
        countdown = 3
        level = 1

        ctx.fillStyle = 'rgb(255, 255, 255)'
        ctx.font = `${screenMin * 0.2}pt 'Bernard MT Condensed', Impact`
        ctx.textBaseline = 'middle'

        let txt = 'GAME OVER'
        let fraction = 0.25
        let w
        ctx.font = `${screenMin * fraction}pt 'Bernard MT Condensed', Impact`
        w = ctx.measureText(txt).width
        while (w > screenMin * 0.9) {
            fraction *= 0.9
            ctx.font = `${screenMin * fraction}pt 'Bernard MT Condensed', Impact`
            w = ctx.measureText(txt).width   
        } 

        ctx.fillText(txt, (screenWidth - w) / 2, screenHeight / 2)
    }

    if (gameState === 'COUNTDOWN') {
        //Countdown to play
        ctx.fillStyle = 'rgb(255, 255, 255)'
        ctx.font = `${screenMin * 0.25}pt 'Bernard MT Condensed', Impact`
        ctx.textBaseline = 'middle'
        let txt = Math.ceil(countdown)
        let w = ctx.measureText(txt).width
        ctx.fillText(txt, (screenWidth - w) / 2, screenHeight / 2)

        ctx.font = `${screenMin * 0.05}pt 'Bernard MT Condensed', Impact`
        txt = 'Circles are good, polygons are bad!'
        w = ctx.measureText(txt).width
        ctx.fillText(txt, (screenWidth - w) / 2, screenHeight * 0.8)

        fraction = 0.025
        ctx.font = `${screenMin * fraction}pt 'Bernard MT Condensed', Impact`
        w = ctx.measureText(currentTip).width
        while (w > screenWidth * 0.8) {
            fraction *= 0.9
            ctx.font = `${screenMin * fraction}pt 'Bernard MT Condensed', Impact`
            w = ctx.measureText(currentTip).width
        }

        ctx.fillText(currentTip, (screenWidth - w) / 2, screenHeight * 0.95)

        countdown -=delta
        if (countdown <= 0) {
            nextState = 'PLAY'
            spawnFrequency = 2000
            spawnShape(false)
            lastShapeSpawn = timestamp
            if (!muted) {
                music[track].play()
            }
        }
    }

    if (gameState === 'PLAY') {
        ctx.fillStyle = 'rgb(255, 255, 255)'
        ctx.font = `${screenMin * 0.04}px 'Bernard MT Condensed', Impact`
        ctx.fillText(`High Score: ${highScore}`, screenWidth * 0.01, screenMin * 0.03)
        ctx.fillText(`Score: ${score}`, screenWidth * 0.01, screenMin * 0.085)
        ctx.fillStyle = `rgb(255, ${255 - 85 * fails}, ${255 - 85 * fails})`
        ctx.fillText(`Fails: ${fails}`, screenWidth * 0.01, screenMin * 0.145)
        ctx.fillStyle = `rgb(255, ${255 - 25 * missedCircles}, ${255 - 25 * missedCircles})`
        ctx.fillText(`Missed: ${missedCircles}`, screenWidth * 0.01, screenMin * 0.2)
        ctx.fillStyle = 'rgb(255, 255, 255)'
        ctx.fillText(`Combo: ${combo}`, screenWidth * 0.01, screenMin * 0.255)
        ctx.fillText(`Max combo: ${maxCombo}`, screenWidth * 0.01, screenMin * 0.31)
        ctx.fillText(`Level: ${level}`, screenWidth * 0.01, screenMin * 0.365)

        let icon = muted ? muteIcon : speakerIcon
        ctx.drawImage(icon, screenHeight * 0.02, screenHeight * 0.95, screenHeight * 0.025, screenHeight * 0.025)


        //Filter out expired shapes, update and draw
        shapes = shapes.filter(shape => shape.expired === false)
        shapes.forEach(c => {
            c.update(delta)
            c.draw()
        })

        //Same for score bubbles
        scoreBubbles = scoreBubbles.filter(sb => sb.expired === false)
        scoreBubbles.forEach( sb => {
            sb.update(delta)
            sb.draw()
        })
        
        if (fails > 3 || missedCircles > 10) {
            nextState = 'GAMEOVER'
            music.pause()
            music.currentTime = 0
        }
        
        //Spawn new shape after some time
        if (timestamp - lastShapeSpawn > spawnFrequency && shapes.length < 7) {      
            spawnShape(true)
            lastShapeSpawn = timestamp
        }    
    }

    gameState = nextState
    window.requestAnimationFrame(gameLoop)
}

//Main Program :)
setup()
window.requestAnimationFrame(gameLoop)

window.addEventListener('pointerdown', e => handleClick(e))
window.addEventListener('resize', () => {
    gameWindow.width = screenWidth = window.innerWidth
    gameWindow.height = screenHeight = window.innerHeight
    screenMin = Math.min(screenHeight, screenWidth)
})

music.forEach(m => m.addEventListener('ended', () => {
    track++
    music[track % music.length].play()
}))