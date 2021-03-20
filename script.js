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
    attribute vec2 position;

    void main (void) {
      gl_Position = vec4(position, 0, 1.0);
      gl_PointSize = 3.0;
    }`
  );
  gl.compileShader(vertex);

  // setting up the fragment shader. this is used to color the individual pixels of the circle
  fragment = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragment, `
    precision mediump float;

    void main (void) {
      gl_FragColor = vec4(1, 0, 0, 1.0);
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
    drawData();
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

  drawData();
}

function drawData () {
  var data = [];
  var locations = new Float32Array(priceData.map(datum => [datum[0], datum[1]]).flat());

  var vbuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbuffer);
  gl.bufferData(gl.ARRAY_BUFFER, locations, gl.STATIC_DRAW);

  var position = gl.getAttribLocation(program, "position");
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(position);

  gl.drawArrays(gl.POINTS, 0, priceData.length);

}


init();