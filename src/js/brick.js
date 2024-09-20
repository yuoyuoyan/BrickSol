// game board size
const ROW_SIZE = 14;
const COL_SIZE = 10;
const BRICK_TYPE = 35;
const board_example = [
    [ 1,  2,  3,  4,  5,  6,  7,  3,  8,  9],
    [10, 11, 12, 13,  5, 12, 14, 15, 16, 17],
    [ 1, 18, 14, 10,  1, 19, 20, 21, 22, 23],
    [ 2,  2,  1, 24, 20, 16, 24, 22,  6, 17],
    [25, 26,  6, 13,  5, 10, 11, 26, 18, 27],
    [ 4,  3, 13, 28, 28, 14, 29, 22, 25, 30],
    [21, 29, 31,  7,  6, 32, 16, 27, 19, 24],
    [26, 10,  6,  9,  6, 30, 22, 30, 32, 25],
    [18,  9, 29, 27, 20, 16, 12, 12, 33,  4],
    [ 4, 18, 23, 13, 14,  7, 24, 34, 23, 32],
    [20, 26, 23, 15, 17, 27,  9, 34,  3, 31],
    [ 8, 21, 25, 29, 35, 35, 19, 31,  8, 33],
    [36, 37, 37, 31, 32, 21,  2, 17, 15, 19],
    [36, 33, 15,  5, 33, 11, 11,  8,  7, 30]
];
var action_history = [];

// init brick types
let bricks = [];
for(let i=0; i < BRICK_TYPE; i++){
    bricks[i] = i+1;
}

// init game board
let board = [];
let index = 0;
for(let i = 0; i < ROW_SIZE; i++) {
    board[i] = [];
    for(let j = 0; j < COL_SIZE; j++) {
        board[i][j] = board_example[i][j];
        // board[i][j] = bricks[Math.floor(index/2)];
        // index = (index >= BRICK_TYPE*2-1) ? 0 : index+1;
    }
}

// randomly swap bricks in board
// for(let i = 0; i < ROW_SIZE*COL_SIZE*2; i++) {  // times to swap
//     let row1 = Math.floor(Math.random() * ROW_SIZE);
//     let col1 = Math.floor(Math.random() * COL_SIZE);
//     let row2 = Math.floor(Math.random() * ROW_SIZE);
//     let col2 = Math.floor(Math.random() * COL_SIZE);

//     let temp = board[row1][col1];
//     board[row1][col1] = board[row2][col2];
//     board[row2][col2] = temp;
// }

// print game board
function printBoard() {
    for(let i = 0; i < ROW_SIZE; i++) {
        let row = '';
        for(let j = 0; j < COL_SIZE; j++) {
            row += board[i][j] === 0? '    ' : board[i][j].toString().padStart(4);
            if (j < COL_SIZE - 1) {
                row += '|';
            }
        }
        console.log(row);
        if (i < ROW_SIZE - 1) {
            console.log('----+----+----+----+----+----+----+----+----+----');
        }
    }
}

// find all possible operations on current board
// format is {row, col, dir, step, mrg}, dir 0 right, 1 up, 2 left, 3 down
// mrg indicate the brick dir to merge, 0 right, 1 up, 2 left, 3 down, only used when multi bricks to merge
function findOperation(board) {
    const results = [];
    var space_hor_skip_flag = false;
    var space_ver_skip_flag = [];
    for(let i=0; i<COL_SIZE; i++){
        space_ver_skip_flag.push(false);
    }

    // find adjacent op first
    for(let i = 0; i < ROW_SIZE; i++) {
        for(let j = 0; j < COL_SIZE; j++) {
            var k=1;
            while(i+k<ROW_SIZE && board[i+k][j]==0) k++;
            if (i+k<ROW_SIZE && board[i][j] === board[i + k][j]) {
                results.push({row: i, col: j, dir: 0, step:0, len_brick:0, mrg:3, dist_mrg:k, brick:board[i][j]});
            }
            k=1;
            while(j+k<COL_SIZE && board[i][j+k]==0) k++;
            if (j+k<COL_SIZE && board[i][j] === board[i][j + k]) {
                results.push({row: i, col: j, dir: 3, step:0, len_brick:0, mrg:0, dist_mrg:k, brick:board[i][j]});
            }
        }
    }

    // find moving op
    for(let i = 0; i < ROW_SIZE; i++) {
        for(let j = 0; j < COL_SIZE; j++) {
            // search for blank space
            if(board[i][j] === 0) {
                if(!space_hor_skip_flag) {
                    // horizontal first
                    // fetch the length of horizontal space
                    var len_space_hor = 1;
                    while((j+len_space_hor)<COL_SIZE && board[i][j+len_space_hor]==0) len_space_hor++;
                    // fetch the length of brick seq on the left
                    var len_brick_left = 0;
                    while((j-len_brick_left-1)>=0 && board[i][j-len_brick_left-1]!=0) len_brick_left++;
                    // for each movement to right, search for matching
                    for(let move_right = 1; move_right <= len_space_hor; move_right++) {
                        // check if any block matches
                        for(let t=0; t<len_brick_left; t++){
                            // check top
                            var k=1;
                            while(i-k>=0 && board[i-k][j-t-1+move_right]==0) k++;
                            if(i-k>=0 && board[i-k][j-t-1+move_right]==board[i][j-t-1]){
                                results.push({row: i, col: j-t-1, dir: 0, step:move_right, len_brick:t+1, mrg:1, dist_mrg:k, brick:board[i][j-t-1]})
                            }
                            // check bottom
                            k=1;
                            while(i+k<ROW_SIZE && board[i+k][j-t-1+move_right]==0) k++;
                            if(i+k<ROW_SIZE && board[i+k][j-t-1+move_right]==board[i][j-t-1]){
                                results.push({row: i, col: j-t-1, dir: 0, step:move_right, len_brick:t+1, mrg:3, dist_mrg:k, brick:board[i][j-t-1]})
                            }
                        }
                    }
                    // fetch the length of brick seq on the right
                    var len_brick_right = 0;
                    while((j+len_space_hor+len_brick_right)<COL_SIZE && board[i][j+len_space_hor+len_brick_right]!=0) len_brick_right++;
                    // for each movement to left, search for matching
                    for(let move_left = 1; move_left <= len_space_hor; move_left++) {
                        // check if any block matches
                        for(let t=0; t<len_brick_right; t++){
                            // check top
                            var k=1;
                            while(i-k>=0 && board[i-k][j+len_space_hor+t-move_left]==0) k++;
                            if(i-k>=0 && board[i-k][j+len_space_hor+t-move_left]==board[i][j+len_space_hor+t]){
                                results.push({row: i, col: j+len_space_hor+t, dir: 2, step:move_left, len_brick:t+1, mrg:1, dist_mrg:k, brick:board[i][j+len_space_hor+t]})
                            }
                            // check bottom
                            k=1;
                            while(i+k<ROW_SIZE && board[i+k][j+len_space_hor+t-move_left]==0) k++;
                            if(i+k<ROW_SIZE && board[i+k][j+len_space_hor+t-move_left]==board[i][j+len_space_hor+t]){
                                results.push({row: i, col: j+len_space_hor+t, dir: 2, step:move_left, len_brick:t+1, mrg:3, dist_mrg:k, brick:board[i][j+len_space_hor+t]})
                            }
                        }
                    }
                }

                // vertical second
                // fetch the length of vertical space
                if(!space_ver_skip_flag[j]){
                    var len_space_ver = 1;
                    while((i+len_space_ver)<ROW_SIZE && board[i+len_space_ver][j]==0) len_space_ver++;
                    // fetch the length of brick seq on the top
                    var len_brick_top = 0;
                    while((i-len_brick_top-1)>=0 && board[i-len_brick_top-1][j]!=0) len_brick_top++;
                    // for each movement to bottom, search for matching
                    for(let move_down = 1; move_down <= len_space_ver; move_down++) {
                        // check if any block matches
                        for(let t=0; t<len_brick_top; t++){
                            // check left
                            var k=1;
                            while(j-k>=0 && board[i-t-1+move_down][j-k]==0) k++;
                            if(j-k>=0 && board[i-t-1+move_down][j-k]==board[i-t-1][j]){
                                results.push({row: i-t-1, col: j, dir: 3, step:move_down, len_brick:t+1, mrg:2, dist_mrg:k, brick:board[i-t-1][j]})
                            }
                            // check right
                            k=1;
                            while(j+k<COL_SIZE && board[i-t-1+move_down][j+k]==0) k++;
                            if(j+k<COL_SIZE && board[i-t-1+move_down][j+k]==board[i-t-1][j]){
                                results.push({row: i-t-1, col: j, dir: 3, step:move_down, len_brick:t+1, mrg:0, dist_mrg:k, brick:board[i-t-1][j]})
                            }
                        }
                    }
                    // fetch the length of brick seq on the bottom
                    var len_brick_bottom = 0;
                    while((i+len_space_ver+len_brick_bottom)<ROW_SIZE && board[i+len_space_ver+len_brick_bottom][j]!=0) len_brick_bottom++;
                    // for each movement to top, search for matching
                    for(let move_up = 1; move_up <= len_space_ver; move_up++) {
                        // check if any block matches
                        for(let t=0; t<len_brick_bottom; t++){
                            // check left
                            var k=1;
                            while(j-k>=0 && board[i+len_space_ver+t-move_up][j-k]==0) k++;
                            if(j-k>=0 && board[i+len_space_ver+t-move_up][j-k]==board[i+len_space_ver+t][j]){
                                results.push({row: i+len_space_ver+t, col: j, dir: 1, step:move_up, len_brick:t+1, mrg:2, dist_mrg:k, brick:board[i+len_space_ver+t][j]})
                            }
                            // check right
                            k=1;
                            while(j+k<COL_SIZE && board[i+len_space_ver+t-move_up][j+k]==0) k++;
                            if(j+k<COL_SIZE && board[i+len_space_ver+t-move_up][j+k]==board[i+len_space_ver+t][j]){
                                results.push({row: i+len_space_ver+t, col: j, dir: 1, step:move_up, len_brick:t+1, mrg:0, dist_mrg:k, brick:board[i+len_space_ver+t][j]})
                            }
                        }
                    }
                }

                // mark the skip flag to avoid repeated calc
                if(j+1<COL_SIZE && board[i][j]==0) {
                    space_hor_skip_flag = true;
                } else {
                    space_hor_skip_flag = false;
                }

                if(i+1<ROW_SIZE && board[i+1][j]==0) {
                    space_ver_skip_flag[j] = true;
                } else {
                    space_ver_skip_flag[j] = false;
                }
                
            }
        }
    }

    return results;
}

// take operation on board
function boardOperation(act){
    switch(act.dir) {
        case 0: // move right
        for(let i=act.len_brick-1; i>=0; i--){
            board[act.row][act.col+i+act.step] = board[act.row][act.col+i];
            board[act.row][act.col+i] = 0;
        }
        // merging
        board[act.row][act.col+act.step] = 0;
        if(act.mrg==1) { // merge up
            board[act.row-act.dist_mrg][act.col+act.step] = 0;
        } else if(act.mrg==3) { // merge down
            board[act.row+act.dist_mrg][act.col+act.step] = 0;
        }
        break;
        case 1: // move up
        for(let i=act.len_brick-1; i>=0; i--){
            board[act.row-i-act.step][act.col] = board[act.row-i][act.col];
            board[act.row-i][act.col] = 0;
        }
        // merging
        board[act.row-act.step][act.col] = 0;
        if(act.mrg==2) { // merge left
            board[act.row-act.step][act.col-act.dist_mrg] = 0;
        } else if(act.mrg==0) { // merge right
            board[act.row-act.step][act.col+act.dist_mrg] = 0;
        }
        break;
        case 2: // move left
        for(let i=act.len_brick-1; i>=0; i--){
            board[act.row][act.col-i-act.step] = board[act.row][act.col-i];
            board[act.row][act.col-i] = 0;
        }
        // merging
        board[act.row][act.col-act.step] = 0;
        if(act.mrg==1) { // merge up
            board[act.row-act.dist_mrg][act.col-act.step] = 0;
        } else if(act.mrg==3) { // merge down
            board[act.row+act.dist_mrg][act.col-act.step] = 0;
        }
        break;
        case 3: // move down
        for(let i=act.len_brick-1; i>=0; i--){
            board[act.row+i+act.step][act.col] = board[act.row+i][act.col];
            board[act.row+i][act.col] = 0;
        }
        // merging
        board[act.row+act.step][act.col] = 0;
        if(act.mrg==2) { // merge left
            board[act.row+act.step][act.col-act.dist_mrg] = 0;
        } else if(act.mrg==0) { // merge right
            board[act.row+act.step][act.col+act.dist_mrg] = 0;
        }
        break;
    }
}

// take reverse operation on board, as a way to DFS
function boardReverseOperation(act){
    switch(act.dir) {
        case 0: // move right
        // reverse merging
        board[act.row][act.col+act.step] = act.brick;
        if(act.mrg==1) { // merge up
            board[act.row-act.dist_mrg][act.col+act.step] = act.brick;
        } else if(act.mrg==3) { // merge down
            board[act.row+act.dist_mrg][act.col+act.step] = act.brick;
        }
        // reverse moving
        for(let i=0; i<act.len_brick; i++){
            board[act.row][act.col+i] = board[act.row][act.col+i+act.step];
            board[act.row][act.col+i+act.step] = 0;
        }
        break;
        case 1: // move up
        // reverse merging
        board[act.row-act.step][act.col] = act.brick;
        if(act.mrg==2) { // merge left
            board[act.row-act.step][act.col-act.dist_mrg] = act.brick;
        } else if(act.mrg==0) { // merge right
            board[act.row-act.step][act.col+act.dist_mrg] = act.brick;
        }
        // reverse moving
        for(let i=0; i<act.len_brick; i++){
            board[act.row-i][act.col] = board[act.row-i-act.step][act.col];
            board[act.row-i-act.step][act.col] = 0;
        }
        break;
        case 2: // move left
        // reverse merging
        board[act.row][act.col-act.step] = act.brick;
        if(act.mrg==1) { // merge up
            board[act.row-act.dist_mrg][act.col-act.step] = act.brick;
        } else if(act.mrg==3) { // merge down
            board[act.row+act.dist_mrg][act.col-act.step] = act.brick;
        }
        // reverse moving
        for(let i=0; i<act.len_brick; i++){
            board[act.row][act.col-i] = board[act.row][act.col-i-act.step];
            board[act.row][act.col-i-act.step] = 0;
        }
        break;
        case 3: // move down
        // reverse merging
        board[act.row+act.step][act.col] = act.brick;
        if(act.mrg==2) { // merge left
            board[act.row+act.step][act.col-act.dist_mrg] = act.brick;
        } else if(act.mrg==0) { // merge right
            board[act.row+act.step][act.col+act.dist_mrg] = act.brick;
        }
        // reverse moving
        for(let i=0; i<act.len_brick; i++){
            board[act.row+i][act.col] = board[act.row+i+act.step][act.col];
            board[act.row+i+act.step][act.col] = 0;
        }
        break;
    }
}

// check if game complete
function isGameComplete(board){
    for(let i=0; i<ROW_SIZE; i++){
        for(let j=0; j<COL_SIZE; j++){
            if(board[i][j]!==0){
                return false;
            }
        }
    }
    return true;
}

// print game solution
function printAction(){
    // init board back to original to show the process
    for(let i = 0; i < ROW_SIZE; i++) {
        for(let j = 0; j < COL_SIZE; j++) {
            board[i][j] = board_example[i][j];
        }
    }
    // print action and the board result
    for(let i=0; i<action_history.length; i++){
        console.log(action_history[i]);
        boardOperation(action_history[i]);
        printBoard();
    }
}

// DFS the way to complete game
function dfsGame(){
    // all zero, solution found
    if(isGameComplete(board)){
        printAction();
        return true;
    }
    // find all current operations, dfs
    // debug
    if(board[0][2]==3 && board[1][2]==12 && board[2][2]==0 && board[3][2]==0 && board[4][2]==0 && board[5][2]==0 && board[6][2]==0 && board[7][2]==0 && board[5][1]==3){
        console.log('debug anchor');
    }
    var actions = findOperation(board);
    if(actions.length==0){
        return false;
    }
    for(let i=0; i<actions.length; i++){
        // ============= debug =================
        // console.log('action');
        // console.log(actions[i]);
        // ============= debug end =============
        boardOperation(actions[i]);
        action_history.push(actions[i]);
        // ============= debug =================
        // printBoard();
        // ============= debug end =============
        if(dfsGame()){
            return true;
        } else {
            // ============= debug =================
            // console.log('reverse action');
            // console.log(actions[i]);
            // ============= debug end =============
            boardReverseOperation(actions[i]);
            action_history.pop();
            // ============= debug =================
            // printBoard();
            // ============= debug end =============
        }
    }
    // if all op cannot complete, reverse back to root
    return false;
}

// init game
printBoard();
dfsGame();

// player input
// process.stdin.on('data', (data) => {
//     let input = data.toString().trim().toLowerCase();
//     if(input === 'w') {
//         //moveUp();
//     } else {
//         console.log('Invalid input. Use w, s, a, or d.');
//     }
// });