//globals
var intensity_threshold = 145;
var real_filename;
var nextButtons = document.getElementsByClassName("next");
var backButtons = document.getElementsByClassName("back");
var homeButton = document.getElementById("home");
var topButtons = document.getElementsByClassName("top");

// modal
var elem = document.querySelector('.modal');
var instance = M.Modal.init(elem);

function setView(index){

    if(brain_model.currentView === null) {
        instance.open();
        return
    }

    console.log(`setting view for index ${index}`);
    var container = document.getElementById("container");

    container.style.top = `-${index*window.innerHeight}px`
}

for(let x = 0 ; x < nextButtons.length ; x++) {
     nextButtons[x].addEventListener('click', function(){ setView(x+1);})
     backButtons[x].addEventListener('click', function(){ setView(x)})
}

for(let x = 0 ; x < topButtons.length ; x++) {
    topButtons[x].addEventListener('click', function(){ setView(0)});
}
homeButton.addEventListener("click", function(){
    location.href = "/";
});


var brain_model = {
    data: [],
    currentView: null,
    loadData: function(data) {
        this.data = data

        this.views.top.slider.max = data.length -1;
        this.views.front.slider.max = data[0].length - 1;
        this.views.side.slider.max = data[0][0].length - 1;

        // default value would be the middle
        this.views.top.slider.value = Math.floor((data.length - 1) / 2);
        this.views.front.slider.value = Math.floor(data[0].length / 2);
        this.views.side.slider.value = Math.floor(data[0][0].length / 2);

        this.views.top.index.value = this.views.top.slider.value;
        this.views.front.index.value = this.views.front.slider.value;
        this.views.side.index.value = this.views.side.slider.value;

        this.views.redraw();

    },
    getSlice: function(type="top", index) {
        
        brain = this.data
        if(type === 'top') {
            if(index >= brain.length) {
                index = brain.length - 1;
            }

            if(index < 0) {
                index = 0
            }
            
            return this.data[index]
        } 
        else if(type === 'side')
        {
            result = [];
            
            // check out of bounds
            if (index >= brain[0][0].length) {
                index = brain[0][0].length - 1
            }

            if (index < 0) {
                index = 0;
            }

            for(var x = 0 ; x < brain.length; x++) {
                temp_array = []
                for(var y= 0; y < brain[x].length; y++)
                {
                    temp_array.push(brain[x][y][index])
                }
                result.push(temp_array)
            }
            return result;
        } 
        else if(type === 'front') {
            
            result = [];

            for(var x = 0; x < brain.length ; x++) {
                result.push(brain[x][index])
            }
            return result;
        }
        return []
    },
    views: {
        redraw: function() {
            this.top.draw()
            this.side.draw()
            this.front.draw()
        },
        top: {
            name: 'Axial',
            container: document.getElementById('axial'),
            canvas: document.getElementById('top_view'),
            slider: document.getElementById('top_view_slider'),
            index: document.getElementById('top_view_index'),
            select: document.getElementById('top_view_select'),
            draw: function() {
                this.canvas.draw(brain_model.getSlice('top', this.slider.value), 'grayscale')
            }
        },

        side: {
            name: 'Saggital',
            container: document.getElementById('saggital'),
            canvas: document.getElementById('side_view'),
            slider: document.getElementById('side_view_slider'),
            index: document.getElementById('side_view_index'),
            select: document.getElementById('side_view_select'),
            draw: function() {
                this.canvas.draw(brain_model.getSlice('side', this.slider.value), 'grayscale', true, true);
            }
        },
        
        front: {
            name:'Coronal',
            container: document.getElementById('coronal'),
            canvas: document.getElementById('front_view'),
            slider: document.getElementById('front_view_slider'),
            index: document.getElementById('front_view_index'),
            select: document.getElementById('front_view_select'),
            draw: function() {
                this.canvas.draw(brain_model.getSlice('front', this.slider.value), 'grayscale', true)
            }
        }
    },
    init: function() {
        var views = this.views
        for(var view in views) {
            if (views.hasOwnProperty(view)) {
                if(views[view].hasOwnProperty('canvas'))
                {
                    this.attach_properties(views[view], view)
                }
            }
        }
    },
    attach_properties: function(view, view_name){

        view.canvas.draw = draw;  
        view.slider.addEventListener('change', function(event){
            view.index.value = this.value;
            view.draw()
        })
        view.select.addEventListener('click', function(event){

            //reset the borders
            brain_model.views.top.container.style.border = "none";
            brain_model.views.side.container.style.border = "none";
            brain_model.views.front.container.style.border = "none";
            
            //reset the filters list
            resetFiltersList(); 

            //highlight the div
            view.container.style.border = '2px solid black';
            view.container.style.borderRadius = "15px";

            //set the pre process image
            flipx = (view_name === 'side' || view_name ==='front')? true: false;
            flipy = (view_name === 'side')? true : false;
            brain_model.currentView = view_name;
            postRequest('/setPreprocessImage', {view:view_name, index:view.slider.value})
                .then(response => response.json())
                .then(data => {
                    pre_process_out.draw(data,'grayscale', flipx, flipy)
                })
                .catch(err => console.log(err))

            // set the slice and index number

            var slice_value = document.getElementById('slice_value');
            var index_value = document.getElementById('index_value');

            slice_value.innerHTML = view.name
            index_value.innerHTML = view.slider.value;

            //set the overlay checkbox to true
            var overlay_cb = document.getElementById('overlay_checkbox');
            overlay_cb.checked = true;

            //reset the intensity threshold
            intensity_threshold = 145;
            var intensity_value = document.getElementById("intensity_value");
            var threshold = document.getElementById("threshold");

            threshold.value = intensity_threshold;
            intensity_value.innerHTML = intensity_threshold;

            //show toast
            M.toast({html: `${view.name} view at index ${view.slider.value} selected`})
            
        })                  
    }
    
}

filters_list = document.getElementById('filters_list');
filters_summary = document.getElementById('filters_summary');

function resetFiltersList() {
    filters_list.innerHTML = '';
    filters_summary.innerHTML = '';
}

// this applies to canvas
// type could be RGB | grayscale
// separate this function, i could reuse this for the output view
// lol, flipx shoud be flipy and vice versa but im too lazy to change

function initPreprocessingFields() {

    // init the output canvas
    pre_process_out = document.getElementById('pre_process_out');
    pre_process_out.draw = draw
    
    //add event listener to buttons
    median_filter = document.getElementById('median_filter');
    histo_filter = document.getElementById('histo_filter');
    bilateral_filter = document.getElementById('bilateral_filter');
    reset_filters = document.getElementById('reset_filters')
    isolate_brain = document.getElementById('isolate_brain');


    function updatePreprocessCanvas(data,flipx,flipy) {
        pre_process_out.draw(data,'grayscale',flipx,flipy)
    }
    
    function addToFiltersList(filter) {
        
        var elem = document.createElement('div');
        var filters_summary = document.getElementById('filters_summary');

        if(filters_list.childNodes.length >= 1) {
            var arrow = document.createElement('i');
            arrow.className = "tiny material-icons";
            arrow.innerHTML = 'arrow_forward';
            filters_list.appendChild(arrow);
        }

        elem.style.display="inline-block";
        elem.innerHTML = filter;

        elem.style.padding = '5px';
        elem.style.backgroundColor = "#29b6f6";
        elem.style.color="white";
        elem.style.borderRadius = '5px';
        elem.style.marginBottom = '5px';


        filters_list.appendChild(elem);
        filters_summary.innerHTML = filters_list.innerHTML;

    }

    function requestFilter(filter) {
        return function(event) {
            postRequest('/applyFilter', filter)
                .then(response => response.json())
                .then(data => {

                    img_array = data.img_array;
                    view = brain_model.currentView;
                    
                    flipx = (view === 'side' || view ==='front')? true: false;
                    flipy = (view === 'side')? true : false;
                    updatePreprocessCanvas(data, flipx, flipy);
                    addToFiltersList(this.innerHTML);
                })
                .catch(err => console.log(err));
            console.log(filter)
        }
    }
    median_filter.addEventListener('click', requestFilter('median'));
    histo_filter.addEventListener('click', requestFilter('equalize'));
    bilateral_filter.addEventListener('click', requestFilter('bilateral'))

    isolate_brain.addEventListener('click', function(event){
        event.preventDefault();
        
        postRequest('/isolateBrain')
            .then(response=>response.json())
            .then(data => {

                view = brain_model.currentView;
                flipx = (view === 'side' || view ==='front')? true: false;
                flipy = (view === 'side')? true : false;
                updatePreprocessCanvas(data,flipx,flipy);
            })
            .catch(err => console.log(err));
    });

    reset_filters.addEventListener('click', function(event){

        postRequest('/resetPreprocessImage')
            .then(response => response.json())
            .then(data => {

                view = brain_model.currentView;
                flipx = (view === 'side' || view ==='front')? true: false;
                flipy = (view === 'side')? true : false
                
                updatePreprocessCanvas(data, flipx, flipy);
                resetFiltersList();                            
            })
            .catch(err => console.log(err))
    });

}

function initSegmentationFields() {

    watershed_button = document.getElementById('watershed_button');
    marker = document.getElementById('marker');
    gradient = document.getElementById('gradient');
    watershed = document.getElementById('watershed');

    marker.draw = draw;
    gradient.draw = draw;
    watershed.draw = draw;

    watershed_button.addEventListener('click', function(event){
        postRequest('/applyWatershed')
            .then(response => response.json())
            .then(data => {
                console.log(data)
                view = brain_model.currentView;
                flipx = (view === 'side' || view ==='front')? true: false;
                flipy = (view === 'side')? true : false;
                marker.draw(data['marker'], 'grayscale', flipx, flipy);
                gradient.draw(data['gradient'], 'grayscale', flipx, flipy);
                watershed.draw(data['watershed'], 'RGB', flipx, flipy);
                
            })
            .catch(err => console.log(err));
    })

}

function initTumorDetectionFields() {
    var detect_tumor_button = document.getElementById('detect_tumor_button');
    var tumor_canvas_base = document.getElementById('tumor_canvas_base');
    var tumor_canvas_layer = document.getElementById('tumor_canvas_layer');
    var overlay_cb = document.getElementById('overlay_checkbox');
    var save_image = document.getElementById('save_image');
    var final_canvas = document.getElementById('final_canvas');
    tumor_canvas_base.draw = draw;
    tumor_canvas_layer.draw = draw;

    function detectTumor(threshold=145) {
        
        // var final_canvas = document.getElementById('final_canvas');

        postRequest('/detectTumor', threshold)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                view = brain_model.currentView;
                flipx = (view === 'side' || view ==='front')? true: false;
                flipy = (view === 'side')? true : false;

                // tumor_canvas.draw(data.overlay,'RGB', flipx, flipy)
                tumor_canvas_base.draw(data.original,'grayscale', flipx, flipy)
                overlay = data.overlay
                
                let result = []

                for(let x = 0 ; x < overlay.length ; x++) {
                    let new_row = []
                    for (let y = 0 ; y < overlay[x].length ; y++) {
                        
                        if(overlay[x][y]) {
                            new_row.push({
                                'red': 100,
                                'green': 0,
                                'blue': 0
                            })
                        }
                        else {
                            new_row.push(0)
                        }
                    }
                    result.push(new_row)
                    
                }
                console.log(result);
                tumor_canvas_layer.draw(result,'RGB', flipx, flipy, 0.8)

                //update tumor area value
                let tumor_area = document.getElementById("tumor_area");
                tumor_area.innerHTML = `${data.area} px`;

                //update threshold
                var intensity_value = document.getElementById("intensity_value");
                intensity_value.innerHTML = intensity_threshold;

                //draw to final canvas
                final_ctx = final_canvas.getContext('2d');
                final_canvas.width = tumor_canvas_base.width - 1;
                final_canvas.height = tumor_canvas_base.height - 1;

                final_ctx.drawImage(tumor_canvas_base,0,0);
                final_ctx.drawImage(tumor_canvas_layer,0,0);


            })
            .catch(err => console.log(err))
    }

    detect_tumor_button.addEventListener('click', function(event) {
        detectTumor(intensity_threshold);
    });

    //summary table values
    var filename = document.getElementById("filename");
    var intensity_value = document.getElementById("intensity_value");
    var threshold = document.getElementById("threshold");
    var set_threshold = document.getElementById("set_threshold");

    filename.innerHTML = real_filename;
    intensity_value.innerHTML = intensity_threshold;

    //add event listener to checkbox
    overlay_cb.addEventListener('click', function(event) {
        if(this.checked) {
            tumor_canvas_layer.style.visibility = 'visible';
            console.log('')
        }
        else {
            tumor_canvas_layer.style.visibility = 'hidden';
        }
    })

    //add event listener to threshold input box
    threshold.value = intensity_threshold;
    set_threshold.addEventListener('click', function(e){ 
        intensity_threshold = threshold.value
        console.log(intensity_threshold);
        detectTumor(intensity_threshold);

    });

    save_image.addEventListener('click', function(e){
        var image = final_canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");  
        window.location.href=image; 
    });

}

// this applies to canvas
// type could be RGB | grayscale
// separate this function, i could reuse this for the output view
// lol, flipx shoud be flipy and vice versa but im too lazy to change

function draw(img_array, type='RGB', flipx=false, flipy=false, alpha=1) {
    
    var ctx = this.getContext('2d');
    
    var startx = (flipx)? img_array.length - 1 : 0;
    var endx = (flipx)? 0 : img_array.length - 1;
    var stepx = (flipx)? -1 : 1;

    var starty = (flipy)? img_array[0].length - 1 : 0;
    var endy = (flipy)? 0 : img_array[0].length -1;
    var stepy = (flipy)? -1 : 1;

    var imageWidth = img_array[0].length
    var imageHeight = img_array.length
    // change the size of the canvase depending on image array
    // TODO, use scale, its better to have a static sized canvas 
    // computation would be target / size of image array = scalar
    // scalar can be used to scale

    this.height = imageHeight;
    this.width = imageWidth;

    if(type === 'grayscale') {
        for (i=startx, x=0; i != endx; i+=stepx, x++){
            for(j=starty, y=0; j != endy;j+=stepy, y++){
                let color = img_array[i][j]
                ctx.fillStyle = "rgb("+color+","+color+","+color+")";
                ctx.fillRect(y, x, 1, 1);
            }
        }
    } 
    else if (type === 'RGB') {
                        
        for (i=startx, x=0; i != endx; i+=stepx, x++){
            for(j=starty, y=0; j != endy;j+=stepy, y++){
                let color = img_array[i][j]
                if(color !== 0)
                {
                    ctx.fillStyle = "rgba("+color['red']+","+color['green']+","+color['blue']+","+alpha+")";
                    ctx.fillRect(y, x, 1, 1);
                }
            }
        }
    }
}


function postRequest(url, data={}) {
    return fetch(url, {
        body: JSON.stringify(data),
        cache: 'no-cache',
        headers: {
            'content-type': 'application/json'
        },
        method: 'POST'
    })
}

function showMainWindow() {
    var mainWindow = document.getElementById("main");
    mainWindow.style.opacity=1;
}