var priceData;
var gl;
var canvas;
var program;
var fragment;
var vertex;
function setupGL () {
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
      gl_PointSize = 3.0;
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
    var parts = datum.split(',');
    return [parseFloat(parts[1]), parseFloat(parts[0]), parseFloat(parts[2]), parseFloat(parts[3]), parts[4]];
  }).filter(datum => {
    return window.models.state === 'india' || datum[4] === window.models.state;
  });
  priceData.splice(0, 1);
  var max_x = priceData[0][0];
  var min_x = priceData[0][0];
  var max_y = priceData[0][1];
  var min_y = priceData[0][1];
  var min_p = priceData[0][2];
  var max_p = priceData[0][2];

  const fuel = window.models.fuel === 'petrol' ? 2 : 3;

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

    if (datum[fuel] > max_p) {
      max_p = datum[fuel];
    } else if (datum[fuel] < min_p) {
      min_p = datum[fuel];
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

function frameScreen() {
  var body = document.body;
  var h = body.clientHeight;
  var w = body.clientWidth;

  // deduct title and legend space
  h = h - 70;
  w = w - 100;

  if ((h * 0.884) < w) {
    w = parseInt(`${h * 0.884}`);
  } else {
    h = parseInt(`${w * 1.131}`);
  }

  canvas = document.getElementById('canvas');
  canvas.height = h;
  canvas.width = w;
}

function showOptions(options, left, callback) {
  const backdrop = document.createElement('div');
  backdrop.className='backdrop';
  backdrop.style.paddingLeft = (left - 100) + 'px';
  for (const option of options) {
    const optionDiv = document.createElement('div');
    optionDiv.setAttribute('data-id', option.id);
    optionDiv.innerText = option.value;
    backdrop.appendChild(optionDiv);
  }
  const clickListener = event => {
    backdrop.className = 'backdrop removing';
    setTimeout(() => {
      if (event.target !== backdrop) {
        callback(event.target.getAttribute('data-id'))
      }
      backdrop.removeEventListener('click', clickListener);
      document.body.removeChild(backdrop);
    }, 500);
  }
  backdrop.addEventListener('click', clickListener)
  document.body.appendChild(backdrop);
}

function setupDropdowns() {
  const drops = document.getElementsByTagName('drop');

  for (const drop of drops) {
    const modelId = drop.getAttribute('model');
    const model = window.models[modelId];
    const options = window.models[drop.getAttribute('options')];

    const label = document.createElement('div');
    label.className = 'label';
    label.innerText = options.find(option => option.id === model).value;

    drop.appendChild(label);

    drop.addEventListener('click', () => {
      showOptions(options, drop.getClientRects()[0].left, value => {
        window.models[modelId] = value;
        document.location.search = `?fuel=${window.models.fuel}&state=${window.models.state}`
        label.innerText = value;
      });
    });
  }
}

function initModels() {
  window.models = {
    fuel: 'petrol',
    fuels: [
      {id: 'petrol', value: 'Petrol'},
      {id: 'diesel', value: 'Diesel'},
    ],
    state: 'india',
    states: [{
      id: 'india', value: 'India'
    }, {
      id: 'AN', value: 'AN'
    }, {
      id: 'AP', value: 'AP'
    }, {
      id: 'ARP', value: 'ARP'
    }, {
      id: 'AS', value: 'AS'
    }, {
      id: 'BH', value: 'BH'
    }, {
      id: 'CD', value: 'CD'
    }, {
      id: 'CSG', value: 'CSG'
    }, {
      id: 'DEL', value: 'DEL'
    }, {
      id: 'GDD', value: 'GDD'
    }, {
      id: 'GJ', value: 'GJ'
    }, {
      id: 'HR', value: 'HR'
    }, {
      id: 'HP', value: 'HP'
    }, {
      id: 'JK', value: 'JK'
    }, {
      id: 'JRK', value: 'JRK'
    }, {
      id: 'KAR', value: 'KAR'
    }, {
      id: 'KER', value: 'KER'
    }, {
      id: 'LDK', value: 'LDK'
    }, {
      id: 'MP', value: 'MP'
    }, {
      id: 'MAH', value: 'MAH'
    }, {
      id: 'MNP', value: 'MNP'
    }, {
      id: 'MGL', value: 'MGL'
    }, {
      id: 'MZ', value: 'MZ'
    }, {
      id: 'NG', value: 'NG'
    }, {
      id: 'OR', value: 'OR'
    }, {
      id: 'PY', value: 'PY'
    }, {
      id: 'PB', value: 'PB'
    }, {
      id: 'RJ', value: 'RJ'
    }, {
      id: 'SK', value: 'SK'
    }, {
      id: 'TN', value: 'TN'
    }, {
      id: 'TG', value: 'TG'
    }, {
      id: 'TRP', value: 'TRP'
    }, {
      id: 'DDH', value: 'DDH'
    }, {
      id: 'UP', value: 'UP'
    }, {
      id: 'UTK', value: 'UTK'
    }, {
      id: 'WB', value: 'WB'
    }]
  }
  let query = document.location.search;
  if (query) {
    query = query.substr(1).split('&');
    for (const q of query) {
      const parts = q.split('=');
      models[parts[0]] = parts[1];
    }
  }
}

function init () {
  initModels();
  setupDropdowns();
  frameScreen();
  setupGL();
}

init();