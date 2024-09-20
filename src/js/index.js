// game board var and parameters
const ROW_SIZE = 14;
const COL_SIZE = 10;
var action_history = [];
var board = [];
var board_org = [];
var canvas = document.getElementById('canvasOutput');
var ctx = canvas.getContext('2d');
var data;
var brick_imgdata_list = [];
var block_size = 64;

function handleFileUpload() {
    var file = document.getElementById('fileInput').files[0];
    var reader = new FileReader();

    reader.onload = function (event) {
        var img = new Image();
        img.onload = function () {
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 1080, 2504);

            // search for the brown boundary
            // more than 50% of the pixels in a row or a col is close to #b9853f
            data = ctx.getImageData(0, 0, img.width, img.height);
            let color_thres = 50;

            var brown_upper_row = -1;
            var brown_lower_row = -1;
            var is_brown_row = false;
            var is_brown_row_prev = false;
            for(let row=0; row<img.height; row++) {
                is_brown_row_prev = is_brown_row;
                is_brown_row = false;
                var brown_count = 0;
                var brown_thres = img.width/2;
                for(let col=0; col<img.width; col++) {
                    var r = data.data[4*(row * img.width + col) + 0];
                    var g = data.data[4*(row * img.width + col) + 1];
                    var b = data.data[4*(row * img.width + col) + 2];
                    var rgb_dist = Math.sqrt(Math.pow(r-185,2) + Math.pow(g-133,2) + Math.pow(b-63,2));
                    if(rgb_dist < color_thres) {
                        brown_count++;
                        if(brown_count > brown_thres) {
                            is_brown_row = true;
                            break;
                        }
                    }
                }
                // upper row judge
                if(is_brown_row_prev && !is_brown_row && brown_upper_row<0) {
                    brown_upper_row = row;
                }
                // lower row judge
                if(!is_brown_row_prev && is_brown_row && brown_upper_row>0 && brown_lower_row<0) {
                    brown_lower_row = row;
                }
            }
            // TODO: how to make it more precise
            // consider the last shadow pixel
            brown_lower_row-=6;

            var brown_left_col  = -1;
            var brown_right_col = -1;
            var is_brown_col = false;
            var is_brown_col_prev = false;
            for(let col=0; col<img.width; col++) {
                is_brown_col_prev = is_brown_col;
                is_brown_col = false;
                var brown_count = 0;
                var brown_thres = img.height/2;
                for(let row=0; row<img.height; row++) {
                    var r = data.data[4*(row * img.width + col) + 0];
                    var g = data.data[4*(row * img.width + col) + 1];
                    var b = data.data[4*(row * img.width + col) + 2];
                    var rgb_dist = Math.sqrt(Math.pow(r-185,2) + Math.pow(g-133,2) + Math.pow(b-63,2));
                    if(rgb_dist < color_thres) {
                        brown_count++;
                        if(brown_count > brown_thres) {
                            is_brown_col = true;
                            break;
                        }
                    }
                }
                // left col judge
                if(is_brown_col_prev && !is_brown_col && brown_left_col<0) {
                    brown_left_col = col;
                }
                // right col judge
                if(!is_brown_col_prev && is_brown_col && brown_left_col>0 && brown_right_col<0) {
                    brown_right_col = col;
                }
            }

            // resize the 14*10 blocks to 32x32 pixels each
            canvas.width = COL_SIZE*block_size;
            canvas.height = ROW_SIZE*block_size;
            ctx.drawImage(img, brown_left_col, brown_upper_row, brown_right_col-brown_left_col, brown_lower_row-brown_upper_row, 0, 0, COL_SIZE*block_size, ROW_SIZE*block_size);
            // Debug: draw divider lines
            for(let row=0; row<ROW_SIZE; row++){
                for(let col=0; col<COL_SIZE; col++){
                    ctx.beginPath();
                    ctx.strokeStyle = 'red';
                    ctx.rect(col*block_size, row*block_size, block_size, block_size);
                    ctx.stroke();
                }
            }

            // take the pure block image
            data = ctx.getImageData(0, 0, COL_SIZE*block_size, ROW_SIZE*block_size);

            // init brick list and board info
            var brick_thres = 2048;
            var brick_data_list = [];
            var bricks = [];
            var bricks_index = 1;
            board = [];
            board_org = [];
            for(let row=0; row<ROW_SIZE; row++){
                board[row] = [];
                board_org[row] = [];
                for(let col=0; col<COL_SIZE; col++){
                    // record brick info
                    var brick_data = [];
                    for(let i=0; i<block_size; i++){
                        for(let j=0; j<block_size; j++){
                            var start_pt = (row*block_size+i)*COL_SIZE*block_size+col*block_size+j;
                            // transform to YUV, only save Y
                            var r = data.data[4*start_pt + 0];
                            var g = data.data[4*start_pt + 1];
                            var b = data.data[4*start_pt + 2];
                            let y = 0.299 * r + 0.587 * g + 0.114 * b;
                            brick_data.push(Math.floor(y));
                        }
                    }
                    // check if similar brick present
                    var brick_new = false;
                    for(let i=0; i<bricks.length; i++){
                        // find similar brick
                        var brick_diff = sadBrick(brick_data_list[i], brick_data, block_size);
                        // console.log('row ' + row + ' col ' + col + ' block diff to index' + (i+1) + ' is ' + brick_diff);
                        if(brick_diff<brick_thres) {
                            board[row][col] = i+1;
                            board_org[row][col] = i+1;
                            brick_new = true;
                            break;
                        }
                    }    
                    // brand new brick, record it
                    if(!brick_new) {
                        // ====================================
                        let brick_imgdata = ctx.createImageData(block_size, block_size);
                        for(let y=0; y<block_size; y++){
                            for(let x=0; x<block_size; x++){
                                var org_index  = ((row*block_size+y)*(block_size*COL_SIZE)+(col*block_size+x))*4;
                                var dest_index = (y*block_size+x)*4;
                                brick_imgdata.data[dest_index + 0] = data.data[org_index + 0];
                                brick_imgdata.data[dest_index + 1] = data.data[org_index + 1];
                                brick_imgdata.data[dest_index + 2] = data.data[org_index + 2];
                                brick_imgdata.data[dest_index + 3] = data.data[org_index + 3];
                            }
                        }
                        brick_imgdata_list.push(brick_imgdata);

                        brick_data_list.push(brick_data);
                        bricks.push(bricks_index);
                        board[row][col] = bricks_index;
                        board_org[row][col] = bricks_index;
                        bricks_index++;
                    }
                }
            }

            dfsGame();
        };

        img.src = event.target.result;
    };

    reader.readAsDataURL(file);
}

function sadBrick(a, b, size) {
    let result = 0;
    for(let i=0; i<size; i++){
        for(let j=0; j<size; j++){
            result += Math.pow(a[i*size+j]-b[i*size+j], 2);
        }
    }
    return Math.sqrt(result);
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
            board[i][j] = board_org[i][j];
        }
    }
    // print action and the board result
    for(let i=0; i<action_history.length; i++){
        console.log(action_history[i]);
        printBoard(action_history[i]);
        // add listener
        document.getElementById('button').addEventListener('click', function () {
            // operation after clicking
            console.log('next step');
        });
        boardOperation(action_history[i]);
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
    var actions = findOperation(board);
    if(actions.length==0){
        return false;
    }
    for(let i=0; i<actions.length; i++){
        boardOperation(actions[i]);
        action_history.push(actions[i]);
        if(dfsGame()){
            return true;
        } else {
            boardReverseOperation(actions[i]);
            action_history.pop();
        }
    }
    // if all op cannot complete, reverse back to root
    return false;
}

function printBoard(act) {
    // clear the canvas first
    ctx.clearRect(0, 0, COL_SIZE*block_size, ROW_SIZE*block_size);
    // print bricks one by one
    for(let row=0; row<ROW_SIZE; row++){
        for(let col=0; col<COL_SIZE; col++){
            if(board[row][col]>0){
                printBrick(board[row][col], row, col);
            }
        }
    }
    // print action
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'red';
    // mark origin brick
    ctx.strokeRect(act.row*block_size, act.col*block_size, block_size, block_size);
    // ctx.strokeRect(0, 0, 64, 64);
    // mark dest brick
    var dest_row, dest_col;
    switch(act.dir) {
        case 0: 
            dest_row = (act.mrg==3) ? act.row+act.dist_mrg : act.row-act.dist_mrg;
            dest_col = act.col + act.step;
            break;
        case 1:
            dest_row = act.row + act.step;
            dest_col = (act.mrg==0) ? act.col+act.dist_mrg : act.col-act.dist_mrg;
            break;
        case 2:
            dest_row = (act.mrg==3) ? act.row+act.dist_mrg : act.row-act.dist_mrg;
            dest_col = act.col - act.step;
            break;
        case 3:
            dest_row = act.row - act.step;
            dest_col = (act.mrg==0) ? act.col+act.dist_mrg : act.col-act.dist_mrg;
            break;
    }
    ctx.strokeRect(dest_row*block_size, dest_col*block_size, block_size, block_size);
    // mark movement if larger than 0
    if(act.step>0) {
        if(act.dir==0 || act.dir==2){ // hor
            drawArrow(act.row*block_size+block_size/2, act.col*block_size+block_size/2, act.row*block_size+block_size/2, dest_col*block_size+block_size/2);
        } else { // ver
            drawArrow(act.row*block_size+block_size/2, act.col*block_size+block_size/2, dest_row*block_size+block_size/2, act.col*block_size+block_size/2);
        }
    }
}

function printBrick(index, row, col) {
    // find the brick location within original data and store
    // let brick_data = ctx.createImageData(block_size, block_size);
    // var org_row=-1;
    // var org_col=-1;
    // for(let i=0; i<ROW_SIZE; i++){
    //     for(let j=0; j<COL_SIZE; j++){
    //         if(board_org[i][j]==index){
    //             org_row = i;
    //             org_col = j;
    //             for(let y=0; y<block_size; y++){
    //                 for(let x=0; x<block_size; x++){
    //                     var org_index  = ((i*block_size+y)*(block_size*COL_SIZE)+(j*block_size+x))*4;
    //                     var dest_index = (y*block_size+x)*4;
    //                     brick_data.data[dest_index + 0] = data.data[org_index + 0];
    //                     brick_data.data[dest_index + 1] = data.data[org_index + 1];
    //                     brick_data.data[dest_index + 2] = data.data[org_index + 2];
    //                     brick_data.data[dest_index + 3] = data.data[org_index + 3];
    //                 }
    //             }
    //             break;
    //         }
    //     }
    //     if(org_row>=0 && org_col>=0){
    //         break;
    //     }
    // }
    // draw it to location
    ctx.putImageData(brick_imgdata_list[index-1], col*block_size, row*block_size);
}

function drawArrow(fromX, fromY, toX, toY) {
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);

    // calc arrow angle
    var angle = Math.atan2(toY - fromY, toX - fromX);

    // draw the side of arror
    ctx.lineTo(toX - 15 * Math.cos(angle - Math.PI / 6), toY - 15 * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - 15 * Math.cos(angle + Math.PI / 6), toY - 15 * Math.sin(angle + Math.PI / 6));

    ctx.stroke();
}
