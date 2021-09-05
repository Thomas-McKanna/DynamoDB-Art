let API_BASE = "https://2uougk1ghh.execute-api.us-west-1.amazonaws.com/Prod/";

function create_uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function add_canvas_event_listeners() {
    let canvas = document.getElementById("drawing_canvas");
    canvas.addEventListener("mousedown", on_mouse_down);
    canvas.addEventListener("mousemove", on_mouse_move);
    canvas.addEventListener("mouseup", on_mouse_up);
}

function on_mouse_down() {
    state.mouse_down = true;
    state.mouse_just_down = true;
}

function on_mouse_move(event) {
    let canvas = document.getElementById("drawing_canvas");
    let ctx = canvas.getContext("2d");

    if (state.mouse_just_down) {
        state.mouse_just_down = false;
        coords = get_canvas_coords(event);
        set_state_previous_coords(coords);
    } else if (state.mouse_down) {
        coords = get_canvas_coords(event);
        set_state_current_coords(coords);
        draw_line(state.prev_x, state.prev_y,
            coords.x, coords.y, state.color, state.width);
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
        color: "black",
        width: 5,
        curr_x: 0,
        curr_y: 0,
        prev_x: 0,
        prev_y: 0,
        mouse_down: false,
        mouse_just_down: false
    };
}

function init_stroke_history() {
    return [];
}

function init_slider() {
    let slider = document.getElementById("width_slider");
    slider.oninput = function() {
        state.width = this.value;
    }
}

function init_recording_buttons() {
    enable_button("start_recording");
    disable_button("stop_recording");
}

function enable_button(id) {
    let button = document.getElementById(id);
    button.disabled = false;
}

function disable_button(id) {
    let button = document.getElementById(id);
    button.disabled = true;
}

function set_button_background_red(id) {
    let button = document.getElementById(id);
    button.classList.remove('btn-primary');
    button.classList.add('btn-danger');
}

function set_button_background_blue(id) {
    let button = document.getElementById(id);
    button.classList.remove('btn-danger');
    button.classList.add('btn-primary');
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
        color: state.color,
        width: state.width,
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

function reset_history() {
    state.stroke_num = 0;
    stroke_history = [];
}

function start_recording() {
    state.id = create_uuid();
    state.recording = true;
    reset_history();
    clear_canvas();
    disable_button("start_recording");
    enable_button("stop_recording");
    set_button_background_red("stop_recording");
}

function save_drawing() {
    let name_input = document.getElementById("drawing_name");
    let name = name_input.value;

    if (name == "") {
        name = "untitled";
    }

    upload_drawing_to_dynamodb(name);
    $("#name_drawing").modal("hide");
}

function upload_drawing_to_dynamodb(name) {
    body = {
        "id": state.id,
        "name": name,
        "strokes": stroke_history
    };

    let request = new XMLHttpRequest();
    request.open("POST", `${API_BASE}/putDrawing`, true);
    request.send(JSON.stringify(body));

    request.onreadystatechange = function() {
        if (this.readyState == 4) {
            if (this.status == 200) {
                alert("Drawing upload successful");
                res = JSON.parse(request.responseText);
                add_drawing_to_list(res.id, res.name, res.timestamp);
                enable_button("start_recording");
            } else {
                alert("Drawing upload failed");
            }
        }
    }
}

function add_drawing_to_list(id, name, timestamp) {
    let play_icon = document.createElement("i");
    play_icon.classList.add("fa", "fa-play");

    formatted_timestamp = get_formatted_datetime(timestamp);
    let label = document.createElement("span");
    label.textContent = ` ${name} - ${formatted_timestamp}`;

    let replay_button = document.createElement("button")
    replay_button.classList.add("btn", "btn-outline-primary", "mr-2");

    replay_button.appendChild(play_icon);
    replay_button.appendChild(label);
    replay_button.onclick = function() {
        replay_drawing(id);
    };

    let trash_icon = document.createElement("i");
    trash_icon.classList.add("fa", "fa-trash");

    let delete_button = document.createElement("button");
    delete_button.id = `delete-${id}`;
    delete_button.classList.add("btn", "btn-outline-danger");
    delete_button.appendChild(trash_icon);
    delete_button.onclick = function() {
        delete_drawing(id);
    }

    let row = document.createElement("div");
    row.id = `drawing-${id}`;
    row.classList.add("row", "mb-2");
    row.appendChild(replay_button);
    row.appendChild(delete_button)

    let drawing_list = document.getElementById("drawing_list");
    drawing_list.appendChild(row);
}

function get_formatted_datetime(iso_string) {
    let epoch = Date.parse(iso_string);
    let datetime = new Date(epoch);

    format_args = {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric"
    };

    let date = datetime.toLocaleDateString("en-us", format_args);
    let time = datetime.toLocaleTimeString("en-us");
    return `${date} ${time}`;
}

function delete_drawing(id) {
    body = {
        "id": id,
    };

    let request = new XMLHttpRequest();
    request.open("DELETE", `${API_BASE}/deleteDrawing`, true);
    request.send(JSON.stringify(body));

    disable_button(`delete-${id}`);

    request.onreadystatechange = function() {
        if (this.readyState == 4) {
            if (this.status == 204) {
                remove_drawing_from_list(id);
            } else {
                alert("Failed to delete drawing");
            }
        }
    }
}

function remove_drawing_from_list(id) {
    let row = document.getElementById(`drawing-${id}`);
    row.remove();
}

function replay_drawing(id) {
    let body = {
        "id": id
    };

    let request = new XMLHttpRequest();
    request.open("POST", `${API_BASE}/getDrawing`, true);
    request.send(JSON.stringify(body));

    request.onreadystatechange = function() {
        if (this.readyState == 4) {
            if (this.status == 200) {
                strokes = JSON.parse(request.responseText);
                replay_strokes(strokes)
            } else {
                alert("Failed to retrieve drawing");
            }
        }
    }
}

async function replay_strokes(strokes) {
    clear_canvas();
    let canvas = document.getElementById("drawing_canvas");
    let ctx = canvas.getContext("2d");
    for (stroke of strokes) {
        draw_line(stroke.prev_x, stroke.prev_y,
            stroke.curr_x, stroke.curr_y, stroke.color, stroke.width);
        await sleep(25);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function set_line_color(color) {
    state.color = color;
}

function draw_line(x1, y1, x2, y2, color, width) {
    let canvas = document.getElementById("drawing_canvas");
    let ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
}

function init_drawing_list() {
    let request = new XMLHttpRequest();
    request.open("GET", `${API_BASE}/getAllDrawings`, true);
    request.send();

    request.onreadystatechange = function() {
        if (this.readyState == 4) {
            if (this.status == 200) {
                drawings = JSON.parse(request.responseText);
                for (d of drawings) {
                    add_drawing_to_list(d.id, d.name, d.timestamp)
                }
                console.log(drawings);
            } else {
                alert("Failed to retrieve drawing");
            }
        }
    }
}

function stop_recording() {
    state.recording = false;
    disable_button("stop_recording");
    set_button_background_blue("stop_recording");
    let name_input = document.getElementById("drawing_name");
    name_input.value = "";
    $("#name_drawing").modal("show");
}

function clear_canvas() {
    let canvas = document.getElementById("drawing_canvas");
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // The following function call clears the "line history" of the canvas;
    // if not called, the lines will all appear again at the first call to
    // ctx.stroke.
    ctx.beginPath();
}

function discard_drawing() {
    clear_canvas();
    enable_button("start_recording");
    reset_history();
}

add_canvas_event_listeners();
let state = init_state();
let stroke_history = init_stroke_history();
init_slider();
init_recording_buttons();
init_drawing_list();