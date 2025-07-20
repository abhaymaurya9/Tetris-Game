// Game constants
const BOARD_WIDTH = 13;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    '#000000', // Empty
    '#00ffff', // I piece (cyan)
    '#ffff00', // O piece (yellow)
    '#800080', // T piece (purple)
    '#00ff00', // S piece (green)
    '#ff0000', // Z piece (red)
    '#0000ff', // J piece (blue)
    '#ffa500'  // L piece (orange)
];

// Tetris pieces (tetrominos)
const PIECES = [
    // I piece
    [
        [[1,1,1,1]],
        [[1],[1],[1],[1]]
    ],
    // O piece
    [
        [[2,2],[2,2]]
    ],
    // T piece
    [
        [[3,3,3],[0,3,0]],
        [[0,3],[3,3],[0,3]],
        [[0,3,0],[3,3,3]],
        [[3,0],[3,3],[3,0]]
    ],
    // S piece
    [
        [[0,4,4],[4,4,0]],
        [[4,0],[4,4],[0,4]]
    ],
    // Z piece
    [
        [[5,5,0],[0,5,5]],
        [[0,5],[5,5],[5,0]]
    ],
    // J piece
    [
        [[6,0,0],[6,6,6]],
        [[0,6],[0,6],[6,6]],
        [[6,6,6],[0,0,6]],
        [[6,6],[6,0],[6,0]]
    ],
    // L piece
    [
        [[0,0,7],[7,7,7]],
        [[7,0],[7,0],[7,7]],
        [[7,7,7],[7,0,0]],
        [[7,7],[0,7],[0,7]]
    ]
];

// Game state
let canvas, ctx, nextCanvas, nextCtx;
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let lines = 0;
let level = 1;
let gameRunning = false;
let gameOver = false;
let paused = false;
let dropTimer = 0;
let dropInterval = 1000;
let lastTime = 0;

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    nextCanvas = document.getElementById('nextCanvas');
    nextCtx = nextCanvas.getContext('2d');

    // Initialize empty board
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        board[y] = [];
        for (let x = 0; x < BOARD_WIDTH; x++) {
            board[y][x] = 0;
        }
    }

    // Set up event listeners
    document.addEventListener('keydown', handleInput);
    
    // Start game
    spawnNewPiece();
    gameRunning = true;
    gameLoop();
}

// Create new piece
function createPiece() {
    const pieceIndex = Math.floor(Math.random() * PIECES.length);
    const rotationIndex = 0;
    return {
        type: pieceIndex,
        rotation: rotationIndex,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(PIECES[pieceIndex][rotationIndex][0].length / 2),
        y: 0,
        shape: PIECES[pieceIndex][rotationIndex]
    };
}

// Spawn new piece
function spawnNewPiece() {
    if (nextPiece === null) {
        nextPiece = createPiece();
    }
    currentPiece = nextPiece;
    nextPiece = createPiece();
    
    // Check if game over - piece can't be placed at starting position
    if (checkCollision(currentPiece, currentPiece.x, currentPiece.y)) {
        gameOver = true;
        gameRunning = false;
        showGameOver();
        return;
    }
}

// Check collision
function checkCollision(piece, newX, newY) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x] !== 0) {
                const boardX = newX + x;
                const boardY = newY + y;
                
                // Check boundaries
                if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
                    return true;
                }
                
                // Check collision with existing blocks (only if within board bounds)
                if (boardY >= 0 && board[boardY][boardX] !== 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Move piece
function movePiece(dx, dy) {
    if (!currentPiece || gameOver || paused) return false;
    
    const newX = currentPiece.x + dx;
    const newY = currentPiece.y + dy;
    
    if (!checkCollision(currentPiece, newX, newY)) {
        currentPiece.x = newX;
        currentPiece.y = newY;
        return true;
    }
    return false;
}

// Rotate piece
function rotatePiece() {
    if (!currentPiece || gameOver || paused) return;
    
    const rotations = PIECES[currentPiece.type];
    const nextRotation = (currentPiece.rotation + 1) % rotations.length;
    const rotatedShape = rotations[nextRotation];
    
    const tempPiece = {
        ...currentPiece,
        rotation: nextRotation,
        shape: rotatedShape
    };
    
    if (!checkCollision(tempPiece, currentPiece.x, currentPiece.y)) {
        currentPiece.rotation = nextRotation;
        currentPiece.shape = rotatedShape;
    }
}

// Lock piece to board
function lockPiece() {
    if (!currentPiece) return;
    
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x] !== 0) {
                const boardX = currentPiece.x + x;
                const boardY = currentPiece.y + y;
                
                // Only place blocks that are within the board
                if (boardX >= 0 && boardX < BOARD_WIDTH && boardY >= 0 && boardY < BOARD_HEIGHT) {
                    board[boardY][boardX] = currentPiece.shape[y][x];
                }
                
                // If any part of the piece is above the board, game over
                if (boardY < 0) {
                    gameOver = true;
                    gameRunning = false;
                    showGameOver();
                    return;
                }
            }
        }
    }
    
    clearLines();
    spawnNewPiece();
}

// Clear completed lines
function clearLines() {
    let linesCleared = 0;
    
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        let isLineFull = true;
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (board[y][x] === 0) {
                isLineFull = false;
                break;
            }
        }
        
        if (isLineFull) {
            // Remove the line
            board.splice(y, 1);
            // Add new empty line at top
            board.unshift(new Array(BOARD_WIDTH).fill(0));
            linesCleared++;
            y++; // Check the same line again
        }
    }
    
    if (linesCleared > 0) {
        lines += linesCleared;
        score += linesCleared * 100 * level;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(50, 1000 - (level - 1) * 50);
        updateDisplay();
    }
}

// Hard drop
function hardDrop() {
    if (!currentPiece || gameOver || paused) return;
    
    while (movePiece(0, 1)) {
        score += 2;
    }
    lockPiece();
    updateDisplay();
}

// Handle input
function handleInput(event) {
    if (gameOver) {
        if (event.key === 'r' || event.key === 'R') {
            restartGame();
        }
        return;
    }
    
    switch (event.key) {
        case 'ArrowLeft':
            movePiece(-1, 0);
            break;
        case 'ArrowRight':
            movePiece(1, 0);
            break;
        case 'ArrowDown':
            if (movePiece(0, 1)) {
                score += 1;
                updateDisplay();
            }
            break;
        case 'ArrowUp':
            rotatePiece();
            break;
        case ' ':
            event.preventDefault();
            hardDrop();
            break;
        case 'p':
        case 'P':
            paused = !paused;
            break;
        case 'r':
        case 'R':
            restartGame();
            break;
    }
}

// Update display
function updateDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('lines').textContent = lines;
    document.getElementById('level').textContent = level;
}

// Show game over screen
function showGameOver() {
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalLines').textContent = lines;
    document.getElementById('gameOverScreen').style.display = 'block';
}

// Restart game
function restartGame() {
    // Reset game state
    board = [];
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        board[y] = [];
        for (let x = 0; x < BOARD_WIDTH; x++) {
            board[y][x] = 0;
        }
    }
    
    // Reset all game variables
    currentPiece = null;
    nextPiece = null;
    score = 0;
    lines = 0;
    level = 1;
    gameOver = false;
    paused = false;
    dropTimer = 0;
    dropInterval = 1000;
    lastTime = performance.now();
    
    // Hide game over screen and update display
    document.getElementById('gameOverScreen').style.display = 'none';
    updateDisplay();
    
    // Start fresh game
    gameRunning = true;
    spawnNewPiece();
}

// Draw board
function drawBoard() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let x = 0; x <= BOARD_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE);
        ctx.stroke();
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(BOARD_WIDTH * BLOCK_SIZE, y * BLOCK_SIZE);
        ctx.stroke();
    }
    
    // Draw locked pieces
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (board[y][x] !== 0) {
                drawBlock(ctx, x * BLOCK_SIZE, y * BLOCK_SIZE, COLORS[board[y][x]]);
            }
        }
    }
}

// Draw current piece
function drawCurrentPiece() {
    if (!currentPiece) return;
    
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x] !== 0) {
                const blockX = (currentPiece.x + x) * BLOCK_SIZE;
                const blockY = (currentPiece.y + y) * BLOCK_SIZE;
                drawBlock(ctx, blockX, blockY, COLORS[currentPiece.shape[y][x]]);
            }
        }
    }
}

// Draw next piece
function drawNextPiece() {
    if (!nextPiece) return;
    
    nextCtx.fillStyle = '#000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    const shape = nextPiece.shape;
    const blockSize = 25;
    const offsetX = (nextCanvas.width - shape[0].length * blockSize) / 2;
    const offsetY = (nextCanvas.height - shape.length * blockSize) / 2;
    
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x] !== 0) {
                const blockX = offsetX + x * blockSize;
                const blockY = offsetY + y * blockSize;
                drawBlock(nextCtx, blockX, blockY, COLORS[shape[y][x]]);
            }
        }
    }
}

// Draw a block
function drawBlock(context, x, y, color) {
    context.fillStyle = color;
    context.fillRect(x + 1, y + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
    
    // Add highlight effect
    context.fillStyle = 'rgba(255, 255, 255, 0.3)';
    context.fillRect(x + 1, y + 1, BLOCK_SIZE - 2, 3);
    context.fillRect(x + 1, y + 1, 3, BLOCK_SIZE - 2);
}

// Game loop
function gameLoop(currentTime = 0) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    if (gameRunning && !paused && !gameOver) {
        // Handle piece dropping
        dropTimer += deltaTime;
        if (dropTimer >= dropInterval) {
            if (!movePiece(0, 1)) {
                lockPiece();
            }
            dropTimer = 0;
        }
    }
    
    // Always draw the game state
    drawBoard();
    if (currentPiece && !gameOver) {
        drawCurrentPiece();
    }
    drawNextPiece();
    
    // Continue the game loop
    requestAnimationFrame(gameLoop);
}

// Start the game when page loads
window.addEventListener('load', init);
