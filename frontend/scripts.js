let API_BASE = "https://lpqfk3is2f.execute-api.us-west-1.amazonaws.com/Prod";

function create_uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function add_canvas_event_listeners() {
    let canvas = document.getElementById("draw_canvas");
    canvas.addEventListener("mousedown", on_mouse_down);
    canvas.addEventListener("mousemove", on_mouse_move);
    canvas.addEventListener("mouseup", on_mouse_up);
}

function on_mouse_down() {
    state.mouse_down = true;
    state.mouse_just_down = true;
}

function on_mouse_move(event) {
    let canvas = document.getElementById("draw_canvas");
    let ctx = canvas.getContext("2d");

    if (state.mouse_just_down) {
        state.mouse_just_down = false;
        coords = get_canvas_coords(event);
        set_state_previous_coords(coords);
    } else if (state.mouse_down) {
        coords = get_canvas_coords(event);
        set_state_current_coords(coords);
        ctx.moveTo(state.prev_x, state.prev_y);
        ctx.lineTo(coords.x, coords.y)
        ctx.stroke();
        stroke_history.push(get_condensed_state());
        set_state_previous_coords(coords);
        state.stroke_num += 1;
    }
}

function on_mouse_up(event) {
    state.mouse_down = false;
}

function init_state() {
    return {
        id: null,
        recording: false,
        stroke_num: 0,
        curr_x: 0,
        curr_y: 0,
        prev_x: 0,
        prev_y: 0,
        mouse_down: false,
        mouse_just_down: false,
    };
}

function init_stroke_history() {
    return [];
}

function get_canvas_coords(event) {
    // The parameter event should be the event generated by "mousemove"
    return {
        x: event.offsetX,
        y: event.offsetY
    };
}

function get_condensed_state() {
    return {
        stroke_num: state.stroke_num,
        curr_x: state.curr_x,
        curr_y: state.curr_y,
        prev_x: state.prev_x,
        prev_y: state.prev_y
    };
}

function set_state_previous_coords(coords) {
    state.prev_x = coords.x;
    state.prev_y = coords.y;
}

function set_state_current_coords(coords) {
    state.curr_x = coords.x;
    state.curr_y = coords.y;
}

function start_recording() {
    state.id = create_uuid();
    state.recording = true;
    state.stroke_num = 0;
    stroke_history = [];
    clear_canvas();
}

function stop_recording() {
    state.recording = false;
    upload_drawing_to_dynamodb("simple drawing");
    add_drawing_to_list();
}

function upload_drawing_to_dynamodb(name) {
    body = {
        "id": state.id,
        "name": name,
        "strokes": stroke_history
    }

    console.log(body);
    console.log("Sfdsf")

    let request = new XMLHttpRequest();
    request.open("POST", `${API_BASE}/putDrawing`, true);
    request.send(JSON.stringify(body));

    request.onreadystatechange = function() {
        if (this.readyState == 4) {
            if (this.status == 200) {
                alert("Drawing upload successful");
            } else {
                alert("Drawing upload failed");
                console.log(request)
            }
        }
    }
}

function add_drawing_to_list() {
    // TODO
}

function clear_canvas() {
    let canvas = document.getElementById("draw_canvas");
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // The following function call clears the "line history" of the canvas;
    // if not called, the lines will all appear again at the first call to
    // ctx.stroke.
    ctx.beginPath();
}

add_canvas_event_listeners();
let state = init_state();
let stroke_history = init_stroke_history();