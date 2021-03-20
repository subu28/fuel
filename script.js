var priceData;
var gl;
var canvas;
var program;
var fragment;
var vertex;
function init () {
  canvas = document.getElementById('canvas');
  gl = canvas.getContext('webgl');
  gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);

  // setting up vertex shader. It is used to compute position of the circle.
  vertex = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertex, `
    attribute vec3 position;

    uniform vec2 priceBounds;

    varying vec4 colr;

    void main (void) {
      float red = (position.z - priceBounds[0]) / (priceBounds[1] - priceBounds[0]);
      colr = vec4( red, 1.0 - red, 0.0, 1.0);
      gl_Position = vec4(position.xy, 0, 1.0);
      gl_PointSize = 4.0;
    }`
  );
  gl.compileShader(vertex);

  // setting up the fragment shader. this is used to color the individual pixels of the circle
  fragment = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragment, `
    precision mediump float;

    varying vec4 colr;

    void main (void) {
      // gl_FragColor = vec4(colr.x, 1.0 - colr.x, 0, 1.0);
      gl_FragColor = vec4( 1.0 - ((1.0 - colr.x) * (1.0 - colr.x)), 1.0 - ((1.0 - colr.y) * (1.0 - colr.y)), 1.0 - ((1.0 - colr.z) * (1.0 - colr.z)), 1);
    }`
  );
  gl.compileShader(fragment);

  // linking shaders to the program
  program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.useProgram(program);

  getData();
}

function getData() {
  fetch('/data/data.csv', {
    method: 'GET'
  })
  .then(response => response.text())
  .then(data => {
    processData(data)
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}

function processData (data) {
  priceData = data.split('\n').map(datum => {
    var parts = datum.split(', ');
    return [parseFloat(parts[1]), parseFloat(parts[0]), parseFloat(parts[2]), parseFloat(parts[3])];
  });
  priceData.splice(0, 1);
  var max_x = priceData[0][0];
  var min_x = priceData[0][0];
  var max_y = priceData[0][1];
  var min_y = priceData[0][1];
  var min_p = priceData[0][2];
  var max_p = priceData[0][2];

  for (const datum of priceData) {
    if (datum[0] > max_x) {
      max_x = datum[0];
    } else if (datum[0] < min_x) {
      min_x = datum[0];
    }
    if (datum[1] > max_y) {
      max_y = datum[1];
    } else if (datum[1] < min_y) {
      min_y = datum[1];
    }

    // for petrol
    if (datum[2] > max_p) {
      max_p = datum[2];
    } else if (datum[2] < min_p) {
      min_p = datum[2];
    }
  }

  var x_factor = 1.8 / (max_x - min_x);
  var y_factor = 1.8 / (max_y - min_y);

  priceData = priceData.map(datum => {
    return [
      ((datum[0] - min_x) * x_factor) - 0.9,
      ((datum[1] - min_y) * y_factor) - 0.9,
      datum[2],
      datum[3]
    ];
  })

  var priceBounds = gl.getUniformLocation(program, "priceBounds");
  gl.uniform2fv(priceBounds, [min_p, max_p]);
  
  drawData();
}

function drawData () {
  var locations = new Float32Array(priceData.map(datum => [datum[0], datum[1], datum[2]]).flat());

  var vbuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbuffer);
  gl.bufferData(gl.ARRAY_BUFFER, locations, gl.STATIC_DRAW);

  var position = gl.getAttribLocation(program, "position");
  gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(position);

  gl.drawArrays(gl.POINTS, 0, priceData.length);

}


init();